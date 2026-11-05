import { createHash, randomBytes } from "node:crypto";
import Fastify from "fastify";
import { SiweMessage } from "siwe";
import { getAddress, isAddress } from "viem";
import type { PrismaClient } from "./generated/prisma/client.js";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function createApp(prisma: PrismaClient, appOrigin = "http://localhost:8081") {
  const app = Fastify({ logger: false, bodyLimit: 128 * 1024 });
  const origin = new URL(appOrigin);

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

  return app;
}
