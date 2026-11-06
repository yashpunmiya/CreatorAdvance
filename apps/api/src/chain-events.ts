import { decodeEventLog, encodeAbiParameters, getAddress, keccak256, type Address, type Hash, type Log } from "viem";
import { createPublicClient, defineChain, http } from "viem";

export const creatorAdvanceEvents = [
  { type: "event", name: "BrandRegistered", inputs: [
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: true, name: "owner", type: "address" },
    { indexed: false, name: "businessProfileHash", type: "bytes32" },
  ] },
  { type: "event", name: "BrandStatusChanged", inputs: [
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: false, name: "status", type: "uint8" },
  ] },
  { type: "event", name: "AuthorizedSignerChanged", inputs: [
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: true, name: "signer", type: "address" },
    { indexed: false, name: "allowed", type: "bool" },
  ] },
  { type: "event", name: "CollateralDeposited", inputs: [
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: true, name: "owner", type: "address" },
    { indexed: false, name: "amount", type: "uint256" },
    { indexed: false, name: "total", type: "uint256" },
  ] },
  { type: "event", name: "CollateralWithdrawn", inputs: [
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: true, name: "owner", type: "address" },
    { indexed: false, name: "amount", type: "uint256" },
    { indexed: false, name: "remaining", type: "uint256" },
  ] },
  { type: "event", name: "InvoiceCreated", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "brandId", type: "bytes32" },
    { indexed: true, name: "creator", type: "address" },
    { indexed: false, name: "faceValue", type: "uint256" },
  ] },
  { type: "event", name: "InvoiceConfirmed", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "signer", type: "address" },
    { indexed: false, name: "nonce", type: "uint256" },
  ] },
  { type: "event", name: "InvoiceRejected", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "signer", type: "address" },
  ] },
  { type: "event", name: "InvoiceCancelled", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
  ] },
  { type: "event", name: "InvoiceExpired", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
  ] },
  { type: "event", name: "InvoiceFunded", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "offerId", type: "uint256" },
    { indexed: true, name: "tokenId", type: "uint256" },
    { indexed: false, name: "investor", type: "address" },
    { indexed: false, name: "price", type: "uint256" },
  ] },
  { type: "event", name: "OfferSubmitted", inputs: [
    { indexed: true, name: "offerId", type: "uint256" },
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "investor", type: "address" },
    { indexed: false, name: "price", type: "uint256" },
    { indexed: false, name: "expiry", type: "uint64" },
  ] },
  { type: "event", name: "OfferWithdrawn", inputs: [
    { indexed: true, name: "offerId", type: "uint256" },
    { indexed: true, name: "investor", type: "address" },
  ] },
  { type: "event", name: "Repayment", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "payer", type: "address" },
    { indexed: true, name: "recipient", type: "address" },
    { indexed: false, name: "grossAmount", type: "uint256" },
    { indexed: false, name: "fee", type: "uint256" },
    { indexed: false, name: "netAmount", type: "uint256" },
    { indexed: false, name: "outstanding", type: "uint256" },
  ] },
  { type: "event", name: "DefaultProcessed", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: false, name: "collateralApplied", type: "uint256" },
    { indexed: false, name: "fee", type: "uint256" },
    { indexed: false, name: "netRecovery", type: "uint256" },
    { indexed: false, name: "shortfall", type: "uint256" },
  ] },
  { type: "event", name: "DefaultRecovery", inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "payer", type: "address" },
    { indexed: true, name: "recipient", type: "address" },
    { indexed: false, name: "grossAmount", type: "uint256" },
    { indexed: false, name: "fee", type: "uint256" },
    { indexed: false, name: "netAmount", type: "uint256" },
    { indexed: false, name: "outstanding", type: "uint256" },
  ] },
] as const;

export const approvalNonceAbi = [{
  type: "function", name: "approvalNonce", stateMutability: "view",
  inputs: [{ name: "brandId", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }],
}] as const;

export type ChainEventReader = {
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getTransactionReceipt(args: { hash: Hash }): Promise<{
    status: "success" | "reverted";
    blockNumber: bigint;
    blockHash: Hash;
    logs: readonly Log[];
  }>;
  getBlock(args: { blockNumber: bigint }): Promise<{ hash: Hash | null }>;
  readContract?(args: {
    address: Address;
    abi: typeof approvalNonceAbi;
    functionName: "approvalNonce";
    args: readonly [`0x${string}`];
  }): Promise<bigint>;
};

export type ChainSyncConfig = {
  contractAddress: Address;
  minimumConfirmations: number;
  reader: ChainEventReader;
};

export type FinalizedReceiptResult =
  | { ok: true; receipt: Awaited<ReturnType<ChainEventReader["getTransactionReceipt"]>> }
  | { ok: false; reason: "chain_id_mismatch" | "transaction_reverted" | "not_final" | "not_canonical" | "rpc_unavailable" };

export async function getFinalizedReceipt(
  chainSync: ChainSyncConfig,
  transactionHash: Hash,
): Promise<FinalizedReceiptResult> {
  try {
    if (await chainSync.reader.getChainId() !== 1874) return { ok: false, reason: "chain_id_mismatch" };
    const receipt = await chainSync.reader.getTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") return { ok: false, reason: "transaction_reverted" };
    const head = await chainSync.reader.getBlockNumber();
    if (head + 1n - receipt.blockNumber < BigInt(chainSync.minimumConfirmations)) return { ok: false, reason: "not_final" };
    const block = await chainSync.reader.getBlock({ blockNumber: receipt.blockNumber });
    if (!block.hash || block.hash.toLowerCase() !== receipt.blockHash.toLowerCase()) return { ok: false, reason: "not_canonical" };
    return { ok: true, receipt };
  } catch {
    return { ok: false, reason: "rpc_unavailable" };
  }
}

const whitechainSepolia = defineChain({
  id: 1874,
  name: "Whitechain Sepolia",
  nativeCurrency: { name: "Whitechain Testnet WBT", symbol: "WBT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.whitechain.io"] } },
  testnet: true,
});

export function configuredChainSync(): ChainSyncConfig | null {
  const rawAddress = process.env.CREATORADVANCE_CONTRACT_ADDRESS;
  if (!rawAddress) return null;
  if (!/^0x[\da-fA-F]{40}$/.test(rawAddress)) throw new Error("CREATORADVANCE_CONTRACT_ADDRESS must be an EVM address");
  const minimumConfirmations = Number(process.env.CHAIN_MIN_CONFIRMATIONS ?? 5);
  if (!Number.isSafeInteger(minimumConfirmations) || minimumConfirmations < 1 || minimumConfirmations > 100) {
    throw new Error("CHAIN_MIN_CONFIRMATIONS must be an integer between 1 and 100");
  }
  const publicClient = createPublicClient({
    chain: whitechainSepolia,
    transport: http(process.env.WHITECHAIN_RPC_URL ?? "https://rpc.testnet.whitechain.io"),
  });
  return {
    contractAddress: getAddress(rawAddress),
    minimumConfirmations,
    reader: publicClient as unknown as ChainEventReader,
  };
}

export function deriveInvoiceId(chainBrandId: `0x${string}`, invoiceNumberHash: `0x${string}`): Hash {
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [chainBrandId, invoiceNumberHash]));
}

export type DecodedInvoiceEvent = {
  eventName: string;
  invoiceId: string;
  payload: Record<string, string | number | boolean | null>;
  logIndex: number | null;
};

export type DecodedContractEvent = {
  eventName: string;
  invoiceId?: string;
  brandId?: string;
  payload: Record<string, string | number | boolean | null>;
  logIndex: number | null;
};

export function decodeContractEvents(logs: readonly Log[], contractAddress: Address): DecodedContractEvent[] {
  const decoded: DecodedContractEvent[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: creatorAdvanceEvents, data: log.data, topics: log.topics, strict: false });
      const args = event.args as Record<string, unknown>;
      if (typeof args.invoiceId !== "string" && typeof args.brandId !== "string") continue;
      const payload = Object.fromEntries(Object.entries(args).map(([key, value]) => [
        key,
        typeof value === "bigint" ? value.toString() : value,
      ])) as DecodedInvoiceEvent["payload"];
      decoded.push({
        eventName: event.eventName,
        ...(typeof args.invoiceId === "string" ? { invoiceId: args.invoiceId } : {}),
        ...(typeof args.brandId === "string" ? { brandId: args.brandId } : {}),
        payload,
        logIndex: log.logIndex,
      });
    } catch {
      // Ignore unrelated contract events, including ERC-721 Transfer logs.
    }
  }
  return decoded;
}

export function decodeInvoiceEvents(logs: readonly Log[], contractAddress: Address): DecodedInvoiceEvent[] {
  return decodeContractEvents(logs, contractAddress).filter(
    (event): event is DecodedInvoiceEvent => typeof event.invoiceId === "string",
  );
}

export function deriveInvoiceChainState(events: readonly { eventName: string; payload: unknown }[]) {
  let chainInvoiceId: string | null = null;
  let status: "PENDING_BRAND" | "FINANCEABLE" | "FUNDED" | "REPAID" | "DEFAULTED" | "REJECTED" | "EXPIRED" = "PENDING_BRAND";
  for (const event of events) {
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload as Record<string, unknown>
      : {};
    if (event.eventName === "InvoiceCreated" && typeof payload.invoiceId === "string") {
      chainInvoiceId = payload.invoiceId;
      status = "PENDING_BRAND";
    } else if (event.eventName === "InvoiceConfirmed") {
      status = "FINANCEABLE";
    } else if (event.eventName === "InvoiceRejected") {
      status = "REJECTED";
    } else if (event.eventName === "InvoiceCancelled" || event.eventName === "InvoiceExpired") {
      status = "EXPIRED";
    } else if (event.eventName === "InvoiceFunded") {
      status = "FUNDED";
    } else if (event.eventName === "Repayment") {
      status = payload.outstanding === "0" ? "REPAID" : "FUNDED";
    } else if (event.eventName === "DefaultProcessed") {
      status = "DEFAULTED";
    } else if (event.eventName === "DefaultRecovery") {
      status = payload.outstanding === "0" ? "REPAID" : "DEFAULTED";
    }
  }
  return { chainInvoiceId, status };
}

export function deriveBrandChainState(events: readonly { eventName: string; payload: unknown }[], verifiedAt: Date | null) {
  let chainStatus = 0;
  for (const event of events) {
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload as Record<string, unknown>
      : {};
    if (event.eventName === "BrandRegistered") chainStatus = 1;
    else if (event.eventName === "BrandStatusChanged" && typeof payload.status === "string") {
      chainStatus = Number(payload.status);
    } else if (event.eventName === "DefaultProcessed") chainStatus = 5;
  }
  const status: "PENDING" | "VERIFIED" | "ACTIVE" | "SUSPENDED" = chainStatus === 3 && verifiedAt !== null ? "ACTIVE"
    : chainStatus === 4 || chainStatus === 5 ? "SUSPENDED"
      : verifiedAt !== null ? "VERIFIED" : "PENDING";
  return { chainStatus, status };
}
