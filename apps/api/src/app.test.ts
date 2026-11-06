import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { encodeAbiParameters, keccak256, toBytes, toEventSelector } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { createApp } from "./app.js";
import { deriveInvoiceId, type ChainSyncConfig } from "./chain-events.js";

const makePrisma = () => {
  const nonceRows = new Map<string, { walletAddress: string; nonceHash: string; expiresAt: Date }>();
  const indexedTransactions: Array<Record<string, unknown>> = [];
  const prisma = {
    indexedTransactions,
    brand: {
      findMany: vi.fn().mockResolvedValue([{ id: "brand-1", publicName: "Active Co" }]),
      findUnique: vi.fn().mockResolvedValue({ id: "brand-1", chainBrandId: `0x${"ab".repeat(32)}`, status: "PENDING" }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "brand-2", ...data })),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
    },
    brandMember: {
      create: vi.fn().mockResolvedValue({}), findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    invoice: {
      create: vi.fn().mockResolvedValue({ id: "invoice-1", status: "PENDING_BRAND" }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
    },
    transaction: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn(async () => indexedTransactions),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = indexedTransactions.findIndex((item) => item.id === where.id);
        if (index >= 0) indexedTransactions.splice(index, 1);
        return { id: where.id };
      }),
      upsert: vi.fn(async ({ where, create, update }: {
        where: { txHash: string }; create: Record<string, unknown>; update: Record<string, unknown>;
      }) => {
        const existing = indexedTransactions.find((item) => item.txHash === where.txHash);
        if (existing) Object.assign(existing, update);
        else indexedTransactions.push({ id: `chain-event-${indexedTransactions.length + 1}`, ...create });
        return indexedTransactions.find((item) => item.txHash === where.txHash);
      }),
    },
    offer: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    authNonce: {
      upsert: vi.fn(async ({ create }: { create: { walletAddress: string; nonceHash: string; expiresAt: Date } }) => {
        nonceRows.set(create.walletAddress, create);
      }),
      findUnique: vi.fn(async ({ where }: { where: { walletAddress: string } }) => nonceRows.get(where.walletAddress) ?? null),
      deleteMany: vi.fn(async ({ where }: { where: { walletAddress: string; nonceHash: string; expiresAt: { gt: Date } } }) => {
        const row = nonceRows.get(where.walletAddress);
        if (row?.nonceHash === where.nonceHash && row.expiresAt > where.expiresAt.gt) {
          nonceRows.delete(where.walletAddress);
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ walletAddress: "0x0000000000000000000000000000000000000001" }),
      upsert: vi.fn(async ({ where }: { where: { walletAddress: string } }) => ({
        id: "user-1",
        walletAddress: where.walletAddress,
        roles: [],
      })),
    },
    userRoleBinding: { upsert: vi.fn().mockResolvedValue({}) },
    creatorProfile: { upsert: vi.fn().mockResolvedValue({ handle: "maker", platform: "video", countryCode: "IN" }) },
    session: { create: vi.fn().mockResolvedValue({ id: "session-1" }) },
    sessionLookup: vi.fn(),
    $transaction: vi.fn(async (callback: (tx: object) => Promise<unknown>) => callback(prisma)),
  };
  Object.assign(prisma.session, { findFirst: prisma.sessionLookup });
  return prisma;
};

describe("API public and wallet-auth routes", () => {
  it("serves health and public active brand directory", async () => {
    const prisma = makePrisma();
    const app = createApp(prisma as never);
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });

    const response = await app.inject({ method: "GET", url: "/brands?search=Active" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ brands: [{ id: "brand-1", publicName: "Active Co" }] });
    expect(prisma.brand.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "ACTIVE", publicName: { contains: "Active", mode: "insensitive" } },
      take: 50,
    }));
    await app.close();
  });

  it("issues a one-use nonce and establishes a session after valid Whitechain SIWE", async () => {
    const prisma = makePrisma();
    const app = createApp(prisma as never);
    const account = privateKeyToAccount(`0x${"1".repeat(64)}`);
    const nonceResponse = await app.inject({
      method: "POST",
      url: "/auth/nonce",
      payload: { address: account.address },
    });
    expect(nonceResponse.statusCode).toBe(200);
    const { nonce } = nonceResponse.json<{ nonce: string }>();
    const message = new SiweMessage({
      domain: "localhost:8081",
      address: account.address,
      statement: "Sign in to CreatorAdvance.",
      uri: "http://localhost:8081",
      version: "1",
      chainId: 1874,
      nonce,
      issuedAt: new Date().toISOString(),
    });
    const signature = await account.signMessage({ message: message.prepareMessage() });
    const verifyResponse = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { message: message.prepareMessage(), signature },
    });
    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.json()).toMatchObject({ user: { walletAddress: account.address.toLowerCase() } });
    expect(prisma.authNonce.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.session.create).toHaveBeenCalledTimes(1);

    const replay = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { message: message.prepareMessage(), signature },
    });
    expect(replay.statusCode).toBe(401);
    await app.close();
  });

  it("rejects malformed wallet addresses before writing a nonce", async () => {
    const prisma = makePrisma();
    const app = createApp(prisma as never);
    const response = await app.inject({ method: "POST", url: "/auth/nonce", payload: { address: "not-an-address" } });
    expect(response.statusCode).toBe(400);
    expect(prisma.authNonce.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("protects the session profile endpoint", async () => {
    const prisma = makePrisma();
    const app = createApp(prisma as never);
    const denied = await app.inject({ method: "GET", url: "/me" });
    expect(denied.statusCode).toBe(401);

    const authenticated = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer " + "x".repeat(48) } });
    expect(authenticated.statusCode).toBe(401);
    await app.close();
  });

  it("allows authenticated users to choose only self-service creator or investor roles", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [] } });
    const app = createApp(prisma as never);
    const headers = { authorization: "Bearer " + "x".repeat(48) };
    const creator = await app.inject({ method: "POST", url: "/roles", headers, payload: { role: "CREATOR" } });
    expect(creator.statusCode).toBe(200);
    expect(prisma.userRoleBinding.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_role: { userId: "user-1", role: "CREATOR" } },
    }));
    const admin = await app.inject({ method: "POST", url: "/roles", headers, payload: { role: "PLATFORM_ADMIN" } });
    expect(admin.statusCode).toBe(400);
    await app.close();
  });

  it("requires a creator role before allowing creator profile changes", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [] } });
    const app = createApp(prisma as never);
    const response = await app.inject({
      method: "PUT", url: "/creator/profile",
      headers: { authorization: "Bearer " + "x".repeat(48) },
      payload: { handle: "maker", platform: "video", countryCode: "IN" },
    });
    expect(response.statusCode).toBe(403);
    expect(prisma.creatorProfile.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("creates pending brand applications owned by the signing wallet", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [] } });
    const storage = await mkdtemp(join(tmpdir(), "creatoradvance-brand-private-"));
    const previousDir = process.env.PRIVATE_DOCUMENT_DIR;
    process.env.PRIVATE_DOCUMENT_DIR = storage;
    const app = createApp(prisma as never);
    const document = Buffer.from("%PDF-1.4\nCompany registration proof");
    try {
      const response = await app.inject({
        method: "POST", url: "/brands",
        headers: { authorization: "Bearer " + "x".repeat(48) },
        payload: {
          legalName: "Example Media Pvt Ltd", publicName: "Example Media", countryCode: "IN",
          registrationNumber: "REG-123", contactEmail: "finance@example.test",
          registrationDocumentBase64: document.toString("base64"),
        },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().brand).toMatchObject({ id: "brand-2", status: "PENDING", walletAddress: "0xabc" });
      const stored = prisma.brand.create.mock.calls[0]?.[0].data as Record<string, string>;
      expect(stored.registrationObjectKey).toMatch(/^[a-f\d]{48}\.pdf$/);
      expect(await readFile(join(storage, stored.registrationObjectKey))).toEqual(document);
      expect(stored.contactEmail).toBe("finance@example.test");
      expect(prisma.brandMember.create).toHaveBeenCalledWith(expect.objectContaining({ data: { brandId: "brand-2", userId: "user-1", role: "BRAND_ADMIN" } }));
    } finally {
      await app.close();
      if (previousDir === undefined) delete process.env.PRIVATE_DOCUMENT_DIR;
      else process.env.PRIVATE_DOCUMENT_DIR = previousDir;
      await rm(storage, { recursive: true, force: true });
    }
  });

  it("does not let a brand member verify brands as a platform admin", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [{ role: "BRAND_ADMIN" }] } });
    const app = createApp(prisma as never);
    const response = await app.inject({
      method: "POST", url: "/admin/brands/brand-1/verify",
      headers: { authorization: "Bearer " + "x".repeat(48) },
    });
    expect(response.statusCode).toBe(403);
    expect(prisma.brand.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("limits brand activation to verified onchain state", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "admin-1", walletAddress: "0xadmin", roles: [{ role: "PLATFORM_ADMIN" }] } });
    const app = createApp(prisma as never);
    const response = await app.inject({
      method: "POST", url: "/admin/brands/brand-1/verify",
      headers: { authorization: "Bearer " + "x".repeat(48) },
    });
    expect(response.statusCode).toBe(200);
    expect(prisma.brand.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "VERIFIED" }) }));
    await app.close();
  });

  it("requires an authenticated creator before accepting invoice evidence", async () => {
    const prisma = makePrisma();
    const app = createApp(prisma as never);
    const response = await app.inject({ method: "POST", url: "/creator/invoices", payload: {} });
    expect(response.statusCode).toBe(401);
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("does not accept invoices for a brand without indexed onchain activation", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "creator-1", walletAddress: "0xabc", roles: [{ role: "CREATOR" }] } });
    const app = createApp(prisma as never);
    const response = await app.inject({
      method: "POST", url: "/creator/invoices",
      headers: { authorization: "Bearer " + "x".repeat(48) },
      payload: {
        brandId: "brand-1", invoiceNumber: "INV-1", faceValue: "1000000",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        listingExpiry: new Date(Date.now() + 7 * 86400000).toISOString(),
        evidenceBase64: Buffer.from("%PDF-1.4\nproof").toString("base64"),
        deliverySha256: "a".repeat(64), campaignSha256: "b".repeat(64),
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "brand_not_active_onchain" });
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("stores creator PDF evidence outside public assets and persists only its random key and hash", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "creator-1", walletAddress: "0xabc", roles: [{ role: "CREATOR" }] } });
    prisma.brand.findUnique.mockResolvedValue({ id: "brand-1", chainBrandId: `0x${"ab".repeat(32)}`, status: "ACTIVE" });
    prisma.invoice.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }));
    const storage = await mkdtemp(join(tmpdir(), "creatoradvance-private-"));
    const previousDir = process.env.PRIVATE_DOCUMENT_DIR;
    process.env.PRIVATE_DOCUMENT_DIR = storage;
    const app = createApp(prisma as never);
    const pdf = Buffer.from("%PDF-1.4\nCreator evidence");
    try {
      const response = await app.inject({
        method: "POST", url: "/creator/invoices",
        headers: { authorization: "Bearer " + "x".repeat(48) },
        payload: {
          brandId: "brand-1", invoiceNumber: "INV-22", faceValue: "1250000000",
          dueDate: new Date(Date.now() + 40 * 86400000).toISOString(),
          listingExpiry: new Date(Date.now() + 8 * 86400000).toISOString(),
          evidenceBase64: pdf.toString("base64"), deliverySha256: "a".repeat(64), campaignSha256: "b".repeat(64),
        },
      });
      expect(response.statusCode).toBe(201);
      const chain = response.json().chain as { brandId: string; invoiceNumberHash: string; invoiceId: string; faceValue: string; pdfHash: string };
      expect(chain.brandId).toBe(`0x${"ab".repeat(32)}`);
      expect(chain.invoiceNumberHash).toMatch(/^0x[\da-f]{64}$/);
      expect(chain.invoiceId).toBe(deriveInvoiceId(chain.brandId as `0x${string}`, chain.invoiceNumberHash as `0x${string}`));
      expect(chain.faceValue).toBe("1250000000");
      expect(chain.pdfHash).toMatch(/^0x[\da-f]{64}$/);
      const stored = prisma.invoice.create.mock.calls[0]?.[0].data as Record<string, string>;
      expect(stored.status).toBe("PENDING_BRAND");
      expect(stored.invoiceNumberCiphertext).toBeUndefined();
      expect(stored.evidenceObjectKey).toMatch(/^[a-f\d]{48}\.pdf$/);
      expect(await readFile(join(storage, stored.evidenceObjectKey))).toEqual(pdf);
      expect(stored.evidenceSha256).toMatch(/^[a-f\d]{64}$/);
    } finally {
      await app.close();
      if (previousDir === undefined) delete process.env.PRIVATE_DOCUMENT_DIR;
      else process.env.PRIVATE_DOCUMENT_DIR = previousDir;
      await rm(storage, { recursive: true, force: true });
    }
  });

  it("shows invoices only to users with the matching creator or investor role", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [] } });
    const app = createApp(prisma as never);
    const headers = { authorization: "Bearer " + "x".repeat(48) };
    const creator = await app.inject({ method: "GET", url: "/creator/invoices", headers });
    const investor = await app.inject({ method: "GET", url: "/investor/invoices", headers });
    expect(creator.statusCode).toBe(403);
    expect(investor.statusCode).toBe(403);
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns the onchain invoice payload only to its creator", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "creator-1", walletAddress: "0xabc", roles: [{ role: "CREATOR" }] } });
    const chainBrandId = `0x${"ab".repeat(32)}`;
    const invoiceNumberHash = `0x${"cd".repeat(32)}`;
    prisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1", creatorId: "creator-1", invoiceNumberHash, faceValue: 1250000n,
      dueDate: new Date("2030-01-01T00:00:00.000Z"), listingExpiry: new Date("2029-01-01T00:00:00.000Z"),
      evidenceSha256: "11".repeat(32), deliverySha256: "22".repeat(32), campaignSha256: "33".repeat(32),
      brand: { chainBrandId },
    });
    const app = createApp(prisma as never);
    const headers = { authorization: "Bearer " + "x".repeat(48) };
    const response = await app.inject({ method: "GET", url: "/creator/invoices/invoice-1/onchain", headers });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      brandId: chainBrandId,
      invoiceNumberHash,
      invoiceId: deriveInvoiceId(chainBrandId as `0x${string}`, invoiceNumberHash as `0x${string}`),
      faceValue: "1250000",
      pdfHash: `0x${"11".repeat(32)}`,
    });
    prisma.sessionLookup.mockResolvedValue({ user: { id: "another-creator", walletAddress: "0xdef", roles: [{ role: "CREATOR" }] } });
    const denied = await app.inject({ method: "GET", url: "/creator/invoices/invoice-1/onchain", headers });
    expect(denied.statusCode).toBe(403);
    await app.close();
  });

  it("restricts the platform brand queue to platform admins", async () => {
    const prisma = makePrisma();
    prisma.sessionLookup.mockResolvedValue({ user: { id: "user-1", walletAddress: "0xabc", roles: [] } });
    const app = createApp(prisma as never);
    const headers = { authorization: "Bearer " + "x".repeat(48) };
    const denied = await app.inject({ method: "GET", url: "/admin/brands", headers });
    expect(denied.statusCode).toBe(403);
    prisma.sessionLookup.mockResolvedValue({ user: { id: "admin-1", walletAddress: "0xabc", roles: [{ role: "PLATFORM_ADMIN" }] } });
    const allowed = await app.inject({ method: "GET", url: "/admin/brands", headers });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().brands).toBeDefined();
    await app.close();
  });

  it("only makes an invoice chain-created after its matching event is canonical and finalized", async () => {
    const prisma = makePrisma();
    const account = privateKeyToAccount(`0x${"2".repeat(64)}`);
    const chainBrandId = `0x${"ab".repeat(32)}` as const;
    const invoiceNumberHash = `0x${"cd".repeat(32)}` as const;
    const invoiceId = keccak256(encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }], [chainBrandId, invoiceNumberHash],
    ));
    const contractAddress = "0x1111111111111111111111111111111111111111" as const;
    const transactionHash = `0x${"12".repeat(32)}` as const;
    const blockHash = `0x${"34".repeat(32)}` as const;
    const confirmationHash = `0x${"56".repeat(32)}` as const;
    const confirmationBlockHash = `0x${"78".repeat(32)}` as const;
    const eventLog = {
      address: contractAddress,
      blockHash,
      blockNumber: 100n,
      data: encodeAbiParameters([{ type: "uint256" }], [1000000n]),
      topics: [
        toEventSelector("InvoiceCreated(bytes32,bytes32,address,uint256)"), invoiceId, chainBrandId,
        `0x${account.address.slice(2).toLowerCase().padStart(64, "0")}`,
      ],
      transactionHash,
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
    };
    const signer = privateKeyToAccount(`0x${"4".repeat(64)}`);
    const confirmationLog = {
      ...eventLog,
      blockHash: confirmationBlockHash,
      blockNumber: 200n,
      data: encodeAbiParameters([{ type: "uint256" }], [0n]),
      topics: [
        toEventSelector("InvoiceConfirmed(bytes32,address,uint256)"), invoiceId,
        `0x${signer.address.slice(2).toLowerCase().padStart(64, "0")}`,
      ],
      transactionHash: confirmationHash,
    };
    const reader = {
      getChainId: vi.fn().mockResolvedValue(1874),
      getTransactionReceipt: vi.fn()
        .mockResolvedValueOnce({ status: "success", blockNumber: 100n, blockHash, logs: [eventLog] })
        .mockResolvedValueOnce({ status: "success", blockNumber: 200n, blockHash: confirmationBlockHash, logs: [confirmationLog] }),
      getBlockNumber: vi.fn().mockResolvedValueOnce(104n).mockResolvedValueOnce(204n),
      getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
        hash: blockNumber === 100n ? blockHash : confirmationBlockHash,
      })),
    };
    const chainSync: ChainSyncConfig = { contractAddress, minimumConfirmations: 5, reader };
    prisma.sessionLookup
      .mockResolvedValueOnce({ user: {
        id: "creator-1", walletAddress: account.address.toLowerCase(), roles: [{ role: "CREATOR" }],
      } })
      .mockResolvedValueOnce({ user: {
        id: "brand-user-1", walletAddress: signer.address.toLowerCase(), roles: [{ role: "BRAND_ADMIN" }],
      } });
    prisma.brandMember.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ userId: "brand-user-1" });
    prisma.invoice.findUnique
      .mockResolvedValueOnce({
        id: "invoice-1", brandId: "brand-1", creatorId: "creator-1", chainInvoiceId: null,
        invoiceNumberHash, faceValue: "1000000", brand: { chainBrandId },
      })
      .mockResolvedValueOnce({
        id: "invoice-1", brandId: "brand-1", creatorId: "creator-1", chainInvoiceId: invoiceId,
        invoiceNumberHash, faceValue: "1000000", brand: { chainBrandId },
      });
    const app = createApp(prisma as never, "http://localhost:8081", chainSync);
    const response = await app.inject({
      method: "POST", url: "/invoices/invoice-1/chain-sync",
      headers: { authorization: `Bearer ${"x".repeat(48)}` },
      payload: { transactionHash },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ invoiceId: "invoice-1", chainInvoiceId: invoiceId, event: "InvoiceCreated", finalized: true });
    expect(prisma.transaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventName: "InvoiceCreated", chainId: 1874, finalizedAt: expect.any(Date) }),
    }));
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" }, data: { chainInvoiceId: invoiceId, status: "PENDING_BRAND" },
    });
    const confirmation = await app.inject({
      method: "POST", url: "/invoices/invoice-1/chain-sync",
      headers: { authorization: `Bearer ${"y".repeat(48)}` },
      payload: { transactionHash: confirmationHash },
    });
    expect(confirmation.statusCode).toBe(200);
    expect(confirmation.json()).toMatchObject({ event: "InvoiceConfirmed", finalized: true });
    expect(prisma.invoice.update).toHaveBeenLastCalledWith({
      where: { id: "invoice-1" }, data: { chainInvoiceId: invoiceId, status: "FINANCEABLE" },
    });
    await app.close();
  });

  it("refuses to index an invoice event before the confirmation threshold", async () => {
    const prisma = makePrisma();
    const account = privateKeyToAccount(`0x${"3".repeat(64)}`);
    const chainBrandId = `0x${"ab".repeat(32)}` as const;
    const invoiceNumberHash = `0x${"cd".repeat(32)}` as const;
    const contractAddress = "0x1111111111111111111111111111111111111111" as const;
    const reader = {
      getChainId: vi.fn().mockResolvedValue(1874),
      getTransactionReceipt: vi.fn().mockResolvedValue({ status: "success", blockNumber: 100n, blockHash: `0x${"34".repeat(32)}`, logs: [] }),
      getBlockNumber: vi.fn().mockResolvedValue(102n),
      getBlock: vi.fn(),
    };
    prisma.sessionLookup.mockResolvedValue({ user: {
      id: "creator-1", walletAddress: account.address.toLowerCase(), roles: [{ role: "CREATOR" }],
    } });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1", brandId: "brand-1", creatorId: "creator-1", chainInvoiceId: null,
      invoiceNumberHash, faceValue: "1000000", brand: { chainBrandId },
    });
    const app = createApp(prisma as never, "http://localhost:8081", { contractAddress, minimumConfirmations: 5, reader });
    const response = await app.inject({
      method: "POST", url: "/invoices/invoice-1/chain-sync",
      headers: { authorization: `Bearer ${"x".repeat(48)}` },
      payload: { transactionHash: `0x${"12".repeat(32)}` },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "chain_event_not_final" });
    expect(reader.getBlock).not.toHaveBeenCalled();
    expect(prisma.transaction.upsert).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("records a brand registration only when its onchain profile hash matches the reviewed application", async () => {
    const prisma = makePrisma();
    const account = privateKeyToAccount(`0x${"5".repeat(64)}`);
    const chainBrandId = `0x${"ab".repeat(32)}` as const;
    const profile = {
      legalName: "Example Media Pvt Ltd",
      publicName: "Example Media",
      website: "https://example.test",
      countryCode: "IN",
      registrationNumber: "REG-1",
    };
    const businessProfileHash = keccak256(toBytes(JSON.stringify(profile)));
    const contractAddress = "0x1111111111111111111111111111111111111111" as const;
    const transactionHash = `0x${"90".repeat(32)}` as const;
    const blockHash = `0x${"91".repeat(32)}` as const;
    const eventLog = {
      address: contractAddress,
      blockHash,
      blockNumber: 50n,
      data: encodeAbiParameters([{ type: "bytes32" }], [businessProfileHash]),
      topics: [
        toEventSelector("BrandRegistered(bytes32,address,bytes32)"), chainBrandId,
        `0x${account.address.slice(2).toLowerCase().padStart(64, "0")}`,
      ],
      transactionHash,
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
    };
    const reader = {
      getChainId: vi.fn().mockResolvedValue(1874),
      getTransactionReceipt: vi.fn().mockResolvedValue({ status: "success", blockNumber: 50n, blockHash, logs: [eventLog] }),
      getBlockNumber: vi.fn().mockResolvedValue(54n),
      getBlock: vi.fn().mockResolvedValue({ hash: blockHash }),
    };
    prisma.sessionLookup.mockResolvedValue({ user: {
      id: "brand-user-1", walletAddress: account.address.toLowerCase(), roles: [{ role: "BRAND_ADMIN" }],
    } });
    prisma.brandMember.findUnique.mockResolvedValue({ role: "BRAND_ADMIN" });
    prisma.brand.findUnique.mockResolvedValue({
      id: "brand-1", chainBrandId, ...profile, walletAddress: account.address,
      chainStatus: 0, status: "PENDING", verifiedAt: null,
    });
    const app = createApp(prisma as never, "http://localhost:8081", {
      contractAddress, minimumConfirmations: 5, reader,
    });
    const response = await app.inject({
      method: "POST", url: "/brands/brand-1/chain-sync",
      headers: { authorization: `Bearer ${"z".repeat(48)}` }, payload: { transactionHash },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      brandId: "brand-1", chainBrandId, event: "BrandRegistered", chainStatus: "PENDING", finalized: true,
    });
    expect(prisma.transaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ invoiceId: null, brandId: "brand-1", eventName: "BrandRegistered" }),
    }));
    expect(prisma.brand.update).toHaveBeenCalledWith({
      where: { id: "brand-1" }, data: { chainStatus: 1, status: "PENDING" },
    });
    await app.close();
  });

  it("returns contract-matching EIP-712 approval data only to a brand member", async () => {
    const prisma = makePrisma();
    const signer = privateKeyToAccount(`0x${"6".repeat(64)}`);
    const creator = privateKeyToAccount(`0x${"7".repeat(64)}`);
    const chainBrandId = `0x${"ab".repeat(32)}` as const;
    const invoiceNumberHash = `0x${"cd".repeat(32)}` as const;
    const chainInvoiceId = deriveInvoiceId(chainBrandId, invoiceNumberHash);
    const contractAddress = "0x1111111111111111111111111111111111111111" as const;
    const reader = {
      getChainId: vi.fn().mockResolvedValue(1874),
      getBlockNumber: vi.fn().mockResolvedValue(0n),
      getTransactionReceipt: vi.fn(),
      getBlock: vi.fn(),
      readContract: vi.fn().mockResolvedValue(12n),
    };
    const chainSync: ChainSyncConfig = { contractAddress, minimumConfirmations: 5, reader };
    prisma.sessionLookup.mockResolvedValue({ user: {
      id: "brand-user-1", walletAddress: signer.address.toLowerCase(), roles: [{ role: "BRAND_SIGNER" }],
    } });
    prisma.brandMember.findUnique.mockResolvedValue({ role: "BRAND_SIGNER" });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1", brandId: "brand-1", creatorId: "creator-1", chainInvoiceId,
      invoiceNumberHash, faceValue: "1000000", dueDate: new Date("2026-12-01T00:00:00Z"),
      listingExpiry: new Date("2026-11-20T00:00:00Z"), evidenceSha256: "11".repeat(32),
      deliverySha256: "22".repeat(32), campaignSha256: "33".repeat(32), status: "PENDING_BRAND",
      brand: { chainBrandId },
    });
    prisma.user.findUnique.mockResolvedValue({ walletAddress: creator.address });
    const app = createApp(prisma as never, "http://localhost:8081", chainSync);
    const response = await app.inject({
      method: "GET", url: "/brand/invoices/invoice-1/approval",
      headers: { authorization: `Bearer ${"a".repeat(48)}` },
    });
    expect(response.statusCode).toBe(200);
    expect(reader.readContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "approvalNonce", args: [chainBrandId], address: contractAddress,
    }));
    expect(response.json()).toMatchObject({
      primaryType: "InvoiceApproval",
      domain: { name: "CreatorAdvance", version: "1", chainId: 1874, verifyingContract: contractAddress },
      message: {
        brandId: chainBrandId, invoiceId: chainInvoiceId, creator: creator.address,
        invoiceNumberHash, faceValue: "1000000", pdfHash: `0x${"11".repeat(32)}`,
        deliveryHash: `0x${"22".repeat(32)}`, campaignHash: `0x${"33".repeat(32)}`, nonce: "12",
      },
    });
    await app.close();
  });

  it("indexes escrowed investor offers only from the allowlisted investor wallet event", async () => {
    const prisma = makePrisma();
    const investor = privateKeyToAccount(`0x${"8".repeat(64)}`);
    const chainBrandId = `0x${"ab".repeat(32)}` as const;
    const invoiceNumberHash = `0x${"cd".repeat(32)}` as const;
    const chainInvoiceId = deriveInvoiceId(chainBrandId, invoiceNumberHash);
    const contractAddress = "0x1111111111111111111111111111111111111111" as const;
    const transactionHash = `0x${"a1".repeat(32)}` as const;
    const blockHash = `0x${"b1".repeat(32)}` as const;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const eventLog = {
      address: contractAddress,
      blockHash,
      blockNumber: 100n,
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint64" }], [970000000n, expiry]),
      topics: [
        toEventSelector("OfferSubmitted(uint256,bytes32,address,uint256,uint64)"),
        `0x${9n.toString(16).padStart(64, "0")}`, chainInvoiceId,
        `0x${investor.address.slice(2).toLowerCase().padStart(64, "0")}`,
      ],
      transactionHash,
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
    };
    const reader = {
      getChainId: vi.fn().mockResolvedValue(1874),
      getTransactionReceipt: vi.fn().mockResolvedValue({ status: "success", blockNumber: 100n, blockHash, logs: [eventLog] }),
      getBlockNumber: vi.fn().mockResolvedValue(104n),
      getBlock: vi.fn().mockResolvedValue({ hash: blockHash }),
    };
    prisma.sessionLookup.mockResolvedValue({ user: {
      id: "investor-user-1", walletAddress: investor.address.toLowerCase(), roles: [{ role: "INVESTOR" }],
    } });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1", brandId: "brand-1", creatorId: "creator-1", chainInvoiceId,
      invoiceNumberHash, faceValue: "1000000000", brand: { chainBrandId },
    });
    const priorEvents = [
      { id: "created", invoiceId: "invoice-1", brandId: null, blockNumber: 90n, blockHash, eventName: "InvoiceCreated", payload: { invoiceId: chainInvoiceId } },
      { id: "confirmed", invoiceId: "invoice-1", brandId: null, blockNumber: 95n, blockHash, eventName: "InvoiceConfirmed", payload: { invoiceId: chainInvoiceId } },
    ];
    prisma.transaction.findMany.mockImplementation(async () => [...priorEvents, ...prisma.indexedTransactions]);
    const app = createApp(prisma as never, "http://localhost:8081", {
      contractAddress, minimumConfirmations: 5, reader,
    });
    const response = await app.inject({
      method: "POST", url: "/invoices/invoice-1/chain-sync",
      headers: { authorization: `Bearer ${"b".repeat(48)}` }, payload: { transactionHash },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ event: "OfferSubmitted", finalized: true });
    expect(prisma.offer.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { chainOfferId: "9" },
      create: expect.objectContaining({
        invoiceId: "invoice-1", investorId: "user-1", price: "970000000", status: "ACTIVE",
        expiresAt: new Date(Number(expiry) * 1000),
      }),
    }));
    await app.close();
  });
});
