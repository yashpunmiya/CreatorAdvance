import { describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { createApp } from "./app.js";

const makePrisma = () => {
  const nonceRows = new Map<string, { walletAddress: string; nonceHash: string; expiresAt: Date }>();
  const prisma = {
    brand: { findMany: vi.fn().mockResolvedValue([{ id: "brand-1", publicName: "Active Co" }]) },
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
});
