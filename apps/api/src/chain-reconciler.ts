import type { PrismaClient } from "./generated/prisma/client.js";
import { rebuildInvoiceOffers } from "./chain-offers.js";
import { deriveInvoiceChainState, type ChainSyncConfig } from "./chain-events.js";
import { rebuildBrandState } from "./chain-state.js";

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
    const affectedBrandIds = new Set(brandIds);
    await tx.transaction.deleteMany({ where: { id: { in: orphanedIds } } });
    for (const invoiceId of invoiceIds) {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { brandId: true } });
      if (invoice) affectedBrandIds.add(invoice.brandId);
      const events = await tx.transaction.findMany({
        where: { invoiceId },
        orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
        select: { eventName: true, payload: true },
      });
      const state = deriveInvoiceChainState(events);
      await rebuildInvoiceOffers(tx, invoiceId, events);
      await tx.invoice.update({ where: { id: invoiceId }, data: state });
    }
    for (const brandId of affectedBrandIds) await rebuildBrandState(tx, brandId);
  });
  return { checked: storedEvents.length, removed: orphanedIds.length };
}
