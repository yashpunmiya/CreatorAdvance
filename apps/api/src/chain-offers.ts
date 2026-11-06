import type { PrismaClient } from "./generated/prisma/client.js";

type OfferWriter = Pick<PrismaClient, "offer" | "user">;

export async function rebuildInvoiceOffers(
  tx: OfferWriter,
  invoiceId: string,
  events: readonly { eventName: string; payload: unknown }[],
) {
  await tx.offer.updateMany({
    where: { invoiceId, chainOfferId: { not: null } },
    data: { status: "WITHDRAWN" },
  });
  for (const event of events) {
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload as Record<string, unknown>
      : {};
    const chainOfferId = typeof payload.offerId === "string" ? payload.offerId : null;
    if (!chainOfferId) continue;
    if (event.eventName === "OfferSubmitted") {
      const investorWallet = typeof payload.investor === "string" ? payload.investor.toLowerCase() : null;
      const price = typeof payload.price === "string" ? payload.price : null;
      const expiry = typeof payload.expiry === "string" ? Number(payload.expiry) : NaN;
      if (!investorWallet || !price || !Number.isSafeInteger(expiry) || expiry <= 0) {
        throw new Error("invalid_offer_submitted_event");
      }
      const investor = await tx.user.upsert({
        where: { walletAddress: investorWallet },
        create: { walletAddress: investorWallet },
        update: {},
        select: { id: true },
      });
      await tx.offer.upsert({
        where: { chainOfferId },
        create: {
          chainOfferId, invoiceId, investorId: investor.id, price,
          expiresAt: new Date(expiry * 1000), status: "ACTIVE",
        },
        update: {
          invoiceId, investorId: investor.id, price,
          expiresAt: new Date(expiry * 1000), status: "ACTIVE",
        },
      });
    } else if (event.eventName === "OfferWithdrawn") {
      await tx.offer.updateMany({ where: { invoiceId, chainOfferId }, data: { status: "WITHDRAWN" } });
    } else if (event.eventName === "InvoiceFunded") {
      await tx.offer.updateMany({ where: { invoiceId, chainOfferId }, data: { status: "ACCEPTED" } });
    }
  }
}
