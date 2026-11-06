import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { createApp } from "./app.js";
import { configuredChainSync } from "./chain-events.js";
import { reconcileStoredChainEvents } from "./chain-reconciler.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const chainSync = configuredChainSync();
const app = createApp(prisma, process.env.APP_ORIGIN ?? "http://localhost:8081", chainSync);
const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "127.0.0.1";
let reconciliationRunning = false;
const reconcile = async () => {
  if (!chainSync || reconciliationRunning) return;
  reconciliationRunning = true;
  try {
    await reconcileStoredChainEvents(prisma, chainSync);
  } catch (error) {
    app.log.error({ err: error }, "chain event reconciliation failed");
  } finally {
    reconciliationRunning = false;
  }
};
const reconciliationTimer = chainSync ? setInterval(() => void reconcile(), 15_000) : null;

try {
  await app.listen({ port, host });
  if (chainSync) void reconcile();
} catch (error) {
  if (reconciliationTimer) clearInterval(reconciliationTimer);
  app.log.error(error);
  await app.close();
  await prisma.$disconnect();
  process.exitCode = 1;
}

const shutdown = async () => {
  if (reconciliationTimer) clearInterval(reconciliationTimer);
  await app.close();
  await prisma.$disconnect();
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
