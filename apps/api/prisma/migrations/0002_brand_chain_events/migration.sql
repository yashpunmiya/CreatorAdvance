ALTER TABLE "Transaction"
  ALTER COLUMN "invoiceId" DROP NOT NULL,
  ADD COLUMN "brandId" TEXT;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Transaction_brandId_blockNumber_idx" ON "Transaction"("brandId", "blockNumber");

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_entity_check"
  CHECK (("invoiceId" IS NOT NULL)::int + ("brandId" IS NOT NULL)::int = 1);

ALTER TABLE "Brand"
  ADD COLUMN "chainStatus" INTEGER NOT NULL DEFAULT 0;
