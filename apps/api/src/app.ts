import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import Fastify from "fastify";
import { SiweMessage } from "siwe";
import { getAddress, isAddress, keccak256, toBytes } from "viem";
import type { PrismaClient } from "./generated/prisma/client.js";

const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

export function createApp(prisma: PrismaClient, appOrigin = "http://localhost:8081") {
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
      || (body.website !== undefined && (typeof body.website !== "string" || body.website.length > 253))) {
      return reply.code(400).send({ error: "invalid_brand_application" });
    }
    const chainBrandId = keccak256(toBytes(`creatoradvance-brand:${user.walletAddress}:${randomBytes(16).toString("hex")}`));
    const brand = await prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({ data: {
        chainBrandId,
        legalName,
        publicName,
        website: body.website?.trim() || null,
        countryCode,
        registrationNumber: body.registrationNumber?.trim() || null,
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
    return reply.code(201).send({ brand });
  });

  app.post<{ Params: { brandId: string } }>("/admin/brands/:brandId/verify", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    if (!user.roles.some((binding) => binding.role === "PLATFORM_ADMIN")) {
      return reply.code(403).send({ error: "platform_admin_required" });
    }
    const brand = await prisma.brand.update({
      where: { id: request.params.brandId },
      // Offchain review alone never marks a brand financeable. ACTIVE is reserved for indexed chain registration.
      data: { status: "VERIFIED", verifiedAt: new Date() },
      select: { id: true, status: true, verifiedAt: true },
    });
    return { brand };
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

  return app;
}
