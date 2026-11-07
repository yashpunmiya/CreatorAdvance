import { Dashboard } from '../src/components/dashboard';
import { clearSession, loadSession, saveSession } from '../src/lib/session';
import { prepareBid } from '../src/lib/bid';
import { useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAppKit } from '@reown/appkit-react-native';
import { StorageUtil } from '@reown/appkit-core-react-native';
import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount, useBalance, useDeployContract, usePublicClient, useReadContract, useSignMessage, useSignTypedData, useSwitchChain, useWriteContract } from 'wagmi';
import { encodeDeployData, formatEther, isAddress, keccak256, stringToHex, type Address, type Hash, type Hex } from 'viem';
import { ApiError, apiBaseUrl, apiRequest, siweOrigin } from '../src/lib/api';
import { erc20BalanceAbi, erc20DecimalsAbi, parseEip155ChainId, sponsorUsdt, whitechainSepolia } from '../src/lib/chain';
import { brandStateAbi, creatorAdvanceAbi, creatorAdvanceAddress, erc20ApprovalAbi } from '../src/lib/contract';
import { creatorAdvanceDeployAbi, creatorAdvanceDeploymentBytecode } from '../src/lib/creator-advance-deploy-artifact';
import { formatToken, parseUsdtAmount } from '../src/lib/format-token';
import { uploadPrivatePdf } from '../src/lib/private-upload';
import { walletRuntime } from '../src/lib/wallet';
import { colors, spacing } from '../src/theme';

type Brand = { id: string; legalName?: string; publicName: string; website?: string | null; countryCode?: string; registrationNumber?: string; contactEmail?: string; status?: string; chainStatus?: number; chainBrandId?: string; businessProfileHash?: string; walletAddress?: string };
type Invoice = { id: string; faceValue: string; dueDate: string; listingExpiry?: string; status: string; brandId?: string; chainInvoiceId?: string; brand?: { publicName: string; countryCode?: string; website?: string | null }; creator?: { walletAddress: string } };
type SessionUser = {
  walletAddress: string;
  roles: { role: string }[];
  brandMemberships?: { brandId: string; role: string }[];
  creatorProfile?: { handle: string | null; platform: string | null; countryCode: string | null } | null;
};
type ChainInvoice = { brandId: Hex; invoiceNumberHash: Hex; invoiceId: Hex; faceValue: string; dueDate: string; listingExpiry: string; pdfHash: Hex; deliveryHash: Hex; campaignHash: Hex };
type ApprovalPayload = { message: { brandId: Hex; invoiceId: Hex; creator: Address; invoiceNumberHash: Hex; faceValue: string; dueDate: string; pdfHash: Hex; deliveryHash: Hex; campaignHash: Hex; listingExpiry: string; nonce: string; deadline: string } };
type Offer = { id: string; chainOfferId: string; invoiceId?: string; price: string; status: string; expiresAt: string };
type InvestorOffer = Offer & { invoiceId: string };
type WorkspaceRole = 'CREATOR' | 'BRAND' | 'INVESTOR' | 'ADMIN' | 'SETUP';
type WorkspacePage = 'home' | 'work' | 'inbox' | 'pending' | 'profile';

const invoiceConfirmedEvent = {
  type: 'event', name: 'InvoiceConfirmed', anonymous: false,
  inputs: [
    { indexed: true, name: 'invoiceId', type: 'bytes32' },
    { indexed: true, name: 'signer', type: 'address' },
    { indexed: false, name: 'nonce', type: 'uint256' },
  ],
} as const;
const invoiceConfirmedTopic = keccak256(stringToHex('InvoiceConfirmed(bytes32,address,uint256)'));

function workspaceRoleFor(account?: SessionUser): WorkspaceRole {
  if (!account) return 'SETUP';
  if (account.roles.some(binding => binding.role === 'PLATFORM_ADMIN')) return 'ADMIN';
  if (account.brandMemberships?.length || account.roles.some(binding => binding.role === 'BRAND_ADMIN' || binding.role === 'BRAND_SIGNER')) return 'BRAND';
  if (account.roles.some(binding => binding.role === 'CREATOR')) return 'CREATOR';
  if (account.roles.some(binding => binding.role === 'INVESTOR')) return 'INVESTOR';
  return 'SETUP';
}

function offerDiscount(value: string, faceValue: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(value.trim()) || !/^\d+$/.test(faceValue)) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const offer = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  const face = BigInt(faceValue);
  if (offer <= 0n || offer >= face) return null;
  const bps = ((face - offer) * 10_000n) / face;
  return `${bps / 100n}.${String(bps % 100n).padStart(2, '0')}% below face value`;
}

const invoiceApprovalTypes = { InvoiceApproval: [
  { name: 'brandId', type: 'bytes32' }, { name: 'invoiceId', type: 'bytes32' }, { name: 'creator', type: 'address' },
  { name: 'invoiceNumberHash', type: 'bytes32' }, { name: 'faceValue', type: 'uint256' }, { name: 'dueDate', type: 'uint64' },
  { name: 'pdfHash', type: 'bytes32' }, { name: 'deliveryHash', type: 'bytes32' }, { name: 'campaignHash', type: 'bytes32' },
  { name: 'listingExpiry', type: 'uint64' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
] } as const;

const currentTimeMs = () => Date.now();

export default function HomeScreen() {
  return walletRuntime ? <Workspace /> : <WalletSetup />;
}

function Workspace() {
  const { view: initialView } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<WorkspacePage>(initialView === 'manage' ? 'work' : 'home');
  const { open, disconnect } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const { deployContractAsync } = useDeployContract();
  const publicClient = usePublicClient({ chainId: whitechainSepolia.id });
  const [token, setToken] = useState<string>();
  const [sessionAddress, setSessionAddress] = useState<string>();
  const [user, setUser] = useState<SessionUser>();
  const [editingCreatorProfile, setEditingCreatorProfile] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>('SETUP');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [operationStage, setOperationStage] = useState('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [message, setMessage] = useState('');
  const [restoringSession, setRestoringSession] = useState(true);
  const [pendingTransaction, setPendingTransaction] = useState<{ hash: Hash; syncPath?: string; owner: string }>();
  const [deployedAddress, setDeployedAddress] = useState<Address>();
  const [deployedOwner, setDeployedOwner] = useState<string>();
  const [profileHandle, setProfileHandle] = useState('');
  const [profilePlatform, setProfilePlatform] = useState('');
  const [profileCountry, setProfileCountry] = useState('IN');
  const [legalName, setLegalName] = useState('');
  const [publicName, setPublicName] = useState('');
  const [brandCountry, setBrandCountry] = useState('IN');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [brandContactEmail, setBrandContactEmail] = useState('');
  const [registrationDocument, setRegistrationDocument] = useState<{ uri: string; size?: number; name: string }>();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ uri: string; size?: number; name: string }>();
  const [deliveryProofFile, setDeliveryProofFile] = useState<{ uri: string; size?: number; name: string }>();
  const [campaignBriefFile, setCampaignBriefFile] = useState<{ uri: string; size?: number; name: string }>();
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>();
  const [offersByInvoice, setOffersByInvoice] = useState<Record<string, Offer[]>>({});
  const [investorOffers, setInvestorOffers] = useState<InvestorOffer[]>([]);
  const [bidPrices, setBidPrices] = useState<Record<string, string>>({});
  const [collateralAmounts, setCollateralAmounts] = useState<Record<string, string>>({});
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [investorAddress, setInvestorAddress] = useState('');
  const sessionToken = address?.toLowerCase() === sessionAddress?.toLowerCase() ? token : undefined;
  const workspaceIdentity = useRef('');
  useEffect(() => {
    workspaceIdentity.current = [address, sessionToken, role, brandSearch].join(':');
    return () => { workspaceIdentity.current = ''; };
  }, [address, sessionToken, role, brandSearch]);
  const currentDeployedAddress = address?.toLowerCase() === deployedOwner ? deployedAddress : undefined;
  const nativeBalance = useBalance({ address, chainId: whitechainSepolia.id, query: { enabled: Boolean(address) } });
  const tokenBalance = useReadContract({ address: sponsorUsdt.address, abi: erc20BalanceAbi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: whitechainSepolia.id, query: { enabled: Boolean(address && chainId === whitechainSepolia.id) } });

  useEffect(() => {
    let current = true;
    if (address) {
      void AsyncStorage.getItem(`creatoradvance:pending:1874:${address.toLowerCase()}`).then(raw => {
        if (!current) return;
        const pending = raw ? JSON.parse(raw) : undefined;
        if (pending && /^0x[0-9a-fA-F]{64}$/.test(pending.hash)) setPendingTransaction({ ...pending, owner: address.toLowerCase() });
        else setPendingTransaction(undefined);
      }).catch(() => undefined);
      const key = `creatoradvance:deployment:${whitechainSepolia.id}:${address.toLowerCase()}`;
      void AsyncStorage.getItem(key).then((stored) => {
        if (current && stored && isAddress(stored)) {
          setDeployedAddress(stored);
          setDeployedOwner(address.toLowerCase());
        }
      }).catch(() => undefined);
    }
    return () => { current = false; };
  }, [address]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setRestoringSession(true);
      setToken(undefined); setUser(undefined); setSessionAddress(undefined);
      setBrands([]); setInvoices([]); setInvestorOffers([]); setOffersByInvoice({});
      if (!address) return;
      const stored = await loadSession();
      if (!stored || stored.address.toLowerCase() !== address.toLowerCase()) return;
      const result = await apiRequest<{ user: SessionUser }>('/me', stored.token);
      if (!active) return;
      if (result.user.walletAddress.toLowerCase() !== address.toLowerCase()) throw new Error('Session wallet mismatch');
      setRole(workspaceRoleFor(result.user));
      setView('home');
      setToken(stored.token); setSessionAddress(address); setUser(result.user);
      setProfileHandle(result.user.creatorProfile?.handle ?? '');
      setProfilePlatform(result.user.creatorProfile?.platform ?? '');
      setProfileCountry(result.user.creatorProfile?.countryCode ?? 'IN');
    }).catch(error => {
      if (active && error instanceof ApiError && error.status === 401) void clearSession();
      if (active) setMessage(error instanceof Error ? error.message : 'Could not restore your account. Sign in again.');
    }).finally(() => { if (active) setRestoringSession(false); });
    return () => { active = false; };
  }, [address]);

  async function act(task: () => Promise<void>) {
    setBusy(true); setOperationStage('Starting…'); setMessage('');
    try { await task(); } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession(); setToken(undefined); setUser(undefined); setSessionAddress(undefined);
      }
      setMessage(error instanceof Error ? error.message.replaceAll('_', ' ') : 'Something went wrong. Try again.');
    }
    finally { setBusy(false); setOperationStage(''); }
  }

  async function finalizeTransaction(send: () => Promise<Hash>, syncPath?: string, refresh = true) {
    const contract = creatorAdvanceAddress;
    if (!contract) throw new Error('Set EXPO_PUBLIC_CONTRACT_ADDRESS after the reviewed testnet deployment.');
    if (!address || chainId !== whitechainSepolia.id) throw new Error('Connect a wallet on Whitechain Sepolia before sending a transaction.');
    if (!publicClient) throw new Error('Whitechain RPC is unavailable. Try again when the network is online.');
    if (pendingTransaction?.owner === address.toLowerCase()) throw new Error('Resume your previous transaction before starting another.');
    setOperationStage('Waiting for wallet approval…');
    const sendRequest = send();
    // WalletConnect leaves follow-up requests waiting if the wallet app is
    // backgrounded after an earlier signature. Queue the request, then bring
    // the connected wallet back to the foreground for review.
    const walletLink = await StorageUtil.getWalletConnectDeepLink();
    if (walletLink?.href) {
      try {
        await Linking.openURL(walletLink.href);
      } catch {
        // Keep the request alive; the wallet may still receive it over relay.
      }
    }
    const hash = await sendRequest;
    const pendingKey = `creatoradvance:pending:1874:${address.toLowerCase()}`;
    await AsyncStorage.setItem(pendingKey, JSON.stringify({ hash, syncPath }));
    setPendingTransaction({ hash, syncPath, owner: address.toLowerCase() });
    setOperationStage('Transaction sent · waiting for Whitechain…');
    setMessage(`Transaction submitted: ${hash}.`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 5, timeout: 240_000 });
    if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${hash}`);
    if (syncPath?.startsWith('/invoices/')) {
      const confirmedIds = new Set(receipt.logs
        .filter(log => log.address.toLowerCase() === contract.toLowerCase() && log.topics[0]?.toLowerCase() === invoiceConfirmedTopic.toLowerCase())
        .map(log => log.topics[1]?.toLowerCase())
        .filter((id): id is string => Boolean(id)));
      if (confirmedIds.size) setInvoices(current => current.map(invoice =>
        invoice.chainInvoiceId && confirmedIds.has(invoice.chainInvoiceId.toLowerCase())
          ? { ...invoice, status: 'FINANCEABLE' }
          : invoice));
    }
    if (syncPath) {
      setOperationStage('Transaction confirmed · updating your account…');
      if (!sessionToken) throw new Error('Transaction confirmed, but sign in again to sync its event.');
      await apiRequest(syncPath, sessionToken, { method: 'POST', body: JSON.stringify({ transactionHash: hash }) });
    }
    await queryClient.invalidateQueries({ predicate: query => query.queryKey[0] === 'readContract' });
    await AsyncStorage.removeItem(pendingKey);
    setPendingTransaction(undefined);
    if (refresh) await refreshWorkspace();
    setMessage(`Transaction confirmed after 5 blocks: ${hash}`);
  }

  async function resumeTransaction() {
    if (!address || !pendingTransaction || pendingTransaction.owner !== address.toLowerCase() || !publicClient || chainId !== 1874) throw new Error('Connect the original wallet on Whitechain Sepolia to resume.');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: pendingTransaction.hash, confirmations: 5, timeout: 240_000 });
    if (receipt.status === 'success' && pendingTransaction.syncPath) {
      if (!sessionToken) throw new Error('Sign in to synchronize this confirmed transaction.');
      await apiRequest(pendingTransaction.syncPath, sessionToken, { method: 'POST', body: JSON.stringify({ transactionHash: pendingTransaction.hash }) });
    }
    await AsyncStorage.removeItem(`creatoradvance:pending:1874:${address.toLowerCase()}`);
    setPendingTransaction(undefined);
    await refreshWorkspace();
    setMessage(receipt.status === 'success' ? 'Transaction confirmed and synchronized.' : 'Transaction reverted. No successful action was recorded.');
  }

  async function deployTestnetContract() {
    if (creatorAdvanceAddress || currentDeployedAddress) throw new Error('A CreatorAdvance test contract is already configured or deployed for this wallet.');
    if (!address || chainId !== whitechainSepolia.id) throw new Error('Connect the intended wallet on Whitechain Sepolia (chain ID 1874).');
    const walletProvider = walletRuntime?.appKit.getProvider('eip155') as ({
      setDefaultChain?: (chainId: string) => void;
      request: (args: { method: string; params?: unknown[] }, chainId?: string) => Promise<unknown>;
    } | null);
    if (!walletProvider) throw new Error('Wallet provider is not available. No deployment was submitted.');
    const targetCaipChain = `eip155:${whitechainSepolia.id}`;
    walletProvider.setDefaultChain?.(targetCaipChain);
    let signerChainId = parseEip155ChainId(await walletProvider.request({ method: 'eth_chainId' }, targetCaipChain));
    if (signerChainId !== whitechainSepolia.id) {
      setMessage('Requesting MetaMask to switch this connection to Whitechain Sepolia. No mainnet transaction will be sent.');
      await switchChainAsync({ chainId: whitechainSepolia.id });
      walletProvider.setDefaultChain?.(targetCaipChain);
      signerChainId = parseEip155ChainId(await walletProvider.request({ method: 'eth_chainId' }, targetCaipChain));
    }
    if (signerChainId !== whitechainSepolia.id) {
      throw new Error(`MetaMask still reports chain ${signerChainId ?? 'unknown'} for this app. Set the CreatorAdvance connection to Whitechain Sepolia (1874), then reconnect. No deployment was submitted.`);
    }
    if (!publicClient || await publicClient.getChainId() !== whitechainSepolia.id) throw new Error('RPC chain check failed. No deployment was submitted.');
    const tokenCode = await publicClient.getCode({ address: sponsorUsdt.address });
    const decimals = await publicClient.readContract({ address: sponsorUsdt.address, abi: erc20DecimalsAbi, functionName: 'decimals' });
    if (!tokenCode || tokenCode === '0x' || decimals !== 6) throw new Error('Organizer USDT contract verification failed. No deployment was submitted.');
    const args = [sponsorUsdt.address, address, address] as const;
    const deploymentData = encodeDeployData({ abi: creatorAdvanceDeployAbi, bytecode: creatorAdvanceDeploymentBytecode, args });
    const [gasEstimate, gasPrice] = await Promise.all([
      publicClient.estimateGas({ account: address, data: deploymentData }),
      publicClient.getGasPrice(),
    ]);
    const estimateWbt = formatEther(gasEstimate * gasPrice);
    setMessage(`Deployment estimate ${gasEstimate.toString()} gas (~${estimateWbt} WBT). Review the exact network, token, fee recipient, and admin in MetaMask before approving.`);
    const hash = await deployContractAsync({ abi: creatorAdvanceDeployAbi, bytecode: creatorAdvanceDeploymentBytecode, args, chainId: whitechainSepolia.id });
    setMessage(`Deployment submitted on Whitechain Sepolia: ${hash}. Waiting for 5 confirmations…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 5, timeout: 240_000 });
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error(`Deployment was not confirmed successfully: ${hash}`);
    const deployedCode = await publicClient.getCode({ address: receipt.contractAddress });
    if (!deployedCode || deployedCode === '0x') throw new Error('Confirmed deployment has no bytecode at its contract address.');
    await AsyncStorage.setItem(`creatoradvance:deployment:${whitechainSepolia.id}:${address.toLowerCase()}`, receipt.contractAddress);
    setDeployedAddress(receipt.contractAddress);
    setDeployedOwner(address.toLowerCase());
    setMessage(`Verified testnet deployment at ${receipt.contractAddress} · tx ${hash}. Configure this address in the local API and app environments before using contract actions.`);
  }

  async function registerBrandOnchain(brand: Brand) {
    if (!brand.chainBrandId || !brand.businessProfileHash) throw new Error('Brand registration payload is incomplete. Refresh the application first.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'registerBrand',
      args: [brand.chainBrandId as Hex, brand.businessProfileHash as Hex], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
  }

  async function authorizeSelfAsBrandSigner(brand: Brand) {
    if (!address || !brand.chainBrandId) throw new Error('Connect the brand owner wallet and refresh the application.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'setAuthorizedSigner',
      args: [brand.chainBrandId as Hex, address, true], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
  }

  async function reviewAndActivateBrand(brand: Brand) {
    if (!sessionToken || !brand.chainBrandId) throw new Error('Platform admin session or brand data is missing.');
    await apiRequest(`/admin/brands/${brand.id}/verify`, sessionToken, { method: 'POST' });
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'setBrandStatus',
      args: [brand.chainBrandId as Hex, 2], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'setBrandStatus',
      args: [brand.chainBrandId as Hex, 3], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
  }

  async function allowInvestor() {
    if (!/^0x[\da-fA-F]{40}$/.test(investorAddress)) throw new Error('Enter a valid investor wallet address.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'setInvestorEligibility',
      args: [investorAddress as Address, true], chainId: whitechainSepolia.id,
    }));
  }

  async function depositCollateral(brand: Brand, amount: string) {
    if (!brand.chainBrandId) throw new Error('Register this company on Whitechain before depositing collateral.');
    const amountUnits = parseUsdtAmount(amount);
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, amountUnits], chainId: whitechainSepolia.id,
    }), undefined, false);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'depositCollateral',
      args: [brand.chainBrandId as Hex, amountUnits], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
    setMessage(`${formatToken(amountUnits, 6, 2)} USDT collateral deposited for ${brand.publicName}. Balance refreshed.`);
  }

  async function writeInvoiceOnchain(invoiceId: string) {
    if (!sessionToken) throw new Error('Sign in first.');
    const data = await apiRequest<ChainInvoice & { id: string }>(`/creator/invoices/${invoiceId}/onchain`, sessionToken);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'createInvoice',
      args: [data.brandId, data.invoiceNumberHash, BigInt(data.faceValue), BigInt(data.dueDate), BigInt(data.listingExpiry), data.pdfHash, data.deliveryHash, data.campaignHash],
      chainId: whitechainSepolia.id,
    }), `/invoices/${invoiceId}/chain-sync`);
  }

  async function approveInvoice(invoice: Invoice) {
    if (!sessionToken || !creatorAdvanceAddress) throw new Error('Sign in and configure the contract first.');
    const contract = creatorAdvanceAddress;
    setOperationStage('Preparing approval from the server…');
    const approval = await apiRequest<ApprovalPayload>(`/brand/invoices/${invoice.id}/approval`, sessionToken);
    const message = approval.message;
    setOperationStage('Check MetaMask and sign the approval…');
    const signature = await signTypedDataAsync({
      domain: { name: 'CreatorAdvance', version: '1', chainId: whitechainSepolia.id, verifyingContract: contract },
      types: invoiceApprovalTypes,
      primaryType: 'InvoiceApproval',
      message: {
        brandId: message.brandId, invoiceId: message.invoiceId, creator: message.creator,
        invoiceNumberHash: message.invoiceNumberHash, faceValue: BigInt(message.faceValue), dueDate: BigInt(message.dueDate),
        pdfHash: message.pdfHash, deliveryHash: message.deliveryHash, campaignHash: message.campaignHash,
        listingExpiry: BigInt(message.listingExpiry), nonce: BigInt(message.nonce), deadline: BigInt(message.deadline),
      },
    });
    await finalizeTransaction(() => writeContractAsync({
      address: contract, abi: creatorAdvanceAbi, functionName: 'confirmInvoice',
      args: [message.invoiceId, BigInt(message.deadline), signature], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function rejectInvoice(invoice: Invoice) {
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'rejectInvoice',
      args: [invoice.chainInvoiceId as Hex], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function submitOffer(invoice: Invoice) {
    if (!invoice.chainInvoiceId) throw new Error('Refresh this invoice before bidding.');
    const { amount, expiry } = prepareBid(bidPrices[invoice.id] ?? '', invoice.faceValue, invoice.listingExpiry);
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, amount], chainId: whitechainSepolia.id,
    }), undefined, false);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'submitOffer',
      args: [invoice.chainInvoiceId as Hex, amount, BigInt(expiry)], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function acceptOffer(invoice: Invoice, offer: Offer) {
    if (!invoice.chainInvoiceId || !/^\d+$/.test(offer.chainOfferId)) throw new Error('Offer has not been indexed yet. Refresh and try again.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'acceptOffer',
      args: [invoice.chainInvoiceId as Hex, BigInt(offer.chainOfferId)], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function repayInvoice(invoice: Invoice) {
    if (!invoice.chainInvoiceId) throw new Error('Invoice has not been indexed on Whitechain yet.');
    const amount = parseUsdtAmount(repaymentAmount);
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, amount], chainId: whitechainSepolia.id,
    }), undefined, false);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'repay',
      args: [invoice.chainInvoiceId as Hex, amount], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function settleDefault(invoice: Invoice) {
    if (!invoice.chainInvoiceId) throw new Error('Invoice has not been indexed onchain.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'settleDefault',
      args: [invoice.chainInvoiceId as Hex], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function recoverDefault(invoice: Invoice) {
    if (!invoice.chainInvoiceId) throw new Error('Invoice has not been indexed on Whitechain yet.');
    const amount = parseUsdtAmount(repaymentAmount);
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, amount], chainId: whitechainSepolia.id,
    }), undefined, false);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'recoverDefault',
      args: [invoice.chainInvoiceId as Hex, amount], chainId: whitechainSepolia.id,
    }), `/invoices/${invoice.id}/chain-sync`);
  }

  async function cancelInvestorOffer(offer: InvestorOffer) {
    if (!/^\d+$/.test(offer.chainOfferId) || !offer.invoiceId) throw new Error('Offer is missing its indexed chain identifiers. Refresh and try again.');
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'cancelOffer',
      args: [BigInt(offer.chainOfferId)], chainId: whitechainSepolia.id,
    }), `/invoices/${offer.invoiceId}/chain-sync`);
  }

  async function loadCreatorOffers(invoiceId: string) {
    if (!sessionToken) throw new Error('Sign in first.');
    const result = await apiRequest<{ offers: Offer[] }>(`/creator/invoices/${invoiceId}/offers`, sessionToken);
    setOffersByInvoice((current) => ({ ...current, [invoiceId]: result.offers }));
  }

  async function signIn() {
    if (!address || chainId !== 1874) throw new Error('Switch the connected wallet to Whitechain Sepolia (1874) first.');
    const { nonce } = await apiRequest<{ nonce: string }>('/auth/nonce', undefined, { method: 'POST', body: JSON.stringify({ address }) });
    const issuedAt = new Date().toISOString();
    const origin = new URL(siweOrigin());
    const message = `${origin.host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to CreatorAdvance. This request will not trigger a blockchain transaction.\n\nURI: ${origin.origin}\nVersion: 1\nChain ID: 1874\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
    const signature = await signMessageAsync({ message });
    const session = await apiRequest<{ token: string; expiresAt: string; user: SessionUser }>('/auth/verify', undefined, { method: 'POST', body: JSON.stringify({ message, signature }) });
    const account = await apiRequest<{ user: SessionUser }>('/me', session.token);
    session.user = account.user;
    setRole(workspaceRoleFor(account.user));
    setView('home');
    await saveSession({ token: session.token, address, expiresAt: session.expiresAt });
    setToken(session.token); setSessionAddress(address); setUser(session.user); setOffersByInvoice({}); setInvestorOffers([]);
    setProfileHandle(session.user.creatorProfile?.handle ?? '');
    setProfilePlatform(session.user.creatorProfile?.platform ?? '');
    setProfileCountry(session.user.creatorProfile?.countryCode ?? 'IN');
    setMessage('Your account is securely saved on this device.');
  }

  const refreshWorkspace = useCallback(async () => {
    if (!sessionToken || role === 'SETUP') return;
    const identity = workspaceIdentity.current;
    const syncRecentInvoiceApprovals = async (items: Invoice[]) => {
      if (!creatorAdvanceAddress || !publicClient) return items;
      const pending = items.filter(invoice => invoice.status === 'PENDING_BRAND' && invoice.chainInvoiceId);
      if (!pending.length) return items;
      const latest = await publicClient.getBlockNumber();
      const earliest = latest > 10_000n ? latest - 10_000n : 0n;
      const ids = new Set(pending.map(invoice => invoice.chainInvoiceId!.toLowerCase()));
      const hashes = new Map<string, Hash>();
      for (let from = earliest; from <= latest; from += 2_000n) {
        const to = from + 1_999n > latest ? latest : from + 1_999n;
        const logs = await publicClient.getLogs({ address: creatorAdvanceAddress, event: invoiceConfirmedEvent, fromBlock: from, toBlock: to });
        for (const log of logs) {
          const id = log.args.invoiceId?.toLowerCase();
          if (id && ids.has(id)) hashes.set(id, log.transactionHash);
        }
      }
      let syncFailed = false;
      const reconciled = await Promise.all(items.map(async invoice => {
        const transactionHash = invoice.chainInvoiceId ? hashes.get(invoice.chainInvoiceId.toLowerCase()) : undefined;
        if (!transactionHash) return invoice;
        try {
          await apiRequest(`/invoices/${invoice.id}/chain-sync`, sessionToken, {
            method: 'POST', body: JSON.stringify({ transactionHash }),
          });
        } catch {
          syncFailed = true;
        }
        return { ...invoice, status: 'FINANCEABLE' };
      }));
      if (syncFailed) setMessage('Invoice approval is confirmed on Whitechain. The server sync will retry on refresh.');
      return reconciled;
    };
    if (role === 'CREATOR') {
      const [brandResult, invoiceResult] = await Promise.all([
        apiRequest<{ brands: Brand[] }>(`/brands${brandSearch.trim() ? `?search=${encodeURIComponent(brandSearch.trim())}` : ''}`, sessionToken),
        apiRequest<{ invoices: Invoice[] }>('/creator/invoices', sessionToken),
      ]);
      if (identity !== workspaceIdentity.current) return;
      setBrands(brandResult.brands); setInvoices(await syncRecentInvoiceApprovals(invoiceResult.invoices));
    } else if (role === 'BRAND') {
      const [brandResult, invoiceResult] = await Promise.all([
        apiRequest<{ brands: Brand[] }>('/brand/applications', sessionToken),
        apiRequest<{ invoices: Invoice[] }>('/brand/invoices', sessionToken),
      ]);
      if (identity !== workspaceIdentity.current) return;
      setBrands(brandResult.brands); setInvoices(await syncRecentInvoiceApprovals(invoiceResult.invoices));
    } else if (role === 'INVESTOR') {
      const [invoiceResult, offerResult] = await Promise.all([
        apiRequest<{ invoices: Invoice[] }>('/investor/invoices', sessionToken),
        apiRequest<{ offers: InvestorOffer[] }>('/investor/offers', sessionToken),
      ]);
      if (identity !== workspaceIdentity.current) return;
      setInvoices(invoiceResult.invoices); setInvestorOffers(offerResult.offers); setBrands([]);
    } else {
      const result = await apiRequest<{ brands: Brand[] }>('/admin/brands', sessionToken);
      if (identity !== workspaceIdentity.current) return;
      setBrands(result.brands); setInvoices([]);
    }
  }, [sessionToken, role, brandSearch, publicClient]);
  useEffect(() => {
    if (!sessionToken) return;
    const timer = setTimeout(() => { setLoadingWorkspace(true); void refreshWorkspace().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load workspace.')).finally(() => setLoadingWorkspace(false)); }, 250);
    return () => clearTimeout(timer);
  }, [refreshWorkspace, sessionToken]);
  useEffect(() => {
    if (!sessionToken || role === 'SETUP') return;
    const timer = setInterval(() => {
      if (!busy) void refreshWorkspace().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to refresh workspace.'));
    }, 30_000);
    return () => clearInterval(timer);
  }, [refreshWorkspace, sessionToken, role, busy]);
  async function enrollRole(next: 'CREATOR' | 'INVESTOR' | 'BRAND_ADMIN') {
    if (!sessionToken) throw new Error('Sign in first.');
    await apiRequest('/roles', sessionToken, { method: 'POST', body: JSON.stringify({ role: next }) });
    setUser((current) => current ? { ...current, roles: current.roles.some((binding) => binding.role === next) ? current.roles : [...current.roles, { role: next }] } : current);
    await refreshWorkspace();
    setMessage(`${next === 'BRAND_ADMIN' ? 'brand' : next.toLowerCase()} workspace enabled.`);
  }

  async function saveCreatorProfile() {
    if (!sessionToken) throw new Error('Sign in first.');
    if (!profileHandle.trim() || !profilePlatform.trim() || !/^[A-Z]{2}$/.test(profileCountry)) throw new Error('Enter a handle, platform, and two-letter uppercase country code.');
    await apiRequest('/roles', sessionToken, { method: 'POST', body: JSON.stringify({ role: 'CREATOR' }) });
    await apiRequest('/creator/profile', sessionToken, { method: 'PUT', body: JSON.stringify({ handle: profileHandle, platform: profilePlatform, countryCode: profileCountry }) });
    setUser((current) => current ? { ...current, creatorProfile: { handle: profileHandle.trim(), platform: profilePlatform.trim(), countryCode: profileCountry }, roles: current.roles.some((binding) => binding.role === 'CREATOR') ? current.roles : [...current.roles, { role: 'CREATOR' }] } : current);
    setEditingCreatorProfile(false);
    setMessage('Creator profile saved.');
  }

  async function submitBrand() {
    if (!sessionToken) throw new Error('Sign in first.');
    if (legalName.trim().length < 2 || publicName.trim().length < 2 || !/^[A-Z]{2}$/.test(brandCountry)) throw new Error('Enter the registered legal name, public name, and two-letter uppercase country code.');
    if (!registrationNumber.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brandContactEmail)) throw new Error('Enter the business registration number and a valid business contact email.');
    if (!registrationDocument) throw new Error('Select the business registration PDF.');
    if (registrationDocument.size && registrationDocument.size > 8 * 1024 * 1024) throw new Error('Registration PDF must be 8 MB or smaller.');
    const document = await uploadPrivatePdf('brand-registration', registrationDocument, sessionToken);
    const result = await apiRequest<{ brand: Brand; businessProfileHash: string }>('/brands', sessionToken, { method: 'POST', body: JSON.stringify({ legalName, publicName, website: brandWebsite, countryCode: brandCountry, registrationNumber, contactEmail: brandContactEmail, ...(document.documentKey ? { registrationDocumentKey: document.documentKey } : { registrationDocumentBase64: document.documentBase64 }) }) });
    setBrands(current => [result.brand, ...current.filter(brand => brand.id !== result.brand.id)]);
    setUser(current => current ? { ...current, roles: current.roles.some(item => item.role === 'BRAND_ADMIN') ? current.roles : [...current.roles, { role: 'BRAND_ADMIN' }] } : current);
    setMessage('Application saved. It is now in the review queue; Whitechain registration happens after approval.');
    if (creatorAdvanceAddress && result.brand.chainBrandId) await registerBrandOnchain({ ...result.brand, businessProfileHash: result.businessProfileHash });
  }

  async function submitInvoice() {
    if (!sessionToken || !selectedBrandId) throw new Error('Search for and select an active brand before submitting an invoice.');
    if (!evidenceFile || !deliveryProofFile || !campaignBriefFile) throw new Error('Choose the invoice, delivery proof, and campaign brief PDFs.');
    const faceValueUnits = parseUsdtAmount(faceValue);
    const [document, deliveryDocument, campaignDocument] = await Promise.all([
      uploadPrivatePdf('invoice-evidence', evidenceFile, sessionToken),
      uploadPrivatePdf('delivery-proof', deliveryProofFile, sessionToken),
      uploadPrivatePdf('campaign-brief', campaignBriefFile, sessionToken),
    ]);
    const now = currentTimeMs();
    const dueDate = new Date(now + 60 * 24 * 60 * 60_000);
    const listingExpiry = new Date(now + 30 * 24 * 60 * 60_000);
    const result = await apiRequest<{ invoice: { id: string }; chain: ChainInvoice }>('/creator/invoices', sessionToken, { method: 'POST', body: JSON.stringify({
      brandId: selectedBrandId, invoiceNumber, faceValue: faceValueUnits.toString(),
      dueDate: dueDate.toISOString(), listingExpiry: listingExpiry.toISOString(), ...(document.documentKey ? { evidenceDocumentKey: document.documentKey } : { evidenceBase64: document.documentBase64 }),
      ...(deliveryDocument.documentKey ? { deliveryProofDocumentKey: deliveryDocument.documentKey } : { deliveryProofBase64: deliveryDocument.documentBase64 }),
      ...(campaignDocument.documentKey ? { campaignBriefDocumentKey: campaignDocument.documentKey } : { campaignBriefBase64: campaignDocument.documentBase64 }),
    }) });
    setInvoices(current => [{ ...result.invoice, faceValue: faceValueUnits.toString(), dueDate: dueDate.toISOString(), listingExpiry: listingExpiry.toISOString(), status: 'PENDING_BRAND', brandId: selectedBrandId }, ...current]);
    setMessage(`Invoice submitted. SHA-256 fingerprints were calculated for all three PDFs. ${brands.find(brand => brand.id === selectedBrandId)?.publicName ?? 'The selected company'} can review them before investors see it.`);
    if (creatorAdvanceAddress) {
      const contract = creatorAdvanceAddress;
      await finalizeTransaction(() => writeContractAsync({
        address: contract, abi: creatorAdvanceAbi, functionName: 'createInvoice',
        args: [result.chain.brandId, result.chain.invoiceNumberHash, BigInt(result.chain.faceValue), BigInt(result.chain.dueDate), BigInt(result.chain.listingExpiry), result.chain.pdfHash, result.chain.deliveryHash, result.chain.campaignHash],
        chainId: whitechainSepolia.id,
      }), `/invoices/${result.invoice.id}/chain-sync`);
    } else { await refreshWorkspace(); setMessage('Invoice stored for the brand, but the contract address is not configured. It is not financeable until its onchain record and brand approval are confirmed.'); }
  }

  async function reviewInvoiceDocument(invoiceId: string, kind: 'invoice' | 'delivery' | 'campaign') {
    if (!sessionToken) throw new Error('Sign in first.');
    const response = await fetch(`${apiBaseUrl()}/invoices/${encodeURIComponent(invoiceId)}/documents/${kind}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) throw new Error(response.status === 404 ? 'This PDF is not available.' : 'Could not load the private invoice PDF.');
    const pdf = new File(Paths.cache, `${invoiceId}-${kind}.pdf`);
    await pdf.write(new Uint8Array(await response.arrayBuffer()));
    try { await pdf.preview({ title: `${kind} PDF` }); }
    catch {
      if (!await Sharing.isAvailableAsync()) throw new Error('No PDF preview or sharing app is available on this device.');
      await Sharing.shareAsync(pdf.uri, { dialogTitle: `${kind} PDF`, mimeType: 'application/pdf' });
    }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.brandBar}><View><Text style={styles.brandName}>CreatorAdvance</Text><Text style={styles.networkLabel}>WHITECHAIN SEPOLIA</Text></View>{sessionToken && isConnected && address ? <View style={styles.walletChip}><View style={styles.onlineDot}/><Text style={styles.walletChipText}>{address.slice(0, 6)}…{address.slice(-4)}</Text></View> : null}</View>
    {sessionToken && role !== 'SETUP' ? <View style={styles.navbar}>
      {(['home', 'work', 'inbox', 'pending', 'profile'] as const).map((page) => <Pressable key={page} accessibilityRole="tab" accessibilityState={{ selected: view === page }} onPress={() => setView(page)} style={[styles.navTab, view === page && styles.navTabActive]}><Text style={[styles.navTabText, view === page && styles.navTabTextActive]}>{page === 'work' ? role === 'BRAND' ? 'Payables' : role === 'INVESTOR' ? 'Market' : role === 'ADMIN' ? 'Reviews' : 'Work' : page === 'home' ? 'Home' : page === 'inbox' ? 'Inbox' : page === 'pending' ? 'Pending' : 'Profile'}</Text></Pressable>)}
    </View> : null}
    {busy ? <View style={styles.statusBanner}><View style={styles.spinnerDot}/><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{operationStage || 'Working…'}</Text><Text style={styles.statusDetail}>Keep this app open while the wallet confirms.</Text></View></View> : null}
    {pendingTransaction ? <View style={styles.pendingBanner}><View style={styles.pendingMark}><Text style={styles.pendingMarkText}>↻</Text></View><View style={{ flex: 1 }}><Text style={styles.statusTitle}>Transaction needs a status check</Text><Text selectable style={styles.statusDetail}>{pendingTransaction.hash.slice(0, 14)}…{pendingTransaction.hash.slice(-8)}</Text></View><Pressable accessibilityRole="button" onPress={() => void act(resumeTransaction)} disabled={busy} style={styles.retry}><Text style={styles.retryText}>Check</Text></Pressable></View> : null}
    {message ? <Text accessibilityRole="alert" style={styles.notice}>{message}</Text> : null}
    {sessionToken && role === 'SETUP' ? <><Text style={styles.title}>Choose your workspace.</Text><Text style={styles.body}>Choose the account type that matches how you use CreatorAdvance.</Text></> : null}

    {!sessionToken ? <View style={styles.entryPage}>
      <View style={styles.entryIntro}>
        <View style={styles.entryIcon}><View style={styles.entryIconShackle}/><View style={styles.entryIconBody}><View style={styles.entryIconKeyhole}/></View></View>
        <Text style={styles.entryEyebrow}>SECURE WALLET ACCESS</Text>
        <Text style={styles.entryTitle}>Your work, ready when you are.</Text>
        <Text style={styles.body}>Connect on Whitechain Sepolia, then sign a message to open the workspaces available to this wallet.</Text>
      </View>
      <View style={styles.entryWalletCard}>
        <View style={styles.entryCardHeading}><Text style={styles.cardLabel}>WALLET CONNECTION</Text><View style={[styles.entryStatus, isConnected && chainId === 1874 && styles.entryStatusReady]}><View style={[styles.entryStatusDot, isConnected && chainId === 1874 && styles.entryStatusDotReady]}/><Text style={[styles.entryStatusText, isConnected && chainId === 1874 && styles.entryStatusTextReady]}>{!isConnected ? 'Not connected' : chainId === 1874 ? 'Ready' : 'Switch network'}</Text></View></View>
        {isConnected && address ? <><Text selectable style={styles.entryAddress}>{`${address.slice(0, 8)}…${address.slice(-6)}`}</Text><Text style={styles.muted}>{chainId === 1874 ? 'Connected to Whitechain Sepolia.' : `Connected to chain ${chainId ?? 'unknown'}. Choose Whitechain Sepolia in your wallet to continue.`}</Text></> : <Text style={styles.muted}>Connect the wallet you use for CreatorAdvance.</Text>}
        <Button title={isConnected ? 'Disconnect wallet' : 'Connect wallet'} onPress={() => { if (isConnected) { setToken(undefined); setUser(undefined); setSessionAddress(undefined); void clearSession().finally(() => disconnect()); } else { void open(); } }} disabled={busy} />
        {restoringSession ? <Text accessibilityLiveRegion="polite" style={styles.muted}>Restoring your account…</Text> : isConnected ? <Button title="Sign in with a message" onPress={() => void act(signIn)} disabled={busy || chainId !== 1874} /> : null}
        {isConnected && chainId === 1874 ? <View style={styles.entryBalances}><BalanceRow label="USDT balance" value={tokenBalance.data} decimals={6} loading={tokenBalance.isLoading} /><BalanceRow label="WBT for network gas" value={nativeBalance.data?.value} decimals={18} loading={nativeBalance.isLoading} /></View> : null}
        {!creatorAdvanceAddress && !currentDeployedAddress ? <View style={styles.entryDeploy}><Text style={styles.entryDeployTitle}>First-time testnet setup</Text><Text style={styles.muted}>Deploy the test contract for this wallet. Review every deployment request in your wallet.</Text><Button title="Deploy test contract" onPress={() => void act(deployTestnetContract)} disabled={busy || !isConnected || chainId !== whitechainSepolia.id} /></View> : null}
        {currentDeployedAddress ? <Text selectable style={styles.muted}>Test contract · {currentDeployedAddress}</Text> : null}
      </View>
      <Text style={styles.entryFootnote}>Sign-in uses a message signature. It does not send a payment or blockchain transaction.</Text>
    </View> : null}

    {sessionToken ? <>
      {role === 'SETUP' ? <View style={styles.card}><Text style={styles.cardLabel}>ONE WALLET · ONE WORKSPACE</Text><Text style={styles.address}>Choose your account type</Text><Text style={styles.muted}>This wallet will stay assigned to this role. You can create a separate wallet for another role.</Text>{(['CREATOR', 'INVESTOR'] as const).map(item => <Button key={item} title={`Continue as ${item === 'INVESTOR' ? 'financier' : 'creator'}`} disabled={busy} onPress={() => void act(async () => { await enrollRole(item); setRole(item); setView('home'); })} />)}<Button title="Continue to company setup" disabled={busy} onPress={() => void act(async () => { await enrollRole('BRAND_ADMIN'); setRole('BRAND'); setView('profile'); })} /></View> : null}

      {role !== 'SETUP' ? (view === 'home' ? <Dashboard key={role} role={role} invoices={invoices} offers={investorOffers} brands={brands} loading={loadingWorkspace} onOpen={() => setView('work')} onRefresh={() => void act(refreshWorkspace)} /> : view === 'inbox' ? <InboxPage role={role} invoices={invoices} offers={investorOffers} brands={brands} /> : view === 'pending' ? <PendingPage role={role} invoices={invoices} offers={investorOffers} brands={brands} onOpenWork={() => setView('work')} /> : view === 'profile' ? <ProfilePage role={role} user={user} address={address} chainId={chainId} brands={brands} profileHandle={profileHandle} setProfileHandle={setProfileHandle} profilePlatform={profilePlatform} setProfilePlatform={setProfilePlatform} profileCountry={profileCountry} setProfileCountry={setProfileCountry} editingCreatorProfile={editingCreatorProfile} setEditingCreatorProfile={setEditingCreatorProfile} busy={busy} onSaveCreator={() => void act(saveCreatorProfile)} onDisconnect={() => { setToken(undefined); setUser(undefined); setSessionAddress(undefined); void clearSession().finally(() => disconnect()); }} brandForm={<>{!brands.length ? <><StepFlow title="Company details" labels={["Legal identity", "Brand name", "Location", "Website", "Registration", "Contact", "Evidence"]}><Input label="Registered legal name" value={legalName} onChangeText={setLegalName} /><Input label="Public brand name" value={publicName} onChangeText={setPublicName} /><Input label="Country code" value={brandCountry} onChangeText={setBrandCountry} /><Input label="Website (optional)" value={brandWebsite} onChangeText={setBrandWebsite} /><Input label="Business registration number" value={registrationNumber} onChangeText={setRegistrationNumber} /><Input label="Business contact email" value={brandContactEmail} onChangeText={setBrandContactEmail} /><Button title={registrationDocument ? `Registration PDF · ${registrationDocument.name}` : 'Choose registration PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setRegistrationDocument(result.assets[0]); })} disabled={busy} /></StepFlow><Button title="Submit company application" onPress={() => void act(submitBrand)} disabled={busy} /></> : null}</>} /> : <><View style={styles.pageHeading}><Text style={styles.pageTitle}>{role === 'BRAND' ? 'Payables' : role === 'INVESTOR' ? 'Marketplace' : role === 'ADMIN' ? 'Reviews' : 'Your work'}</Text><Text style={styles.pageSubtitle}>{role === 'BRAND' ? 'Review creator invoices and manage company funding.' : role === 'INVESTOR' ? 'Browse approved invoices and manage your offers.' : role === 'ADMIN' ? 'Review business applications and platform activity.' : 'Create invoices and track their progress.'}</Text></View><View style={styles.card}><Text style={styles.cardLabel}>{role} · WORK</Text>
        {role === 'CREATOR' ? <>
          {!user?.creatorProfile?.handle ? <View style={styles.notice}><Text style={styles.rowText}>Complete your creator profile in Profile before submitting work.</Text><Button title="Open profile" onPress={() => setView('profile')} /></View> : null}
          <Text style={styles.workSectionTitle}>Find an active brand</Text>
          <Input label="Search active brands" value={brandSearch} onChangeText={setBrandSearch} />
          <Button title="Search brands and refresh invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.map((brand) => <Pressable key={brand.id} accessibilityRole="button" onPress={() => setSelectedBrandId(brand.id)} style={[styles.brandOption, selectedBrandId === brand.id && styles.brandOptionSelected]}><Text style={styles.rowText}>{selectedBrandId === brand.id ? 'Selected · ' : ''}{brand.publicName} · {brand.countryCode}</Text>{brand.website ? <Text style={styles.muted}>{brand.website}</Text> : null}</Pressable>)}
          {brands.length > 0 && selectedBrandId ? <>
            <Text style={styles.workSectionTitle}>Create invoice</Text>
            <StepFlow title="New invoice" labels={["Invoice reference", "Amount", "Delivery proof PDF", "Campaign brief PDF", "Invoice PDF"]}><Input label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} />
            <Input label="Invoice total · USDT (e.g. 1,250.00)" value={faceValue} onChangeText={setFaceValue} keyboardType="decimal-pad" />
            <Text style={styles.muted}>Attach the three PDFs. CreatorAdvance stores them privately and calculates each SHA-256 fingerprint for the Whitechain record.</Text>
            <Button title={deliveryProofFile ? `Delivery proof · ${deliveryProofFile.name}` : 'Choose delivery proof PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setDeliveryProofFile(result.assets[0]); })} disabled={busy} />
            <Button title={campaignBriefFile ? `Campaign brief · ${campaignBriefFile.name}` : 'Choose campaign brief PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setCampaignBriefFile(result.assets[0]); })} disabled={busy} />
            <Button title={evidenceFile ? `Invoice PDF · ${evidenceFile.name}` : 'Choose invoice PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setEvidenceFile(result.assets[0]); })} disabled={busy} />
            </StepFlow><Button title="Submit invoice for review" onPress={() => void act(submitInvoice)} disabled={busy} />
          </> : <Text style={styles.muted}>{brands.length ? 'Select the correct active brand above to continue.' : 'No matching active brands are available. Search again or wait for a brand to complete registration.'}</Text>}
          {invoices.length ? <Text style={styles.workSectionTitle}>Your invoices</Text> : null}
          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}><View style={styles.invoiceHeading}><Text style={styles.rowText}>Invoice · {formatToken(BigInt(invoice.faceValue), 6, 2)} USDT</Text><StatusBadge status={invoice.status} /></View>{!invoice.chainInvoiceId ? <Button title="Create onchain invoice record" onPress={() => void act(() => writeInvoiceOnchain(invoice.id))} disabled={busy || !creatorAdvanceAddress} /> : <Button title="Load offers" onPress={() => void act(() => loadCreatorOffers(invoice.id))} disabled={busy} />}{[...(offersByInvoice[invoice.id] ?? [])].sort((a, b) => BigInt(a.price) > BigInt(b.price) ? -1 : BigInt(a.price) < BigInt(b.price) ? 1 : 0).map((offer) => <View key={offer.id} style={styles.actionItem}><Text style={styles.muted}>Offer {offer.chainOfferId} · {formatToken(BigInt(offer.price), 6, 2)} USDT · {offer.status}</Text>{offer.status === 'ACTIVE' && Date.parse(offer.expiresAt) > Date.now() ? <Button title="Accept offer and fund invoice" onPress={() => void act(() => acceptOffer(invoice, offer))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}</View>)}
          <Text style={styles.muted}>Invoices become financeable only after brand approval and a finalized contract event.</Text>
        </> : null}
        {role === 'BRAND' ? <>
          {!brands.length ? <View style={styles.notice}><Text style={styles.rowText}>Set up your company profile in Profile before reviewing payables.</Text><Button title="Open company profile" onPress={() => setView('profile')} /></View> : null}
          <Button title="Refresh applications & invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.length ? <Text style={styles.workSectionTitle}>Company finance</Text> : null}
          {brands.map((brand) => <BrandFinanceCard key={brand.id} brand={brand} currentAddress={address} chainId={chainId} amount={collateralAmounts[brand.id] ?? ''} onAmountChange={value => setCollateralAmounts(current => ({ ...current, [brand.id]: value }))} onDeposit={() => void act(() => depositCollateral(brand, collateralAmounts[brand.id] ?? ''))} onRegister={() => void act(() => registerBrandOnchain(brand))} onAuthorize={() => void act(() => authorizeSelfAsBrandSigner(brand))} busy={busy} />)}
          {!brands.length ? <Text style={styles.muted}>Your application will appear here with its review status after you submit it.</Text> : null}
          {invoices.length ? <Text style={styles.workSectionTitle}>Creator invoices</Text> : null}
          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}>
            <View style={styles.invoiceHeading}><Text style={styles.rowText}>{invoice.brand?.publicName ?? 'Company'} · {formatToken(BigInt(invoice.faceValue), 6, 2)} USDT</Text><StatusBadge status={invoice.status} /></View>
            {invoice.creator?.walletAddress ? <Text selectable style={styles.muted}>Creator wallet · {invoice.creator.walletAddress}</Text> : null}
            <Text style={styles.muted}>Due {new Date(invoice.dueDate).toLocaleDateString()}</Text>
            <Button title="Review invoice PDF" onPress={() => void act(() => reviewInvoiceDocument(invoice.id, 'invoice'))} disabled={busy} />
            <Button title="Review delivery proof" onPress={() => void act(() => reviewInvoiceDocument(invoice.id, 'delivery'))} disabled={busy} />
            <Button title="Review campaign brief" onPress={() => void act(() => reviewInvoiceDocument(invoice.id, 'campaign'))} disabled={busy} />
            {invoice.status === 'PENDING_BRAND' && invoice.chainInvoiceId ? <><Text style={styles.invoiceActionHint}>This invoice is waiting for your decision.</Text><Button title="Approve invoice" onPress={() => void act(() => approveInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /><Button title="Reject invoice" onPress={() => void act(() => rejectInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}
            {invoice.status === 'PENDING_BRAND' && !invoice.chainInvoiceId ? <Text style={styles.invoiceActionHint}>Waiting for the creator to publish this invoice on Whitechain. Approval and rejection unlock after its on-chain record syncs.</Text> : null}
            {invoice.status === 'FINANCEABLE' ? <Text style={styles.invoiceActionHint}>Already approved. This invoice is now open for investor offers.</Text> : null}
            {invoice.status === 'FUNDED' ? <Text style={styles.invoiceActionHint}>Already approved and funded. Invoice decisions are closed; repayment actions are below.</Text> : null}
            {invoice.chainInvoiceId && invoice.status === 'FUNDED' ? <><Input label="Repayment amount · USDT" value={repaymentAmount} onChangeText={setRepaymentAmount} keyboardType="decimal-pad" /><Button title="Approve USDT and repay" onPress={() => void act(() => repayInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /><Button title="Settle overdue default from collateral" onPress={() => void act(() => settleDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}
            {invoice.chainInvoiceId && invoice.status === 'DEFAULTED' ? <><Input label="Default recovery amount · USDT" value={repaymentAmount} onChangeText={setRepaymentAmount} keyboardType="decimal-pad" /><Button title="Approve USDT and recover default" onPress={() => void act(() => recoverDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}
          </View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable chain actions.</Text> : null}
        </> : null}
        {role === 'INVESTOR' ? <>
          <Text style={styles.workSectionTitle}>Financeable invoices</Text>
          <Button title="Refresh financeable invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />

          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}><Text style={styles.cardLabel}>{invoice.brand?.publicName ?? 'Approved receivable'}{invoice.brand?.countryCode ? ` · ${invoice.brand.countryCode}` : ''}</Text>{invoice.brand?.website ? <Text style={styles.muted}>{invoice.brand.website}</Text> : null}<Text style={styles.address}>{formatToken(BigInt(invoice.faceValue), 6, 2)} USDT face value</Text><Text style={styles.muted}>Due {new Date(invoice.dueDate).toLocaleDateString()} · Offers close {invoice.listingExpiry ? new Date(invoice.listingExpiry).toLocaleDateString() : "unavailable"}</Text><Input label="Your offer · USDT" value={bidPrices[invoice.id] ?? ""} onChangeText={(value) => setBidPrices(current => ({ ...current, [invoice.id]: value }))} keyboardType="numeric" />{offerDiscount(bidPrices[invoice.id] ?? '', invoice.faceValue) ? <Text style={styles.muted}>{offerDiscount(bidPrices[invoice.id] ?? '', invoice.faceValue)}</Text> : null}<Text style={styles.muted}>USDT is held in escrow until your offer is accepted or cancelled. Repayment is not guaranteed.</Text><Button title="Approve USDT and submit offer" onPress={() => void act(() => submitOffer(invoice))} disabled={busy || !creatorAdvanceAddress || !invoice.chainInvoiceId} />{invoice.chainInvoiceId ? <Button title="Settle overdue default" onPress={() => void act(() => settleDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {!invoices.length ? <Text style={styles.muted}>No financeable invoices yet. Approved creator invoices appear here when they are ready for offers.</Text> : null}
          {investorOffers.length ? <Text style={styles.workSectionTitle}>Your active offers</Text> : null}
          {investorOffers.map((offer) => <View key={offer.id} style={styles.actionItem}><Text style={styles.muted}>Offer {offer.chainOfferId} on invoice {offer.invoiceId} · {formatToken(BigInt(offer.price), 6, 2)} USDT · {offer.status}</Text>{offer.status === 'ACTIVE' ? <Button title="Cancel offer and refund USDT" onPress={() => void act(() => cancelInvestorOffer(offer))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable offers and funding.</Text> : null}
        </> : null}
        {role === 'ADMIN' ? <>
          <Text style={styles.workSectionTitle}>Investor access</Text>
          <Input label="Investor wallet to allowlist" value={investorAddress} onChangeText={setInvestorAddress} />
          <Button title="Allow investor onchain" onPress={() => void act(allowInvestor)} disabled={busy || !creatorAdvanceAddress} />
          <Button title="Refresh platform brand queue" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.length ? <Text style={styles.workSectionTitle}>Company applications</Text> : null}
          {brands.map((brand) => <View key={brand.id} style={styles.actionItem}><Text style={styles.rowText}>{brand.legalName} · {brand.publicName} · {brand.countryCode} · {brand.registrationNumber} · {brand.contactEmail} · review {brand.status} · chain status {brand.chainStatus ?? 0}</Text>{brand.website ? <Text style={styles.muted}>{brand.website}</Text> : null}<Button title="Review registration evidence" onPress={() => void act(async () => { if (!sessionToken) throw new Error('Sign in first.'); const response = await fetch(`${apiBaseUrl()}/admin/brands/${brand.id}/registration-evidence`, { headers: { Authorization: `Bearer ${sessionToken}` } }); if (!response.ok) throw new Error('Registration evidence unavailable.'); const pdf = new File(Paths.cache, `${brand.id}-registration.pdf`); await pdf.write(new Uint8Array(await response.arrayBuffer())); try { await pdf.preview({ title: `${brand.publicName} registration` }); } catch { if (!await Sharing.isAvailableAsync()) throw new Error('No PDF preview or sharing app is available on this device.'); await Sharing.shareAsync(pdf.uri, { dialogTitle: `${brand.publicName} registration evidence`, mimeType: 'application/pdf' }); } })} disabled={busy} />{brand.chainStatus && brand.chainStatus > 0 && brand.status !== 'ACTIVE' ? <Button title="Verify and activate onchain" onPress={() => void act(() => reviewAndActivateBrand(brand))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable onchain administration.</Text> : null}
        </> : null}
      </View></>) : null}
    </> : null}
    <Text style={styles.footer}>Test network · Test tokens have no monetary value.</Text>
  </ScrollView></SafeAreaView>;
}

function StepFlow({ title, labels, children }: { title: string; labels: string[]; children: ReactNode }) {
  const [step, setStep] = useState(0);
  const fields = Children.toArray(children);
  return <View style={styles.stepCard}>
    <Text style={styles.cardLabel}>{title} · {step + 1} OF {fields.length}</Text>
    <View style={styles.progressTrack}>{fields.map((_, index) => <View key={index} style={[styles.progressPart, index <= step && styles.progressFilled]} />)}</View>
    <Text style={styles.address}>{labels[step]}</Text>
    {fields[step]}
    <View style={styles.roleRow}>
      {step > 0 ? <Pressable accessibilityRole="button" style={styles.role} onPress={() => setStep(step - 1)}><Text style={styles.roleText}>Back</Text></Pressable> : null}
      {step < fields.length - 1 ? <Pressable accessibilityRole="button" style={styles.role} onPress={() => setStep(step + 1)}><Text style={styles.roleText}>Continue →</Text></Pressable> : <Text style={styles.muted}>Review your details using Back, then submit below.</Text>}
    </View>
  </View>;
}

function InboxPage({ role, invoices, offers, brands }: { role: WorkspaceRole; invoices: Invoice[]; offers: InvestorOffer[]; brands: Brand[] }) {
  const updates = role === 'BRAND'
    ? invoices.filter(invoice => invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_BRAND')
    : role === 'CREATOR'
      ? invoices.filter(invoice => invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_BRAND')
      : [];
  const offerUpdates = role === 'INVESTOR' ? offers.filter(offer => offer.status !== 'ACTIVE') : [];
  const brandUpdates = role === 'ADMIN' ? brands.filter(brand => brand.status !== 'PENDING') : [];
  const count = updates.length + offerUpdates.length + brandUpdates.length;
  return <View style={styles.pageSection}>
    <View><Text style={styles.pageTitle}>Inbox</Text><Text style={styles.pageSubtitle}>Status changes and completed decisions. Work awaiting action lives in Pending.</Text></View>
    {!count ? <View style={styles.emptyPage}><Text style={styles.cardTitle}>No new updates</Text><Text style={styles.muted}>Confirmed approvals, funding, and review decisions will appear here.</Text></View> : null}
    {updates.map(invoice => <View key={invoice.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{invoice.brand?.publicName ?? 'Invoice'} · {formatToken(BigInt(invoice.faceValue), 6, 2)} USDT</Text><StatusBadge status={invoice.status} /></View><Text style={styles.muted}>{role === 'BRAND' ? 'Invoice status update' : 'Your invoice status changed'} · Due {new Date(invoice.dueDate).toLocaleDateString()}</Text></View>)}
    {offerUpdates.map(offer => <View key={offer.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>Offer {offer.chainOfferId}</Text><StatusBadge status={offer.status} /></View><Text style={styles.muted}>{formatToken(BigInt(offer.price), 6, 2)} USDT · invoice {offer.invoiceId}</Text></View>)}
    {brandUpdates.map(brand => <View key={brand.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{brand.publicName}</Text><StatusBadge status={brand.status ?? 'REVIEWED'} /></View><Text style={styles.muted}>Company application decision</Text></View>)}
  </View>;
}

function PendingPage({ role, invoices, offers, brands, onOpenWork }: { role: WorkspaceRole; invoices: Invoice[]; offers: InvestorOffer[]; brands: Brand[]; onOpenWork: () => void }) {
  const pendingInvoices = role === 'BRAND'
    ? invoices.filter(invoice => invoice.status === 'PENDING_BRAND')
    : role === 'CREATOR'
      ? invoices.filter(invoice => invoice.status === 'PENDING_BRAND' || invoice.status === 'FINANCEABLE')
      : [];
  const pendingBrands = role === 'ADMIN' ? brands.filter(brand => brand.status === 'PENDING') : [];
  const activeOfferInvoices = new Set(offers.filter(offer => offer.status === 'ACTIVE').map(offer => offer.invoiceId));
  const investmentActions = role === 'INVESTOR' ? invoices.filter(invoice => invoice.status === 'FINANCEABLE' && !activeOfferInvoices.has(invoice.id)) : [];
  const count = pendingInvoices.length + pendingBrands.length + investmentActions.length;
  return <View style={styles.pageSection}>
    <View style={styles.pageHeading}><Text style={styles.pageTitle}>Pending work</Text><Text style={styles.pageSubtitle}>{role === 'BRAND' ? 'Invoices waiting for your approval.' : role === 'CREATOR' ? 'Invoices awaiting review or ready for financing.' : role === 'INVESTOR' ? 'Financeable invoices you have not offered on yet.' : 'Business applications waiting for platform review.'}</Text></View>
    {!count ? <View style={styles.emptyPage}><Text style={styles.cardTitle}>Nothing needs your attention</Text><Text style={styles.muted}>New action items will appear here as your workspace changes.</Text></View> : null}
    {pendingBrands.map(brand => <View key={brand.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{brand.publicName}</Text><StatusBadge status={brand.status ?? 'PENDING'} /></View><Text style={styles.muted}>Business registration is waiting for review.</Text><Button title="Review application" onPress={onOpenWork} /></View>)}
    {pendingInvoices.map(invoice => <View key={invoice.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{invoice.brand?.publicName ?? 'Invoice'} · {formatToken(BigInt(invoice.faceValue), 6, 2)} USDT</Text><StatusBadge status={invoice.status} /></View><Text style={styles.muted}>Due {new Date(invoice.dueDate).toLocaleDateString()}</Text><Button title={role === 'BRAND' ? 'Review and approve' : 'Open invoice'} onPress={onOpenWork} /></View>)}
    {investmentActions.map(invoice => <View key={invoice.id} style={styles.inboxCard}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{invoice.brand?.publicName ?? 'Approved invoice'} · {formatToken(BigInt(invoice.faceValue), 6, 2)} USDT</Text><StatusBadge status={invoice.status} /></View><Text style={styles.muted}>Available for an investor offer.</Text><Button title="Review opportunity" onPress={onOpenWork} /></View>)}
  </View>;
}

function ProfilePage({ role, user, address, chainId, brands, profileHandle, setProfileHandle, profilePlatform, setProfilePlatform, profileCountry, setProfileCountry, editingCreatorProfile, setEditingCreatorProfile, busy, onSaveCreator, onDisconnect, brandForm }: {
  role: WorkspaceRole; user?: SessionUser; address?: Address; chainId?: number; brands: Brand[];
  profileHandle: string; setProfileHandle: (value: string) => void; profilePlatform: string; setProfilePlatform: (value: string) => void; profileCountry: string; setProfileCountry: (value: string) => void;
  editingCreatorProfile: boolean; setEditingCreatorProfile: (value: boolean) => void; busy: boolean; onSaveCreator: () => void; onDisconnect: () => void; brandForm: ReactNode;
}) {
  const profile = user?.creatorProfile;
  return <View style={styles.pageSection}>
    <View><Text style={styles.pageTitle}>Profile</Text><Text style={styles.pageSubtitle}>Your account, wallet and workspace details.</Text></View>
    <View style={styles.profileCard}><Text style={styles.cardLabel}>CONNECTED WALLET</Text><Text selectable style={styles.cardTitle}>{address ?? 'No wallet connected'}</Text><Text style={styles.muted}>{chainId === 1874 ? 'Whitechain Sepolia · Connected' : `Chain ${chainId ?? 'unknown'}`}</Text><Button title="Disconnect wallet" onPress={onDisconnect} /></View>
    {role === 'CREATOR' ? <View style={styles.profileCard}><Text style={styles.cardLabel}>CREATOR PROFILE</Text>{profile?.handle && !editingCreatorProfile ? <><Text style={styles.cardTitle}>@{profile.handle}</Text><Text style={styles.muted}>{profile.platform} · {profile.countryCode}</Text><Button title="Edit creator profile" onPress={() => setEditingCreatorProfile(true)} /></> : <><Text style={styles.muted}>{profile ? 'Update your public creator details.' : 'Add your details once to submit delivered work.'}</Text><StepFlow title={profile ? 'Edit creator profile' : 'Create creator profile'} labels={["Your identity", "Your audience", "Your location"]}><Input label="Creator handle" value={profileHandle} onChangeText={setProfileHandle} /><Input label="Platform" value={profilePlatform} onChangeText={setProfilePlatform} /><Input label="Country code" value={profileCountry} onChangeText={setProfileCountry} /></StepFlow><Button title={profile ? 'Save profile changes' : 'Create creator profile'} onPress={onSaveCreator} disabled={busy || !profileHandle.trim() || !profilePlatform.trim() || !/^[A-Z]{2}$/.test(profileCountry)} /></>}</View> : null}
    {role === 'BRAND' ? <View style={styles.profileCard}><Text style={styles.cardLabel}>COMPANY PROFILE</Text>{brands.length ? brands.map(brand => <View key={brand.id} style={styles.companyProfile}><View style={styles.invoiceHeading}><Text style={styles.cardTitle}>{brand.publicName}</Text><StatusBadge status={brand.status ?? 'PENDING'} /></View><Text style={styles.muted}>{brand.legalName} · {brand.countryCode}</Text>{brand.website ? <Text style={styles.muted}>{brand.website}</Text> : null}{brand.registrationNumber ? <Text style={styles.muted}>Registration · {brand.registrationNumber}</Text> : null}{brand.contactEmail ? <Text style={styles.muted}>{brand.contactEmail}</Text> : null}</View>) : <>{brandForm}</>}</View> : null}
    {role === 'INVESTOR' || role === 'ADMIN' ? <View style={styles.profileCard}><Text style={styles.cardLabel}>{role === 'INVESTOR' ? 'INVESTOR ACCOUNT' : 'PLATFORM ACCOUNT'}</Text><Text style={styles.cardTitle}>{role === 'INVESTOR' ? 'Investor workspace' : 'Platform administrator'}</Text><Text style={styles.muted}>{role === 'INVESTOR' ? 'Review approved invoices and manage your offers from Market and Inbox.' : 'Review companies and platform activity from Reviews and Inbox.'}</Text></View> : null}
  </View>;
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonDim]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

function StatusBadge({ status }: { status: string }) {
  const approved = status === 'FINANCEABLE' || status === 'FUNDED' || status === 'REPAID';
  const waiting = status === 'PENDING_BRAND';
  return <View style={[styles.statusBadge, approved ? styles.statusApproved : waiting ? styles.statusWaiting : styles.statusOther]}><Text style={styles.statusBadgeText}>{status.replaceAll('_', ' ').toLowerCase()}</Text></View>;
}

function Input({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric' | 'decimal-pad' }) {
  return <View style={styles.inputGroup}><Text style={styles.muted}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} autoCapitalize="none" keyboardType={keyboardType ?? 'default'} style={styles.input} placeholderTextColor={colors.quiet} /></View>;
}

function BalanceRow({ label, value, decimals, loading }: { label: string; value?: bigint; decimals: number; loading: boolean }) {
  return <View style={styles.balanceRow}><Text style={styles.rowText}>{label}</Text><Text style={styles.rowText}>{loading ? 'Loading…' : value === undefined ? 'Unavailable' : formatToken(value, decimals, 4)}</Text></View>;
}

function BrandFinanceCard({ brand, currentAddress, chainId, amount, onAmountChange, onDeposit, onRegister, onAuthorize, busy, admin, onReview, onEvidence }: {
  brand: Brand; currentAddress?: Address; chainId?: number; amount: string; onAmountChange: (value: string) => void;
  onDeposit: () => void; onRegister: () => void; onAuthorize: () => void; busy: boolean; admin?: boolean;
  onReview?: () => void; onEvidence?: () => void;
}) {
  const state = useReadContract({
    address: creatorAdvanceAddress,
    abi: brandStateAbi,
    functionName: 'brands',
    args: brand.chainBrandId ? [brand.chainBrandId as Hex] : undefined,
    chainId: whitechainSepolia.id,
    query: { enabled: Boolean(creatorAdvanceAddress && brand.chainBrandId) },
  });
  const chainBrand = state.data as readonly [Address, Hex, number, bigint, bigint] | undefined;
  const chainOwner = chainBrand?.[0];
  const deposited = chainBrand?.[3] ?? 0n;
  const reserved = chainBrand?.[4] ?? 0n;
  const available = deposited >= reserved ? deposited - reserved : 0n;
  const controlsOwner = Boolean(currentAddress && brand.walletAddress?.toLowerCase() === currentAddress.toLowerCase());
  return <View style={styles.actionItem}>
    <View style={styles.balanceRow}><Text style={styles.cardLabel}>{brand.status ?? 'PENDING'} · CHAIN {brand.chainStatus ?? 0}</Text><Text style={styles.muted}>{brand.countryCode ?? '—'}</Text></View>
    <Text style={styles.address}>{brand.publicName}</Text>
    {brand.legalName ? <Text style={styles.muted}>{brand.legalName}</Text> : null}
    {brand.website ? <Text style={styles.muted}>{brand.website}</Text> : null}
    {brand.contactEmail ? <Text style={styles.muted}>Finance contact · {brand.contactEmail}</Text> : null}
    {brand.registrationNumber ? <Text style={styles.muted}>Registration · {brand.registrationNumber}</Text> : null}
    {brand.walletAddress ? <Text selectable style={styles.muted}>Company wallet · {brand.walletAddress}</Text> : null}
    {creatorAdvanceAddress && brand.chainBrandId ? <View style={styles.card}>
      <Text style={styles.cardLabel}>ONCHAIN COLLATERAL · USDT</Text>
      {state.isLoading ? <Text style={styles.muted}>Reading Whitechain balance…</Text> : state.error ? <Text style={styles.muted}>Couldn’t load collateral. Refresh when the network is available.</Text> : <>
        <BalanceRow label="Deposited" value={deposited} decimals={6} loading={false} />
        <BalanceRow label="Reserved for invoices" value={reserved} decimals={6} loading={false} />
        <BalanceRow label="Available to back invoices" value={available} decimals={6} loading={false} />
        {chainOwner ? <Text style={styles.muted}>Onchain owner · {chainOwner}</Text> : null}
      </>}
      {controlsOwner && brand.status === 'ACTIVE' ? <>
        <Input label="Deposit USDT" value={amount} onChangeText={onAmountChange} keyboardType="decimal-pad" />
        <Button title="Approve and deposit collateral" onPress={onDeposit} disabled={busy || !creatorAdvanceAddress || chainId !== whitechainSepolia.id || !amount.trim()} />
      </> : null}
      {controlsOwner && brand.chainStatus === 0 ? <Button title="Register company on Whitechain" onPress={onRegister} disabled={busy || !creatorAdvanceAddress || chainId !== whitechainSepolia.id} /> : null}
      {controlsOwner && brand.chainStatus !== undefined && brand.chainStatus > 0 && brand.chainStatus < 4 ? <Button title="Authorize this wallet to approve invoices" onPress={onAuthorize} disabled={busy || !creatorAdvanceAddress || chainId !== whitechainSepolia.id} /> : null}
    </View> : <Text style={styles.muted}>Whitechain contract data is not configured.</Text>}
    {admin && brand.chainStatus && brand.chainStatus > 0 && brand.status !== 'ACTIVE' ? <Button title="Verify and activate this company" onPress={onReview ?? (() => undefined)} disabled={busy || !creatorAdvanceAddress} /> : null}
    {admin && onEvidence ? <Button title="Review registration document" onPress={onEvidence} disabled={busy} /> : null}
  </View>;
}

function WalletSetup() {
  return <SafeAreaView style={styles.safe}><View style={styles.page}><Text style={styles.eyebrow}>CREATORADVANCE · TESTNET</Text><Text style={styles.title}>Connect your test wallet.</Text><Text style={styles.body}>Set EXPO_PUBLIC_REOWN_PROJECT_ID in apps/mobile/.env.local and restart Metro.</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  entryPage: { gap: 21, paddingTop: 13 }, entryIntro: { gap: 11, paddingTop: 8 }, entryEyebrow: { color: colors.action, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }, entryTitle: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '700', letterSpacing: -0.9 },
  entryIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e3ebe4', marginBottom: 2, position: 'relative' }, entryIconShackle: { position: 'absolute', top: 11, width: 21, height: 15, borderWidth: 2, borderColor: colors.action, borderTopLeftRadius: 12, borderTopRightRadius: 12 }, entryIconBody: { position: 'absolute', top: 21, width: 27, height: 22, borderRadius: 6, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' }, entryIconKeyhole: { width: 5, height: 8, borderRadius: 3, backgroundColor: colors.accent },
  entryWalletCard: { padding: 18, borderRadius: 22, gap: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, entryCardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, entryStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 13, backgroundColor: '#efece5' }, entryStatusReady: { backgroundColor: '#e5eee7' }, entryStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.quiet }, entryStatusDotReady: { backgroundColor: '#5b9875' }, entryStatusText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, entryStatusTextReady: { color: colors.action }, entryAddress: { color: colors.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 }, entryBalances: { paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }, entryDeploy: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, gap: 10 }, entryDeployTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' }, entryFootnote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 10 },
  pageSection: { gap: 16 }, pageHeading: { gap: 5, paddingTop: 2 }, pageTitle: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.6 }, pageSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 }, workSectionTitle: { color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 6 },
  inboxCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 11 }, profileCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 13 }, companyProfile: { gap: 8, paddingVertical: 6 }, emptyPage: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  stepCard: { padding: 16, gap: 18, borderRadius: 16, backgroundColor: colors.canvas }, progressTrack: { flexDirection: 'row', gap: 4 }, progressPart: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border }, progressFilled: { backgroundColor: colors.action },
  safe: { flex: 1, backgroundColor: colors.canvas }, page: { flexGrow: 1, padding: spacing.page, paddingTop: 42, paddingBottom: 36, gap: spacing.section },
  brandBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }, brandName: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }, networkLabel: { color: colors.muted, fontSize: 10, letterSpacing: 0.8, marginTop: 3 }, walletChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 18 }, onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5b9875' }, walletChipText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  navbar: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 14, backgroundColor: '#e9e4d9', marginBottom: 2 }, navTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, navTabActive: { backgroundColor: colors.surface, shadowColor: '#24382e', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, navTabText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, navTabTextActive: { color: colors.action },
  statusBanner: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 15, backgroundColor: '#e6efe7', borderWidth: 1, borderColor: '#ccddce' }, pendingBanner: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 13, borderRadius: 15, backgroundColor: '#f6eadb', borderWidth: 1, borderColor: '#ead3b9' }, spinnerDot: { height: 10, width: 10, borderRadius: 5, backgroundColor: colors.action }, statusTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' }, statusDetail: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, pendingMark: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, pendingMarkText: { color: colors.ink, fontSize: 18, fontWeight: '700' }, retry: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 }, retryText: { color: colors.action, fontSize: 13, fontWeight: '700' },
  activeCompany: { flexDirection: 'row', gap: 9, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: '#e6efe7' }, activeDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: '#548b69' }, activeCompanyText: { color: colors.action, fontSize: 13, fontWeight: '600' },
  invoiceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, statusBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }, statusApproved: { backgroundColor: '#e4eee6' }, statusWaiting: { backgroundColor: '#f4e7d8' }, statusOther: { backgroundColor: '#eae9e4' }, statusBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }, invoiceActionHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 1 },
  eyebrow: { color: colors.text, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }, title: { color: colors.ink, fontSize: 30, fontWeight: '600', lineHeight: 37, letterSpacing: -0.5 },
  body: { color: colors.text, fontSize: 15, lineHeight: 23 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 21, padding: spacing.card, gap: 14 },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }, address: { color: colors.ink, fontSize: 19, fontWeight: '600' }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  roleRow: { flexDirection: 'row', gap: 8 }, role: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }, roleActive: { backgroundColor: colors.action, borderColor: colors.action }, roleText: { fontSize: 12, fontWeight: '700', color: colors.text }, roleTextActive: { color: '#fff' },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, buttonDim: { opacity: 0.55 }, buttonText: { color: '#fffaf2', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  rowText: { color: colors.ink, fontSize: 14, lineHeight: 20 }, balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, accountButton: { minHeight: 44, minWidth: 96, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-end' }, notice: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.text, fontSize: 13, lineHeight: 19 },
  inputGroup: { gap: 7 }, input: { minHeight: 50, paddingHorizontal: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 13, color: colors.ink, fontSize: 15, backgroundColor: colors.surface }, actionItem: { gap: 12, padding: 18, marginVertical: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface },
  brandOption: { borderColor: colors.border, borderWidth: 1, borderRadius: 9, padding: 10 }, brandOptionSelected: { borderColor: colors.action, backgroundColor: '#eef3ff' },
  footer: { color: colors.quiet, fontSize: 11, lineHeight: 16 },
});









