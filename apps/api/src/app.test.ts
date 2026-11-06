import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { createApp } from "./app.js";

const makePrisma = () => {
  const nonceRows = new Map<string, { walletAddress: string; nonceHash: string; expiresAt: Date }>();
  const prisma = {
    brand: {
      findMany: vi.fn().mockResolvedValue([{ id: "brand-1", publicName: "Active Co" }]),
      findUnique: vi.fn().mockResolvedValue({ id: "brand-1", status: "PENDING" }),
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
    const app = createApp(prisma as never);
    const response = await app.inject({
      method: "POST", url: "/brands",
      headers: { authorization: "Bearer " + "x".repeat(48) },
      payload: { legalName: "Example Media Pvt Ltd", publicName: "Example Media", countryCode: "IN" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().brand).toMatchObject({ id: "brand-2", status: "PENDING", walletAddress: "0xabc" });
    expect(prisma.brandMember.create).toHaveBeenCalledWith(expect.objectContaining({ data: { brandId: "brand-2", userId: "user-1", role: "BRAND_ADMIN" } }));
    await app.close();
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
    prisma.brand.findUnique.mockResolvedValue({ id: "brand-1", status: "ACTIVE" });
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
});
