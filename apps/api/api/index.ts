import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";

let appPromise: Promise<FastifyInstance> | undefined;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    appPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient }, { createApp }, { configuredChainSync }] = await Promise.all([
        import("@prisma/adapter-pg"), import("../src/generated/prisma/client.js"),
        import("../src/app.js"), import("../src/chain-events.js"),
      ]);
      const databaseUrl = process.env.DATABASE_URL?.trim();
      if (!databaseUrl) throw new Error("DATABASE_URL is required");
      const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
      const app = createApp(prisma, process.env.APP_ORIGIN?.trim() ?? "http://localhost:8081", configuredChainSync());
      await app.ready();
      return app;
    })();
    const app = await appPromise;
    app.routing(request, response);
  } catch (error) {
    appPromise = undefined;
    console.error("CreatorAdvance API initialization failed", error);
    response.statusCode = 500;
    response.end("API initialization failed");
  }
}
