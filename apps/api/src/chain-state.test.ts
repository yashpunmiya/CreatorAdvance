import { describe, expect, it, vi } from "vitest";
import { rebuildBrandState } from "./chain-state.js";

describe("rebuilding brand state from canonical events", () => {
  it("freezes a brand after default and unfreezes it if that default event is orphaned", async () => {
    const brandEvents = [
      { eventName: "BrandRegistered", payload: {}, blockNumber: 10n, logIndex: 0 },
      { eventName: "BrandStatusChanged", payload: { status: "3" }, blockNumber: 12n, logIndex: 0 },
    ];
    const invoiceEvents = [
      { eventName: "DefaultProcessed", payload: {}, blockNumber: 20n, logIndex: 0 },
    ];
    const tx = {
      brand: {
        findUnique: vi.fn().mockResolvedValue({ verifiedAt: new Date("2026-11-06T00:00:00Z") }),
        update: vi.fn().mockResolvedValue({}),
      },
      invoice: { findMany: vi.fn().mockResolvedValue([{ id: "invoice-1" }]) },
      transaction: {
        findMany: vi.fn(async ({ where }: { where: { brandId?: string; eventName?: string } }) =>
          where.brandId ? brandEvents : invoiceEvents.filter((event) => !where.eventName || event.eventName === where.eventName)),
      },
    };
    expect(await rebuildBrandState(tx as never, "brand-1"))
      .toEqual({ chainStatus: 5, status: "SUSPENDED" });
    invoiceEvents.splice(0, invoiceEvents.length);
    expect(await rebuildBrandState(tx as never, "brand-1"))
      .toEqual({ chainStatus: 3, status: "ACTIVE" });
  });

  it("lets a later canonical admin brand status supersede the default freeze", async () => {
    const tx = {
      brand: {
        findUnique: vi.fn().mockResolvedValue({ verifiedAt: new Date("2026-11-06T00:00:00Z") }),
        update: vi.fn().mockResolvedValue({}),
      },
      invoice: { findMany: vi.fn().mockResolvedValue([{ id: "invoice-1" }]) },
      transaction: {
        findMany: vi.fn(async ({ where }: { where: { brandId?: string } }) => where.brandId ? [
          { eventName: "BrandRegistered", payload: {}, blockNumber: 10n, logIndex: 0 },
          { eventName: "BrandStatusChanged", payload: { status: 3 }, blockNumber: 12n, logIndex: 0 },
          { eventName: "BrandStatusChanged", payload: { status: 3 }, blockNumber: 30n, logIndex: 0 },
        ] : [{ eventName: "DefaultProcessed", payload: {}, blockNumber: 20n, logIndex: 0 }]),
      },
    };
    expect(await rebuildBrandState(tx as never, "brand-1"))
      .toEqual({ chainStatus: 3, status: "ACTIVE" });
  });
});
