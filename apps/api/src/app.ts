import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import Fastify from "fastify";
import { SiweMessage } from "siwe";
import { getAddress, isAddress, keccak256, toBytes, type Hash } from "viem";
import type { PrismaClient } from "./generated/prisma/client.js";
import { rebuildInvoiceOffers } from "./chain-offers.js";
import {
  configuredChainSync,
  approvalNonceAbi,
  decodeContractEvents,
  decodeInvoiceEvents,
  deriveBrandChainState,
  deriveInvoiceChainState,
  deriveInvoiceId,
  getFinalizedReceipt,
  type ChainSyncConfig,
} from "./chain-events.js";

const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

function brandBusinessProfileHash(profile: {
  legalName: string; publicName: string; website: string | null; countryCode: string; registrationNumber: string | null;
}) {
  return keccak256(toBytes(JSON.stringify({
    legalName: profile.legalName,
    publicName: profile.publicName,
    website: profile.website,
    countryCode: profile.countryCode,
    registrationNumber: profile.registrationNumber,
  })));
}

export function createApp(
  prisma: PrismaClient,
  appOrigin = "http://localhost:8081",
  chainSync: ChainSyncConfig | null = configuredChainSync(),
) {
  const app = Fastify({ logger: false, bodyLimit: 12 * 1024 * 1024 });
  const origin = new URL(appOrigin);
  const privateDocumentDir = resolve(process.env.PRIVATE_DOCUMENT_DIR ?? ".private-documents");

  async function currentUser(request: { headers: { authorization?: string } }) {
    const token = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/)?.[1];
    if (!token) return null;
    const session = await prisma.session.findFirst({
      where: { tokenHash: sha256(token), expiresAt: { gt: new Date() }, revokedAt: null },
      select: { user: { select: { id: true, walletAddress: true, roles: { select: { role: true } } } } },
    });
    return session?.user ?? null;
  }

  const platformAdmins = new Set((process.env.PLATFORM_ADMIN_WALLETS ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));

  app.get("/health", async () => ({ status: "ok" }));

  app.get<{ Querystring: { search?: string } }>("/brands", async (request) => {
    const search = request.query.search?.trim().slice(0, 80);
    const brands = await prisma.brand.findMany({
      where: {
        status: "ACTIVE",
        ...(search ? { publicName: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, publicName: true, website: true, countryCode: true, chainBrandId: true },
      orderBy: { publicName: "asc" },
      take: 50,
    });
    return { brands };
  });

  app.post<{ Body: { address?: string } }>("/auth/nonce", async (request, reply) => {
    const address = request.body?.address;
    if (typeof address !== "string" || !isAddress(address)) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const nonce = randomBytes(24).toString("hex");
    const walletAddress = getAddress(address).toLowerCase();
    await prisma.authNonce.upsert({
      where: { walletAddress },
      create: { walletAddress, nonceHash: sha256(nonce), expiresAt: new Date(Date.now() + 5 * 60_000) },
      update: { nonceHash: sha256(nonce), expiresAt: new Date(Date.now() + 5 * 60_000) },
    });
    return { nonce };
  });

  app.post<{ Body: { message?: string; signature?: `0x${string}` } }>("/auth/verify", async (request, reply) => {
    const { message, signature } = request.body ?? {};
    if (typeof message !== "string" || typeof signature !== "string" || !/^0x[\da-fA-F]+$/.test(signature)) {
      return reply.code(400).send({ error: "invalid_siwe_payload" });
    }

    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch {
      return reply.code(400).send({ error: "invalid_siwe_message" });
    }
    if (siwe.domain !== origin.host || siwe.uri !== origin.origin || siwe.chainId !== 1874) {
      return reply.code(401).send({ error: "siwe_context_mismatch" });
    }
    const walletAddress = siwe.address.toLowerCase();
    const nonceRecord = await prisma.authNonce.findUnique({ where: { walletAddress } });
    if (!nonceRecord || nonceRecord.expiresAt <= new Date() || nonceRecord.nonceHash !== sha256(siwe.nonce)) {
      return reply.code(401).send({ error: "invalid_or_expired_nonce" });
    }

    try {
      const result = await siwe.verify({ signature, domain: origin.host, nonce: siwe.nonce });
      if (!result.success) return reply.code(401).send({ error: "signature_invalid" });
    } catch {
      return reply.code(401).send({ error: "signature_invalid" });
    }

    const now = new Date();
    const rawToken = randomBytes(32).toString("base64url");
    const user = await prisma.$transaction(async (tx) => {
      const consumed = await tx.authNonce.deleteMany({
        where: { walletAddress, nonceHash: sha256(siwe.nonce), expiresAt: { gt: now } },
      });
      if (consumed.count !== 1) throw new Error("nonce_already_consumed");
      const account = await tx.user.upsert({
        where: { walletAddress },
        create: { walletAddress },
        update: {},
        select: { id: true, walletAddress: true, roles: { select: { role: true } } },
      });
      if (platformAdmins.has(walletAddress)) {
        await tx.userRoleBinding.upsert({
          where: { userId_role: { userId: account.id, role: "PLATFORM_ADMIN" } },
          create: { userId: account.id, role: "PLATFORM_ADMIN" },
          update: {},
        });
      }
      await tx.session.create({
        data: {
          userId: account.id,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
        },
      });
      return account;
    });

    return { token: rawToken, expiresAt: new Date(now.getTime() + 24 * 60 * 60_000).toISOString(), user };
  });

  app.get("/me", async (request, reply) => {
    const authorization = request.headers.authorization;
    const bearer = authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/)?.[1];
    if (!bearer) return reply.code(401).send({ error: "authentication_required" });
    const session = await prisma.session.findFirst({
      where: { tokenHash: sha256(bearer), expiresAt: { gt: new Date() }, revokedAt: null },
      select: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            displayName: true,
            roles: { select: { role: true } },
            brandMemberships: { select: { brandId: true, role: true } },
          },
        },
      },
    });
    if (!session) return reply.code(401).send({ error: "session_invalid_or_expired" });
    return { user: session.user };
  });

  app.post<{ Body: { role?: string } }>("/roles", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    const role = request.body?.role;
    if (role !== "CREATOR" && role !== "INVESTOR") {
      return reply.code(400).send({ error: "role_not_self_assignable" });
    }
    await prisma.userRoleBinding.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role },
      update: {},
    });
    return { role, status: "ACTIVE" };
  });

  app.put<{ Body: { handle?: string; platform?: string; countryCode?: string } }>("/creator/profile", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "CREATOR")) {
      return reply.code(403).send({ error: "creator_role_required" });
    }
    const { handle, platform, countryCode } = request.body ?? {};
    if ((handle !== undefined && (typeof handle !== "string" || handle.length > 80))
      || (platform !== undefined && (typeof platform !== "string" || platform.length > 40))
      || (countryCode !== undefined && !/^[A-Z]{2}$/.test(countryCode))) {
      return reply.code(400).send({ error: "invalid_profile" });
    }
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, handle, platform, countryCode },
      update: { handle, platform, countryCode },
      select: { handle: true, platform: true, countryCode: true },
    });
    return { profile };
  });

  app.post<{ Body: { legalName?: string; publicName?: string; website?: string; countryCode?: string; registrationNumber?: string } }>("/brands", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    const body = request.body ?? {};
    const legalName = typeof body.legalName === "string" ? body.legalName.trim() : "";
    const publicName = typeof body.publicName === "string" ? body.publicName.trim() : "";
    const countryCode = typeof body.countryCode === "string" && /^[A-Z]{2}$/.test(body.countryCode)
      ? body.countryCode
      : null;
    if (legalName.length < 2 || legalName.length > 180
      || publicName.length < 2 || publicName.length > 120
      || countryCode === null
      || (body.website !== undefined && (typeof body.website !== "string" || body.website.length > 253))
      || (body.registrationNumber !== undefined && (typeof body.registrationNumber !== "string" || body.registrationNumber.length > 120))) {
      return reply.code(400).send({ error: "invalid_brand_application" });
    }
    const website = body.website?.trim() || null;
    const registrationNumber = body.registrationNumber?.trim() || null;
    const businessProfileHash = brandBusinessProfileHash({ legalName, publicName, website, countryCode, registrationNumber });
    const chainBrandId = keccak256(toBytes(`creatoradvance-brand:${user.walletAddress}:${randomBytes(16).toString("hex")}`));
    const brand = await prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: {
        chainBrandId,
        legalName,
        publicName,
        website,
        countryCode,
        registrationNumber,
        walletAddress: user.walletAddress,
        status: "PENDING",
      }, select: { id: true, chainBrandId: true, legalName: true, publicName: true, status: true } });
      await tx.brandMember.create({ data: { brandId: created.id, userId: user.id, role: "BRAND_ADMIN" } });
      await tx.userRoleBinding.upsert({
        where: { userId_role: { userId: user.id, role: "BRAND_ADMIN" } },
        create: { userId: user.id, role: "BRAND_ADMIN" },
        update: {},
      });
      return created;
    });
    return reply.code(201).send({ brand, businessProfileHash });
  });

  app.get("/brand/applications", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    const memberships = await prisma.brandMember.findMany({
      where: { userId: user.id },
      select: { role: true, brand: { select: {
        id: true, chainBrandId: true, legalName: true, publicName: true, website: true, countryCode: true,
        registrationNumber: true, status: true, chainStatus: true, verifiedAt: true,
      } } },
      orderBy: { createdAt: "desc" },
    });
    return { brands: memberships.map(({ role, brand }) => ({
      ...brand, role, businessProfileHash: brandBusinessProfileHash(brand),
    })) };
  });

  app.post<{ Params: { brandId: string } }>("/admin/brands/:brandId/verify", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "PLATFORM_ADMIN")) {
      return reply.code(403).send({ error: "platform_admin_required" });
    }
    const existing = await prisma.brand.findUnique({
      where: { id: request.params.brandId }, select: { id: true, chainStatus: true },
    });
    if (!existing) return reply.code(404).send({ error: "brand_not_found" });
    const reviewStatus = existing.chainStatus === 3 ? "ACTIVE"
      : existing.chainStatus === 4 || existing.chainStatus === 5 ? "SUSPENDED"
        : "VERIFIED";
    const brand = await prisma.brand.update({
      where: { id: request.params.brandId },
      // Offchain review alone never activates a brand. Chain activation must also be observed.
      data: { status: reviewStatus, verifiedAt: new Date() },
      select: { id: true, status: true, verifiedAt: true },
    });
    return { brand };
  });

  app.post<{ Params: { brandId: string }; Body: { transactionHash?: string } }>("/brands/:brandId/chain-sync", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!chainSync) return reply.code(503).send({ error: "chain_sync_not_configured" });
    if (typeof request.body?.transactionHash !== "string" || !/^0x[\da-fA-F]{64}$/.test(request.body.transactionHash)) {
      return reply.code(400).send({ error: "invalid_transaction_hash" });
    }
    const brand = await prisma.brand.findUnique({
      where: { id: request.params.brandId },
      select: {
        id: true, chainBrandId: true, legalName: true, publicName: true, website: true, countryCode: true,
        registrationNumber: true, walletAddress: true, chainStatus: true, status: true, verifiedAt: true,
      },
    });
    if (!brand) return reply.code(404).send({ error: "brand_not_found" });
    const membership = await prisma.brandMember.findUnique({
      where: { brandId_userId: { brandId: brand.id, userId: user.id } }, select: { role: true },
    });
    const isPlatformAdmin = user.roles.some((binding) => binding.role === "PLATFORM_ADMIN");
    if (!membership && !isPlatformAdmin) return reply.code(403).send({ error: "brand_membership_required" });

    const txHash = request.body.transactionHash.toLowerCase() as Hash;
    const verifiedReceipt = await getFinalizedReceipt(chainSync, txHash);
    if (!verifiedReceipt.ok) {
      const conflictReasons = new Set(["transaction_reverted", "not_final", "not_canonical"]);
      const error = verifiedReceipt.reason === "transaction_reverted" ? "chain_transaction_reverted"
        : verifiedReceipt.reason === "not_final" ? "chain_event_not_final"
          : verifiedReceipt.reason === "not_canonical" ? "chain_receipt_not_canonical"
            : verifiedReceipt.reason === "chain_id_mismatch" ? "chain_id_mismatch" : "chain_rpc_unavailable_or_transaction_missing";
      return reply.code(conflictReasons.has(verifiedReceipt.reason) ? 409 : 503).send({ error });
    }
    const receiptEvents = decodeContractEvents(verifiedReceipt.receipt.logs, chainSync.contractAddress)
      .filter((event) => event.brandId?.toLowerCase() === brand.chainBrandId.toLowerCase());
    if (receiptEvents.length === 0) return reply.code(409).send({ error: "matching_brand_event_not_found" });
    const event = receiptEvents[0];
    if (event.eventName === "BrandRegistered") {
      const expectedProfileHash = brandBusinessProfileHash(brand);
      if (event.payload.owner?.toString().toLowerCase() !== brand.walletAddress.toLowerCase()
        || event.payload.businessProfileHash?.toString().toLowerCase() !== expectedProfileHash.toLowerCase()) {
        return reply.code(409).send({ error: "brand_registration_event_mismatch" });
      }
    } else if (event.eventName === "BrandStatusChanged") {
      const chainStatus = Number(event.payload.status);
      if (![2, 3, 4, 5].includes(chainStatus)) return reply.code(409).send({ error: "invalid_brand_chain_status" });
      if ((chainStatus === 2 || chainStatus === 3) && !brand.verifiedAt) {
        return reply.code(409).send({ error: "offchain_brand_review_required" });
      }
    } else {
      return reply.code(409).send({ error: "unsupported_brand_event" });
    }

    const existingTransaction = await prisma.transaction.findUnique({ where: { txHash }, select: { brandId: true, invoiceId: true } });
    if (existingTransaction && (existingTransaction.brandId !== brand.id || existingTransaction.invoiceId !== null)) {
      return reply.code(409).send({ error: "transaction_already_linked" });
    }
    const receipt = verifiedReceipt.receipt;
    await prisma.$transaction(async (tx) => {
      const priorEvents = await tx.transaction.findMany({
        where: { brandId: brand.id },
        select: { id: true, blockNumber: true, blockHash: true },
      });
      for (const prior of priorEvents) {
        const priorCanonical = await chainSync.reader.getBlock({ blockNumber: prior.blockNumber });
        if (!priorCanonical.hash || priorCanonical.hash.toLowerCase() !== prior.blockHash.toLowerCase()) {
          await tx.transaction.delete({ where: { id: prior.id } });
        }
      }
      await tx.transaction.upsert({
        where: { txHash },
        create: {
          invoiceId: null, brandId: brand.id, chainId: 1874, txHash, logIndex: event.logIndex,
          eventName: event.eventName, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash.toLowerCase(),
          payload: event.payload, finalizedAt: new Date(),
        },
        update: {
          invoiceId: null, brandId: brand.id, chainId: 1874, logIndex: event.logIndex,
          eventName: event.eventName, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash.toLowerCase(),
          payload: event.payload, finalizedAt: new Date(),
        },
      });
      const allEvents = await tx.transaction.findMany({
        where: { brandId: brand.id },
        orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
        select: { eventName: true, payload: true },
      });
      const state = deriveBrandChainState(allEvents, brand.verifiedAt);
      await tx.brand.update({
        where: { id: brand.id },
        data: { chainStatus: state.chainStatus, status: state.status },
      });
    });
    return { brandId: brand.id, chainBrandId: brand.chainBrandId, event: event.eventName, chainStatus: event.payload.status ?? "PENDING", finalized: true };
  });

  app.post<{ Body: {
    brandId?: string; invoiceNumber?: string; faceValue?: string; dueDate?: string; listingExpiry?: string;
    evidenceBase64?: string; deliverySha256?: string; campaignSha256?: string;
  } }>("/creator/invoices", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "CREATOR")) return reply.code(403).send({ error: "creator_role_required" });
    const body = request.body ?? {};
    if (typeof body.brandId !== "string" || typeof body.invoiceNumber !== "string"
      || body.invoiceNumber.trim().length < 1 || body.invoiceNumber.length > 120
      || typeof body.faceValue !== "string" || !/^\d{1,24}$/.test(body.faceValue) || BigInt(body.faceValue) <= 0n
      || typeof body.dueDate !== "string" || typeof body.listingExpiry !== "string"
      || typeof body.evidenceBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.evidenceBase64)
      || typeof body.deliverySha256 !== "string" || !/^[\da-f]{64}$/i.test(body.deliverySha256)
      || typeof body.campaignSha256 !== "string" || !/^[\da-f]{64}$/i.test(body.campaignSha256)) {
      return reply.code(400).send({ error: "invalid_invoice" });
    }
    const dueDate = new Date(body.dueDate);
    const listingExpiry = new Date(body.listingExpiry);
    const now = new Date();
    if (!Number.isFinite(dueDate.getTime()) || !Number.isFinite(listingExpiry.getTime())
      || dueDate <= now || listingExpiry <= now || listingExpiry >= dueDate) {
      return reply.code(400).send({ error: "invalid_invoice_dates" });
    }
    const evidence = Buffer.from(body.evidenceBase64, "base64");
    if (evidence.length < 8 || evidence.length > 8 * 1024 * 1024 || evidence.subarray(0, 5).toString() !== "%PDF-") {
      return reply.code(400).send({ error: "invalid_pdf_evidence" });
    }
    const brand = await prisma.brand.findUnique({ where: { id: body.brandId }, select: { id: true, status: true } });
    if (!brand || brand.status !== "ACTIVE") return reply.code(409).send({ error: "brand_not_active_onchain" });

    await mkdir(privateDocumentDir, { recursive: true });
    const objectKey = `${randomBytes(24).toString("hex")}.pdf`;
    const documentPath = join(privateDocumentDir, objectKey);
    const evidenceSha256 = sha256(evidence);
    await writeFile(documentPath, evidence, { flag: "wx", mode: 0o600 });
    try {
      const invoice = await prisma.invoice.create({ data: {
        brandId: brand.id,
        creatorId: user.id,
        invoiceNumberHash: keccak256(toBytes(body.invoiceNumber.normalize("NFKC").trim().toLowerCase())),
        faceValue: body.faceValue,
        dueDate,
        listingExpiry,
        evidenceObjectKey: objectKey,
        evidenceSha256,
        deliverySha256: body.deliverySha256.toLowerCase(),
        campaignSha256: body.campaignSha256.toLowerCase(),
        status: "PENDING_BRAND",
      }, select: { id: true, brandId: true, faceValue: true, dueDate: true, listingExpiry: true, evidenceSha256: true, status: true } });
      return reply.code(201).send({ invoice });
    } catch (error) {
      await unlink(documentPath).catch(() => undefined);
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code === "P2002") return reply.code(409).send({ error: "duplicate_invoice_number_for_brand" });
      throw error;
    }
  });

  app.get<{ Params: { invoiceId: string } }>("/invoices/:invoiceId/evidence", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.invoiceId },
      select: { creatorId: true, brandId: true, evidenceObjectKey: true },
    });
    if (!invoice) return reply.code(404).send({ error: "invoice_not_found" });
    const isCreator = invoice.creatorId === user.id;
    const isBrandMember = await prisma.brandMember.findUnique({
      where: { brandId_userId: { brandId: invoice.brandId, userId: user.id } }, select: { userId: true },
    });
    const isPlatformAdmin = user.roles.some((binding) => binding.role === "PLATFORM_ADMIN");
    if (!isCreator && !isBrandMember && !isPlatformAdmin) return reply.code(403).send({ error: "invoice_access_denied" });
    const evidence = await readFile(join(privateDocumentDir, invoice.evidenceObjectKey));
    return reply.type("application/pdf").header("Cache-Control", "private, no-store").header("Content-Disposition", "attachment; filename=invoice-evidence.pdf").send(evidence);
  });

  app.get("/creator/invoices", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "CREATOR")) return reply.code(403).send({ error: "creator_role_required" });
    const invoices = await prisma.invoice.findMany({
      where: { creatorId: user.id },
      select: { id: true, brandId: true, faceValue: true, dueDate: true, listingExpiry: true, status: true, chainInvoiceId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { invoices };
  });

  app.get("/brand/invoices", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    const memberships = await prisma.brandMember.findMany({ where: { userId: user.id }, select: { brandId: true } });
    if (memberships.length === 0) return { invoices: [] };
    const invoices = await prisma.invoice.findMany({
      where: { brandId: { in: memberships.map((membership) => membership.brandId) } },
      select: { id: true, brandId: true, creatorId: true, faceValue: true, dueDate: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { invoices };
  });

  app.get<{ Params: { invoiceId: string } }>("/brand/invoices/:invoiceId/approval", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!chainSync?.reader.readContract) return reply.code(503).send({ error: "chain_sync_not_configured" });
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.invoiceId },
      select: {
        id: true, brandId: true, creatorId: true, chainInvoiceId: true, invoiceNumberHash: true,
        faceValue: true, dueDate: true, listingExpiry: true, evidenceSha256: true,
        deliverySha256: true, campaignSha256: true, status: true,
        brand: { select: { chainBrandId: true } },
      },
    });
    if (!invoice) return reply.code(404).send({ error: "invoice_not_found" });
    const membership = await prisma.brandMember.findUnique({
      where: { brandId_userId: { brandId: invoice.brandId, userId: user.id } }, select: { role: true },
    });
    const isPlatformAdmin = user.roles.some((binding) => binding.role === "PLATFORM_ADMIN");
    if (!membership && !isPlatformAdmin) return reply.code(403).send({ error: "brand_membership_required" });
    const expectedInvoiceId = deriveInvoiceId(invoice.brand.chainBrandId as `0x${string}`, invoice.invoiceNumberHash as `0x${string}`);
    if (invoice.status !== "PENDING_BRAND" || invoice.chainInvoiceId?.toLowerCase() !== expectedInvoiceId.toLowerCase()) {
      return reply.code(409).send({ error: "invoice_not_pending_onchain" });
    }
    const creator = await prisma.user.findUnique({ where: { id: invoice.creatorId }, select: { walletAddress: true } });
    if (!creator) return reply.code(409).send({ error: "invoice_creator_not_found" });
    let nonce: bigint;
    try {
      nonce = await chainSync.reader.readContract({
        address: chainSync.contractAddress,
        abi: approvalNonceAbi,
        functionName: "approvalNonce",
        args: [invoice.brand.chainBrandId as `0x${string}`],
      });
    } catch {
      return reply.code(503).send({ error: "approval_nonce_unavailable" });
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60);
    return {
      domain: { name: "CreatorAdvance", version: "1", chainId: 1874, verifyingContract: chainSync.contractAddress },
      primaryType: "InvoiceApproval",
      types: { InvoiceApproval: [
        { name: "brandId", type: "bytes32" },
        { name: "invoiceId", type: "bytes32" },
        { name: "creator", type: "address" },
        { name: "invoiceNumberHash", type: "bytes32" },
        { name: "faceValue", type: "uint256" },
        { name: "dueDate", type: "uint64" },
        { name: "pdfHash", type: "bytes32" },
        { name: "deliveryHash", type: "bytes32" },
        { name: "campaignHash", type: "bytes32" },
        { name: "listingExpiry", type: "uint64" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
      ] },
      message: {
        brandId: invoice.brand.chainBrandId,
        invoiceId: expectedInvoiceId,
        creator: creator.walletAddress,
        invoiceNumberHash: invoice.invoiceNumberHash,
        faceValue: String(invoice.faceValue),
        dueDate: String(Math.floor(invoice.dueDate.getTime() / 1000)),
        pdfHash: `0x${invoice.evidenceSha256}`,
        deliveryHash: `0x${invoice.deliverySha256}`,
        campaignHash: `0x${invoice.campaignSha256}`,
        listingExpiry: String(Math.floor(invoice.listingExpiry.getTime() / 1000)),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
      },
    };
  });

  app.get("/investor/invoices", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "INVESTOR")) return reply.code(403).send({ error: "investor_role_required" });
    const invoices = await prisma.invoice.findMany({
      where: { status: "FINANCEABLE", chainInvoiceId: { not: null }, listingExpiry: { gt: new Date() } },
      select: { id: true, chainInvoiceId: true, brandId: true, faceValue: true, dueDate: true, listingExpiry: true },
      orderBy: { listingExpiry: "asc" },
      take: 100,
    });
    return { invoices };
  });

  app.get("/investor/offers", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "INVESTOR")) return reply.code(403).send({ error: "investor_role_required" });
    const offers = await prisma.offer.findMany({
      where: { investorId: user.id },
      select: { id: true, chainOfferId: true, invoiceId: true, price: true, expiresAt: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { offers };
  });

  app.get<{ Params: { invoiceId: string } }>("/creator/invoices/:invoiceId/offers", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "CREATOR")) return reply.code(403).send({ error: "creator_role_required" });
    const invoice = await prisma.invoice.findUnique({ where: { id: request.params.invoiceId }, select: { creatorId: true } });
    if (!invoice) return reply.code(404).send({ error: "invoice_not_found" });
    if (invoice.creatorId !== user.id) return reply.code(403).send({ error: "invoice_access_denied" });
    const offers = await prisma.offer.findMany({
      where: { invoiceId: request.params.invoiceId, status: "ACTIVE" },
      select: { id: true, chainOfferId: true, investorId: true, price: true, expiresAt: true, status: true },
      orderBy: { price: "desc" },
      take: 100,
    });
    return { offers };
  });

  app.post<{ Params: { invoiceId: string }; Body: { transactionHash?: string } }>("/invoices/:invoiceId/chain-sync", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!chainSync) return reply.code(503).send({ error: "chain_sync_not_configured" });
    const transactionHash = request.body?.transactionHash;
    if (typeof transactionHash !== "string" || !/^0x[\da-fA-F]{64}$/.test(transactionHash)) {
      return reply.code(400).send({ error: "invalid_transaction_hash" });
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.invoiceId },
      select: {
        id: true, brandId: true, creatorId: true, chainInvoiceId: true, invoiceNumberHash: true, faceValue: true,
        brand: { select: { chainBrandId: true } },
      },
    });
    if (!invoice) return reply.code(404).send({ error: "invoice_not_found" });
    const isCreator = invoice.creatorId === user.id;
    const brandMember = await prisma.brandMember.findUnique({
      where: { brandId_userId: { brandId: invoice.brandId, userId: user.id } }, select: { userId: true },
    });
    const isPlatformAdmin = user.roles.some((binding) => binding.role === "PLATFORM_ADMIN");
    const isInvestor = user.roles.some((binding) => binding.role === "INVESTOR");
    if (!isCreator && !brandMember && !isInvestor && !isPlatformAdmin) return reply.code(403).send({ error: "invoice_access_denied" });

    const verifiedReceipt = await getFinalizedReceipt(chainSync, transactionHash as Hash);
    if (!verifiedReceipt.ok) {
      const conflictReasons = new Set(["transaction_reverted", "not_final", "not_canonical"]);
      const error = verifiedReceipt.reason === "transaction_reverted" ? "chain_transaction_reverted"
        : verifiedReceipt.reason === "not_final" ? "chain_event_not_final"
          : verifiedReceipt.reason === "not_canonical" ? "chain_receipt_not_canonical"
            : verifiedReceipt.reason === "chain_id_mismatch" ? "chain_id_mismatch" : "chain_rpc_unavailable_or_transaction_missing";
      return reply.code(conflictReasons.has(verifiedReceipt.reason) ? 409 : 503).send({ error });
    }
    const receipt = verifiedReceipt.receipt;

    const expectedInvoiceId = deriveInvoiceId(invoice.brand.chainBrandId as `0x${string}`, invoice.invoiceNumberHash as `0x${string}`);
    const receiptEvents = decodeInvoiceEvents(receipt.logs, chainSync.contractAddress)
      .filter((event) => event.invoiceId.toLowerCase() === expectedInvoiceId.toLowerCase());
    if (receiptEvents.length === 0) return reply.code(409).send({ error: "matching_invoice_event_not_found" });
    const event = receiptEvents[0];
    if (event.eventName === "InvoiceCreated") {
      if (!isCreator || event.payload.brandId?.toString().toLowerCase() !== invoice.brand.chainBrandId.toLowerCase()
        || event.payload.creator?.toString().toLowerCase() !== user.walletAddress.toLowerCase()
        || event.payload.faceValue?.toString() !== String(invoice.faceValue)) {
        return reply.code(409).send({ error: "invoice_created_event_mismatch" });
      }
    } else if (!invoice.chainInvoiceId || invoice.chainInvoiceId.toLowerCase() !== expectedInvoiceId.toLowerCase()) {
      return reply.code(409).send({ error: "invoice_chain_creation_not_synced" });
    }
    if (event.eventName === "InvoiceConfirmed" || event.eventName === "InvoiceRejected") {
      if (!brandMember && !isPlatformAdmin) return reply.code(403).send({ error: "brand_member_required" });
    }
    if (event.eventName === "InvoiceCancelled" && !isCreator) return reply.code(403).send({ error: "creator_required" });
    if (event.eventName === "InvoiceFunded") {
      const eventInvestor = event.payload.investor?.toString().toLowerCase();
      if (!isCreator && eventInvestor !== user.walletAddress.toLowerCase() && !isPlatformAdmin) {
        return reply.code(403).send({ error: "invoice_party_required" });
      }
    }
    if (event.eventName === "OfferSubmitted" || event.eventName === "OfferWithdrawn") {
      const eventInvestor = event.payload.investor?.toString().toLowerCase();
      if ((!isInvestor || eventInvestor !== user.walletAddress.toLowerCase()) && !isPlatformAdmin) {
        return reply.code(403).send({ error: "investor_wallet_required" });
      }
    }
    const knownEvents = new Set([
      "InvoiceCreated", "InvoiceConfirmed", "InvoiceRejected", "InvoiceCancelled", "InvoiceExpired",
      "InvoiceFunded", "OfferSubmitted", "OfferWithdrawn", "Repayment", "DefaultProcessed", "DefaultRecovery",
    ]);
    if (!knownEvents.has(event.eventName)) return reply.code(409).send({ error: "unsupported_invoice_event" });

    const txHash = transactionHash.toLowerCase();
    const existingTransaction = await prisma.transaction.findUnique({ where: { txHash }, select: { invoiceId: true } });
    if (existingTransaction && existingTransaction.invoiceId !== invoice.id) {
      return reply.code(409).send({ error: "transaction_already_linked" });
    }
    await prisma.$transaction(async (tx) => {
      const priorEvents = await tx.transaction.findMany({
        where: { invoiceId: invoice.id },
        select: { id: true, blockNumber: true, blockHash: true },
      });
      for (const prior of priorEvents) {
        const priorCanonical = await chainSync.reader.getBlock({ blockNumber: prior.blockNumber });
        if (!priorCanonical.hash || priorCanonical.hash.toLowerCase() !== prior.blockHash.toLowerCase()) {
          await tx.transaction.delete({ where: { id: prior.id } });
        }
      }
      await tx.transaction.upsert({
        where: { txHash },
        create: {
          invoiceId: invoice.id, chainId: 1874, txHash, logIndex: event.logIndex,
          eventName: event.eventName, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash.toLowerCase(),
          payload: event.payload, finalizedAt: new Date(),
        },
        update: {
          invoiceId: invoice.id, chainId: 1874, logIndex: event.logIndex,
          eventName: event.eventName, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash.toLowerCase(),
          payload: event.payload, finalizedAt: new Date(),
        },
      });
      const allEvents = await tx.transaction.findMany({
        where: { invoiceId: invoice.id },
        orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
        select: { eventName: true, payload: true },
      });
      await rebuildInvoiceOffers(tx, invoice.id, allEvents);
      const state = deriveInvoiceChainState(allEvents);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { chainInvoiceId: state.chainInvoiceId, status: state.status },
      });
    });
    return { invoiceId: invoice.id, chainInvoiceId: expectedInvoiceId, event: event.eventName, finalized: true };
  });

  return app;
}
