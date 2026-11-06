import { describe, expect, it, vi } from "vitest";
import { reconcileStoredChainEvents } from "./chain-reconciler.js";

describe("stored chain event reorg reconciliation", () => {
  it("removes an orphaned confirmation and rolls the invoice back to its canonical state", async () => {
    const canonicalCreateHash = `0x${"11".repeat(32)}`;
    const orphanedConfirmationHash = `0x${"22".repeat(32)}`;
    const replacementBlockHash = `0x${"33".repeat(32)}`;
    const events = [
      {
        id: "create-event", invoiceId: "invoice-1", brandId: null, blockNumber: 50n,
        blockHash: canonicalCreateHash, eventName: "InvoiceCreated", payload: { invoiceId: `0x${"aa".repeat(32)}` },
      },
      {
        id: "confirmation-event", invoiceId: "invoice-1", brandId: null, blockNumber: 51n,
        blockHash: orphanedConfirmationHash, eventName: "InvoiceConfirmed", payload: { invoiceId: `0x${"aa".repeat(32)}` },
      },
    ];
    const transaction = {
      findMany: vi.fn(async ({ where }: { where: { invoiceId?: string | { in: string[] }; brandId?: string; eventName?: string } }) => {
        if (where.brandId) return events.filter((event) => event.brandId === where.brandId);
        if (typeof where.invoiceId === "string") return events.filter((event) => event.invoiceId === where.invoiceId);
        if (where.invoiceId && typeof where.invoiceId === "object") return events.filter((event) =>
          where.invoiceId && typeof where.invoiceId === "object" && where.invoiceId.in.includes(event.invoiceId ?? "")
            && (!where.eventName || event.eventName === where.eventName));
        return [];
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        const removed = where.id.in.length;
        for (let index = events.length - 1; index >= 0; index -= 1) {
          if (where.id.in.includes(events[index].id)) events.splice(index, 1);
        }
        return { count: removed };
      }),
    };
    const invoice = {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ brandId: "brand-1" }),
      findMany: vi.fn().mockResolvedValue([{ id: "invoice-1" }]),
    };
    const brand = {
      findUnique: vi.fn().mockResolvedValue({ verifiedAt: null }),
      update: vi.fn().mockResolvedValue({}),
    };
    const offer = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    };
    const user = { upsert: vi.fn().mockResolvedValue({ id: "investor-user" }) };
    const prisma = {
      transaction: {
        findMany: vi.fn().mockResolvedValue(events.map(({ id, blockNumber, blockHash, invoiceId, brandId }) => ({
          id, blockNumber, blockHash, invoiceId, brandId,
        }))),
      },
      $transaction: vi.fn(async (callback: (tx: object) => Promise<unknown>) => callback({ transaction, invoice, offer, user, brand })),
    };
    const reader = {
      getBlock: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
        hash: blockNumber === 50n ? canonicalCreateHash : replacementBlockHash,
      })),
    };
    const result = await reconcileStoredChainEvents(prisma as never, {
      contractAddress: "0x1111111111111111111111111111111111111111",
      minimumConfirmations: 5,
      reader: reader as never,
    });
    expect(result).toEqual({ checked: 2, removed: 1 });
    expect(transaction.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["confirmation-event"] } } });
    expect(invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: { chainInvoiceId: `0x${"aa".repeat(32)}`, status: "PENDING_BRAND" },
    });
  });
});
