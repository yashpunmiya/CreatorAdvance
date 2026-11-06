import { describe, expect, it } from "vitest";
import { deriveBrandChainState, deriveInvoiceChainState } from "./chain-events.js";

describe("chain-derived lifecycle states", () => {
  it("requires offchain review and onchain activation before a brand is active", () => {
    const verifiedAt = new Date("2026-11-06T00:00:00Z");
    expect(deriveBrandChainState([{ eventName: "BrandRegistered", payload: {} }], null))
      .toEqual({ chainStatus: 1, status: "PENDING" });
    expect(deriveBrandChainState([{ eventName: "BrandStatusChanged", payload: { status: "3" } }], null))
      .toEqual({ chainStatus: 3, status: "PENDING" });
    expect(deriveBrandChainState([{ eventName: "BrandStatusChanged", payload: { status: "3" } }], verifiedAt))
      .toEqual({ chainStatus: 3, status: "ACTIVE" });
    expect(deriveBrandChainState([{ eventName: "BrandStatusChanged", payload: { status: "5" } }], verifiedAt))
      .toEqual({ chainStatus: 5, status: "SUSPENDED" });
  });

  it("maps only confirmed contract events to financeable and settled invoice states", () => {
    const created = { eventName: "InvoiceCreated", payload: { invoiceId: `0x${"ab".repeat(32)}` } };
    const confirmed = { eventName: "InvoiceConfirmed", payload: {} };
    const funded = { eventName: "InvoiceFunded", payload: {} };
    const partialRepayment = { eventName: "Repayment", payload: { outstanding: "100" } };
    const finalRepayment = { eventName: "Repayment", payload: { outstanding: "0" } };
    expect(deriveInvoiceChainState([created])).toEqual({ chainInvoiceId: `0x${"ab".repeat(32)}`, status: "PENDING_BRAND" });
    expect(deriveInvoiceChainState([created, confirmed])).toMatchObject({ status: "FINANCEABLE" });
    expect(deriveInvoiceChainState([created, confirmed, funded, partialRepayment])).toMatchObject({ status: "FUNDED" });
    expect(deriveInvoiceChainState([created, confirmed, funded, finalRepayment])).toMatchObject({ status: "REPAID" });
  });
});
