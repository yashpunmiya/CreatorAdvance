import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("API PostgreSQL integration", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const token = randomBytes(32).toString("base64url");
  const walletAddress = `0x${randomBytes(20).toString("hex")}`;
  let app: ReturnType<typeof createApp>;
  let privateStorage: string;
  const previousPrivateDir = process.env.PRIVATE_DOCUMENT_DIR;
  let userId: string;
  let brandId: string | undefined;

  beforeAll(async () => {
    privateStorage = await mkdtemp(join(tmpdir(), "creatoradvance-api-integration-"));
    process.env.PRIVATE_DOCUMENT_DIR = privateStorage;
    app = createApp(prisma as never);
    const user = await prisma.user.create({ data: { walletAddress } });
    userId = user.id;
    await prisma.session.create({ data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
    } });
  });

  afterAll(async () => {
    if (brandId) await prisma.brand.delete({ where: { id: brandId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await app.close();
    await prisma.$disconnect();
    if (previousPrivateDir === undefined) delete process.env.PRIVATE_DOCUMENT_DIR;
    else process.env.PRIVATE_DOCUMENT_DIR = previousPrivateDir;
    await rm(privateStorage, { recursive: true, force: true });
  });

  it("persists a creator role, profile, and pending brand application", async () => {
    const headers = { authorization: `Bearer ${token}` };
    const role = await app.inject({ method: "POST", url: "/roles", headers, payload: { role: "CREATOR" } });
    expect(role.statusCode).toBe(200);
    expect(role.json()).toEqual({ role: "CREATOR", status: "ACTIVE" });

    const profile = await app.inject({
      method: "PUT", url: "/creator/profile", headers,
      payload: { handle: "integration-creator", platform: "video", countryCode: "IN" },
    });
    expect(profile.statusCode).toBe(200);

    const application = await app.inject({
      method: "POST", url: "/brands", headers,
      payload: {
        legalName: "Integration Legal Ltd", publicName: "Integration Brand", countryCode: "IN",
        registrationNumber: "INTEGRATION-1", contactEmail: "finance@integration.test",
        registrationDocumentBase64: Buffer.from("%PDF-1.4\nregistration proof").toString("base64"),
      },
    });
    expect(application.statusCode).toBe(201);
    const brand = application.json().brand as { id: string; status: string };
    brandId = brand.id;
    expect(brand.status).toBe("PENDING");

    const me = await app.inject({ method: "GET", url: "/me", headers });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.roles).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "CREATOR" }),
      expect.objectContaining({ role: "BRAND_ADMIN" }),
    ]));
  });
});
