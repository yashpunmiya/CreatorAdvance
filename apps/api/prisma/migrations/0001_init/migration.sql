-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'BRAND_ADMIN', 'BRAND_SIGNER', 'INVESTOR', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "BrandMemberRole" AS ENUM ('BRAND_ADMIN', 'BRAND_SIGNER');

-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_BRAND', 'FINANCEABLE', 'FUNDED', 'REPAID', 'DEFAULTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'WITHDRAWN', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" VARCHAR(42) NOT NULL,
    "displayName" VARCHAR(120),
    "email" VARCHAR(254),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleBinding" (
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleBinding_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "chainBrandId" CHAR(66) NOT NULL,
    "legalName" VARCHAR(180) NOT NULL,
    "publicName" VARCHAR(120) NOT NULL,
    "website" VARCHAR(253),
    "countryCode" CHAR(2) NOT NULL,
    "registrationNumber" VARCHAR(120),
    "registrationObjectKey" TEXT,
    "contactEmail" VARCHAR(254),
    "walletAddress" VARCHAR(42) NOT NULL,
    "status" "BrandStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMember" (
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BrandMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMember_pkey" PRIMARY KEY ("brandId","userId")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" VARCHAR(80),
    "platform" VARCHAR(40),
    "countryCode" CHAR(2),

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "chainInvoiceId" CHAR(66),
    "brandId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "invoiceNumberHash" CHAR(66) NOT NULL,
    "invoiceNumberCiphertext" TEXT,
    "faceValue" DECIMAL(30,0) NOT NULL,
    "currency" VARCHAR(12) NOT NULL DEFAULT 'USDT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "listingExpiry" TIMESTAMP(3) NOT NULL,
    "evidenceObjectKey" TEXT NOT NULL,
    "evidenceSha256" CHAR(64) NOT NULL,
    "deliverySha256" CHAR(64) NOT NULL,
    "campaignSha256" CHAR(64) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "chainOfferId" VARCHAR(80),
    "invoiceId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "price" DECIMAL(30,0) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "logIndex" INTEGER,
    "eventName" VARCHAR(64) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" CHAR(66) NOT NULL,
    "payload" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "walletAddress" VARCHAR(42) NOT NULL,
    "nonceHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_chainBrandId_key" ON "Brand"("chainBrandId");

-- CreateIndex
CREATE INDEX "Brand_status_publicName_idx" ON "Brand"("status", "publicName");

-- CreateIndex
CREATE INDEX "BrandMember_userId_role_idx" ON "BrandMember"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_brandId_email_idx" ON "Invitation"("brandId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_chainInvoiceId_key" ON "Invoice"("chainInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_brandId_status_createdAt_idx" ON "Invoice"("brandId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_creatorId_status_createdAt_idx" ON "Invoice"("creatorId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_brandId_invoiceNumberHash_key" ON "Invoice"("brandId", "invoiceNumberHash");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_chainOfferId_key" ON "Offer"("chainOfferId");

-- CreateIndex
CREATE INDEX "Offer_invoiceId_status_price_idx" ON "Offer"("invoiceId", "status", "price");

-- CreateIndex
CREATE INDEX "Offer_investorId_status_createdAt_idx" ON "Offer"("investorId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_invoiceId_blockNumber_idx" ON "Transaction"("invoiceId", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "UserRoleBinding" ADD CONSTRAINT "UserRoleBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
