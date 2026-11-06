import type { PrismaClient } from "./generated/prisma/client.js";
import { rebuildInvoiceOffers } from "./chain-offers.js";
import { deriveBrandChainState, deriveInvoiceChainState, type ChainSyncConfig } from "./chain-events.js";

export async function reconcileStoredChainEvents(prisma: PrismaClient, chainSync: ChainSyncConfig) {
  const storedEvents = await prisma.transaction.findMany({
    where: { finalizedAt: { not: null } },
    orderBy: { blockNumber: "desc" },
    take: 5000,
    select: { id: true, blockNumber: true, blockHash: true, invoiceId: true, brandId: true },
  });
  const canonicalHashes = new Map<string, string | null>();
  const orphanedIds: string[] = [];
  for (const event of storedEvents) {
    const key = event.blockNumber.toString();
    let canonicalHash = canonicalHashes.get(key);
    if (canonicalHash === undefined) {
      const block = await chainSync.reader.getBlock({ blockNumber: event.blockNumber });
      canonicalHash = block.hash?.toLowerCase() ?? null;
      canonicalHashes.set(key, canonicalHash);
    }
    if (canonicalHash !== event.blockHash.toLowerCase()) orphanedIds.push(event.id);
  }
  if (orphanedIds.length === 0) return { checked: storedEvents.length, removed: 0 };

  const orphaned = storedEvents.filter((event) => orphanedIds.includes(event.id));
  const invoiceIds = new Set(orphaned.flatMap((event) => event.invoiceId ? [event.invoiceId] : []));
  const brandIds = new Set(orphaned.flatMap((event) => event.brandId ? [event.brandId] : []));
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { id: { in: orphanedIds } } });
    for (const invoiceId of invoiceIds) {
      const events = await tx.transaction.findMany({
        where: { invoiceId },
        orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
        select: { eventName: true, payload: true },
      });
      const state = deriveInvoiceChainState(events);
      await rebuildInvoiceOffers(tx, invoiceId, events);
      await tx.invoice.update({ where: { id: invoiceId }, data: state });
    }
    for (const brandId of brandIds) {
      const events = await tx.transaction.findMany({
        where: { brandId },
        orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
        select: { eventName: true, payload: true },
      });
      const brand = await tx.brand.findUnique({ where: { id: brandId }, select: { verifiedAt: true } });
      if (!brand) continue;
      const state = deriveBrandChainState(events, brand.verifiedAt);
      await tx.brand.update({ where: { id: brandId }, data: state });
    }
  });
  return { checked: storedEvents.length, removed: orphanedIds.length };
}
