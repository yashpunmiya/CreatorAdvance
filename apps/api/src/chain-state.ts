import type { PrismaClient } from "./generated/prisma/client.js";
import { deriveBrandChainState } from "./chain-events.js";

type BrandStateWriter = Pick<PrismaClient, "brand" | "invoice" | "transaction">;

export async function rebuildBrandState(tx: BrandStateWriter, brandId: string) {
  const brand = await tx.brand.findUnique({ where: { id: brandId }, select: { verifiedAt: true } });
  if (!brand) return null;
  const invoices = await tx.invoice.findMany({ where: { brandId }, select: { id: true } });
  const invoiceIds = invoices.map(({ id }) => id);
  const [brandEvents, invoiceDefaultEvents] = await Promise.all([
    tx.transaction.findMany({
      where: { brandId },
      orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
      select: { eventName: true, payload: true, blockNumber: true, logIndex: true },
    }),
    invoiceIds.length ? tx.transaction.findMany({
      where: { invoiceId: { in: invoiceIds }, eventName: "DefaultProcessed" },
      orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
      select: { eventName: true, payload: true, blockNumber: true, logIndex: true },
    }) : Promise.resolve([]),
  ]);
  const events = [...brandEvents, ...invoiceDefaultEvents].sort((a, b) =>
    a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : (a.logIndex ?? 0) - (b.logIndex ?? 0));
  const state = deriveBrandChainState(events, brand.verifiedAt ?? null);
  await tx.brand.update({ where: { id: brandId }, data: state });
  return state;
}
