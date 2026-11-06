import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAppKit } from '@reown/appkit-react-native';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccount, useBalance, usePublicClient, useReadContract, useSignMessage, useSignTypedData, useWriteContract } from 'wagmi';
import { type Address, type Hash, type Hex } from 'viem';
import { apiBaseUrl, apiRequest } from '../src/lib/api';
import { erc20BalanceAbi, sponsorUsdt, whitechainSepolia } from '../src/lib/chain';
import { creatorAdvanceAbi, creatorAdvanceAddress, erc20ApprovalAbi } from '../src/lib/contract';
import { formatToken } from '../src/lib/format-token';
import { walletRuntime } from '../src/lib/wallet';
import { colors, spacing } from '../src/theme';

type Brand = { id: string; legalName?: string; publicName: string; website?: string | null; countryCode?: string; registrationNumber?: string; contactEmail?: string; status?: string; chainStatus?: number; chainBrandId?: string; businessProfileHash?: string; walletAddress?: string };
type Invoice = { id: string; faceValue: string; dueDate: string; listingExpiry?: string; status: string; brandId?: string; chainInvoiceId?: string };
type SessionUser = { walletAddress: string; roles: { role: string }[] };
type ChainInvoice = { brandId: Hex; invoiceNumberHash: Hex; invoiceId: Hex; faceValue: string; dueDate: string; listingExpiry: string; pdfHash: Hex; deliveryHash: Hex; campaignHash: Hex };
type ApprovalPayload = { message: { brandId: Hex; invoiceId: Hex; creator: Address; invoiceNumberHash: Hex; faceValue: string; dueDate: string; pdfHash: Hex; deliveryHash: Hex; campaignHash: Hex; listingExpiry: string; nonce: string; deadline: string } };
type Offer = { id: string; chainOfferId: string; invoiceId?: string; price: string; status: string; expiresAt: string };
type InvestorOffer = Offer & { invoiceId: string };

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
  const { open, disconnect } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: whitechainSepolia.id });
  const [token, setToken] = useState<string>();
  const [sessionAddress, setSessionAddress] = useState<string>();
  const [user, setUser] = useState<SessionUser>();
  const [role, setRole] = useState<'CREATOR' | 'BRAND' | 'INVESTOR' | 'ADMIN'>('CREATOR');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
  const [deliveryHash, setDeliveryHash] = useState('');
  const [campaignHash, setCampaignHash] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ uri: string; size?: number; name: string }>();
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>();
  const [offersByInvoice, setOffersByInvoice] = useState<Record<string, Offer[]>>({});
  const [investorOffers, setInvestorOffers] = useState<InvestorOffer[]>([]);
  const [offerPrice, setOfferPrice] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [investorAddress, setInvestorAddress] = useState('');
  const sessionToken = address?.toLowerCase() === sessionAddress?.toLowerCase() ? token : undefined;
  const nativeBalance = useBalance({ address, chainId: whitechainSepolia.id, query: { enabled: Boolean(address) } });
  const tokenBalance = useReadContract({ address: sponsorUsdt.address, abi: erc20BalanceAbi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: whitechainSepolia.id, query: { enabled: Boolean(address && chainId === whitechainSepolia.id) } });

  async function act(task: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message.replaceAll('_', ' ') : 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  }

  async function finalizeTransaction(send: () => Promise<Hash>, syncPath?: string, refresh = true) {
    const contract = creatorAdvanceAddress;
    if (!contract) throw new Error('Set EXPO_PUBLIC_CONTRACT_ADDRESS after the reviewed testnet deployment.');
    if (!address || chainId !== whitechainSepolia.id) throw new Error('Connect a wallet on Whitechain Sepolia before sending a transaction.');
    if (!publicClient) throw new Error('Whitechain RPC is unavailable. Try again when the network is online.');
    const hash = await send();
    setMessage(`Transaction submitted: ${hash}. Waiting for 5 confirmations…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 5, timeout: 240_000 });
    if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${hash}`);
    if (syncPath) {
      if (!sessionToken) throw new Error('Transaction confirmed, but sign in again to sync its event.');
      await apiRequest(syncPath, sessionToken, { method: 'POST', body: JSON.stringify({ transactionHash: hash }) });
    }
    if (refresh) await refreshWorkspace();
    setMessage(`Transaction confirmed after 5 blocks: ${hash}`);
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

  async function depositCollateral(brand: Brand) {
    if (!brand.chainBrandId || !/^\d+$/.test(collateralAmount) || BigInt(collateralAmount) <= 0n) throw new Error('Enter a positive collateral amount in USDT micro-units.');
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, BigInt(collateralAmount)], chainId: whitechainSepolia.id,
    }), undefined, false);
    await finalizeTransaction(() => writeContractAsync({
      address: creatorAdvanceAddress!, abi: creatorAdvanceAbi, functionName: 'depositCollateral',
      args: [brand.chainBrandId as Hex, BigInt(collateralAmount)], chainId: whitechainSepolia.id,
    }), `/brands/${brand.id}/chain-sync`);
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
    const approval = await apiRequest<ApprovalPayload>(`/brand/invoices/${invoice.id}/approval`, sessionToken);
    const message = approval.message;
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
    if (!invoice.chainInvoiceId || !/^\d+$/.test(offerPrice) || BigInt(offerPrice) <= 0n) throw new Error('Enter an offer price in positive USDT micro-units.');
    const amount = BigInt(offerPrice);
    await finalizeTransaction(() => writeContractAsync({
      address: sponsorUsdt.address, abi: erc20ApprovalAbi, functionName: 'approve',
      args: [creatorAdvanceAddress!, amount], chainId: whitechainSepolia.id,
    }), undefined, false);
    const now = currentTimeMs();
    const expiry = Math.min(Math.floor(now / 1000) + 7 * 86400, Math.floor(new Date(invoice.listingExpiry ?? now + 86400000).getTime() / 1000));
    if (expiry <= Math.floor(now / 1000)) throw new Error('This listing is no longer open for offers. Refresh the invoice list.');
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
    if (!invoice.chainInvoiceId || !/^\d+$/.test(repaymentAmount) || BigInt(repaymentAmount) <= 0n) throw new Error('Enter repayment amount in USDT micro-units.');
    const amount = BigInt(repaymentAmount);
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
    if (!invoice.chainInvoiceId || !/^\d+$/.test(repaymentAmount) || BigInt(repaymentAmount) <= 0n) throw new Error('Enter the default recovery amount in USDT micro-units.');
    const amount = BigInt(repaymentAmount);
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
    const message = `localhost:8081 wants you to sign in with your Ethereum account:\n${address}\n\nSign in to CreatorAdvance. This request will not trigger a blockchain transaction.\n\nURI: http://localhost:8081\nVersion: 1\nChain ID: 1874\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
    const signature = await signMessageAsync({ message });
    const session = await apiRequest<{ token: string; user: SessionUser }>('/auth/verify', undefined, { method: 'POST', body: JSON.stringify({ message, signature }) });
    setToken(session.token); setSessionAddress(address); setUser(session.user); setOffersByInvoice({}); setInvestorOffers([]);
    setMessage('Wallet authenticated. Session token stays in memory on this device.');
  }

  async function refreshWorkspace() {
    if (!sessionToken) return;
    if (role === 'CREATOR') {
      const [brandResult, invoiceResult] = await Promise.all([
        apiRequest<{ brands: Brand[] }>(`/brands${brandSearch.trim() ? `?search=${encodeURIComponent(brandSearch.trim())}` : ''}`, sessionToken),
        apiRequest<{ invoices: Invoice[] }>('/creator/invoices', sessionToken),
      ]);
      setBrands(brandResult.brands); setInvoices(invoiceResult.invoices);
    } else if (role === 'BRAND') {
      const [brandResult, invoiceResult] = await Promise.all([
        apiRequest<{ brands: Brand[] }>('/brand/applications', sessionToken),
        apiRequest<{ invoices: Invoice[] }>('/brand/invoices', sessionToken),
      ]);
      setBrands(brandResult.brands); setInvoices(invoiceResult.invoices);
    } else if (role === 'INVESTOR') {
      const [invoiceResult, offerResult] = await Promise.all([
        apiRequest<{ invoices: Invoice[] }>('/investor/invoices', sessionToken),
        apiRequest<{ offers: InvestorOffer[] }>('/investor/offers', sessionToken),
      ]);
      setInvoices(invoiceResult.invoices); setInvestorOffers(offerResult.offers); setBrands([]);
    } else {
      const result = await apiRequest<{ brands: Brand[] }>('/admin/brands', sessionToken);
      setBrands(result.brands); setInvoices([]);
    }
  }

  async function enrollRole(next: 'CREATOR' | 'INVESTOR') {
    if (!sessionToken) throw new Error('Sign in first.');
    await apiRequest('/roles', sessionToken, { method: 'POST', body: JSON.stringify({ role: next }) });
    setUser((current) => current ? { ...current, roles: current.roles.some((binding) => binding.role === next) ? current.roles : [...current.roles, { role: next }] } : current);
    await refreshWorkspace();
    setMessage(`${next.toLowerCase()} workspace enabled.`);
  }

  async function saveCreatorProfile() {
    if (!sessionToken) throw new Error('Sign in first.');
    if (!profileHandle.trim() || !profilePlatform.trim() || !/^[A-Z]{2}$/.test(profileCountry)) throw new Error('Enter a handle, platform, and two-letter uppercase country code.');
    await apiRequest('/roles', sessionToken, { method: 'POST', body: JSON.stringify({ role: 'CREATOR' }) });
    await apiRequest('/creator/profile', sessionToken, { method: 'PUT', body: JSON.stringify({ handle: profileHandle, platform: profilePlatform, countryCode: profileCountry }) });
    setUser((current) => current ? { ...current, roles: current.roles.some((binding) => binding.role === 'CREATOR') ? current.roles : [...current.roles, { role: 'CREATOR' }] } : current);
    setMessage('Creator profile saved.');
  }

  async function submitBrand() {
    if (!sessionToken) throw new Error('Sign in first.');
    if (legalName.trim().length < 2 || publicName.trim().length < 2 || !/^[A-Z]{2}$/.test(brandCountry)) throw new Error('Enter the registered legal name, public name, and two-letter uppercase country code.');
    if (!registrationNumber.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brandContactEmail)) throw new Error('Enter the business registration number and a valid business contact email.');
    if (!registrationDocument) throw new Error('Select the business registration PDF.');
    if (registrationDocument.size && registrationDocument.size > 8 * 1024 * 1024) throw new Error('Registration PDF must be 8 MB or smaller.');
    const registrationDocumentBase64 = await new File(registrationDocument.uri).base64();
    const result = await apiRequest<{ brand: Brand; businessProfileHash: string }>('/brands', sessionToken, { method: 'POST', body: JSON.stringify({ legalName, publicName, website: brandWebsite, countryCode: brandCountry, registrationNumber, contactEmail: brandContactEmail, registrationDocumentBase64 }) });
    if (creatorAdvanceAddress) await registerBrandOnchain({ ...result.brand, businessProfileHash: result.businessProfileHash });
    else { await refreshWorkspace(); setMessage('Brand application submitted. Configure the reviewed contract address to register it onchain; it is not active or financeable yet.'); }
  }

  async function submitInvoice() {
    if (!sessionToken || !selectedBrandId) throw new Error('Search for and select an active brand before submitting an invoice.');
    if (!evidenceFile) throw new Error('Select the payable PDF evidence first.');
    if (!/^\d+$/.test(faceValue) || BigInt(faceValue) <= 0n) throw new Error('Enter face value as a positive integer in USDT micro-units (6 decimals).');
    if (!/^[\da-f]{64}$/i.test(deliveryHash) || !/^[\da-f]{64}$/i.test(campaignHash)) throw new Error('Enter the SHA-256 delivery and campaign evidence hashes.');
    if (evidenceFile.size && evidenceFile.size > 8 * 1024 * 1024) throw new Error('PDF must be 8 MB or smaller.');
    const evidenceBase64 = await new File(evidenceFile.uri).base64();
    const now = currentTimeMs();
    const dueDate = new Date(now + 60 * 24 * 60 * 60_000);
    const listingExpiry = new Date(now + 30 * 24 * 60 * 60_000);
    const result = await apiRequest<{ invoice: { id: string }; chain: ChainInvoice }>('/creator/invoices', sessionToken, { method: 'POST', body: JSON.stringify({
      brandId: selectedBrandId, invoiceNumber, faceValue,
      dueDate: dueDate.toISOString(), listingExpiry: listingExpiry.toISOString(), evidenceBase64,
      deliverySha256: deliveryHash, campaignSha256: campaignHash,
    }) });
    if (creatorAdvanceAddress) {
      const contract = creatorAdvanceAddress;
      await finalizeTransaction(() => writeContractAsync({
        address: contract, abi: creatorAdvanceAbi, functionName: 'createInvoice',
        args: [result.chain.brandId, result.chain.invoiceNumberHash, BigInt(result.chain.faceValue), BigInt(result.chain.dueDate), BigInt(result.chain.listingExpiry), result.chain.pdfHash, result.chain.deliveryHash, result.chain.campaignHash],
        chainId: whitechainSepolia.id,
      }), `/invoices/${result.invoice.id}/chain-sync`);
    } else { await refreshWorkspace(); setMessage('Invoice stored for the brand, but the contract address is not configured. It is not financeable until its onchain record and brand approval are confirmed.'); }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>CREATORADVANCE · WHITECHAIN SEPOLIA</Text>
    <Text style={styles.title}>Get paid for work you’ve already done.</Text>
    <Text style={styles.body}>A testnet workspace for approved creator receivables.</Text>

    <View style={styles.card}>
      <Text style={styles.cardLabel}>WALLET</Text>
      {isConnected && address ? <><Text style={styles.address}>{`${address.slice(0, 6)}…${address.slice(-4)}`}</Text><Text style={styles.muted}>{chainId === 1874 ? 'Whitechain Sepolia' : `Connected to chain ${chainId ?? 'unknown'}`}</Text></> : <Text style={styles.body}>No wallet connected.</Text>}
      <Button title={isConnected ? 'Disconnect wallet' : 'Connect wallet'} onPress={() => isConnected ? disconnect() : void open()} disabled={busy} />
      {isConnected && !token ? <Button title="Sign in securely" onPress={() => void act(signIn)} disabled={busy || chainId !== 1874} /> : null}
      {token ? <Text style={styles.muted}>Signed in as {address?.slice(0, 6)}…{address?.slice(-4)}</Text> : null}
      {isConnected && chainId === 1874 ? <><BalanceRow label="USDT" value={tokenBalance.data} decimals={6} loading={tokenBalance.isLoading} /><BalanceRow label="WBT · gas" value={nativeBalance.data?.value} decimals={18} loading={nativeBalance.isLoading} /></> : null}
    </View>

    {sessionToken ? <>
      <View style={styles.roleRow}>{(['CREATOR', 'BRAND', 'INVESTOR', ...(user?.roles.some((binding) => binding.role === 'PLATFORM_ADMIN') ? ['ADMIN' as const] : [])] as const).map((item) => <Pressable key={item} onPress={() => { setRole(item); setInvoices([]); setBrands([]); }} style={[styles.role, role === item && styles.roleActive]}><Text style={[styles.roleText, role === item && styles.roleTextActive]}>{item}</Text></Pressable>)}</View>
      <View style={styles.card}><Text style={styles.cardLabel}>{role} WORKSPACE</Text>
        {role === 'CREATOR' ? <>
          {!user?.roles.some((binding) => binding.role === 'CREATOR') ? <Button title="Enable creator workspace" onPress={() => void act(() => enrollRole('CREATOR'))} disabled={busy} /> : null}
          <Input label="Creator handle" value={profileHandle} onChangeText={setProfileHandle} />
          <Input label="Platform" value={profilePlatform} onChangeText={setProfilePlatform} />
          <Input label="Country code" value={profileCountry} onChangeText={setProfileCountry} />
          <Button title="Save creator profile" onPress={() => void act(saveCreatorProfile)} disabled={busy} />
          <Input label="Search active brands" value={brandSearch} onChangeText={setBrandSearch} />
          <Button title="Search brands and refresh invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.map((brand) => <Pressable key={brand.id} accessibilityRole="button" onPress={() => setSelectedBrandId(brand.id)} style={[styles.brandOption, selectedBrandId === brand.id && styles.brandOptionSelected]}><Text style={styles.rowText}>{selectedBrandId === brand.id ? 'Selected · ' : ''}{brand.publicName}</Text></Pressable>)}
          {brands.length > 0 && selectedBrandId ? <>
            <Input label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} />
            <Input label="Face value in USDT micro-units (6 decimals)" value={faceValue} onChangeText={setFaceValue} keyboardType="numeric" />
            <Input label="Delivery evidence SHA-256" value={deliveryHash} onChangeText={setDeliveryHash} />
            <Input label="Campaign evidence SHA-256" value={campaignHash} onChangeText={setCampaignHash} />
            <Button title={evidenceFile ? `PDF: ${evidenceFile.name}` : 'Choose payable PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setEvidenceFile(result.assets[0]); })} disabled={busy} />
            <Button title="Submit invoice for review" onPress={() => void act(submitInvoice)} disabled={busy} />
          </> : <Text style={styles.muted}>{brands.length ? 'Select the correct active brand above to continue.' : 'No matching active brands are available. Search again or wait for a brand to complete registration.'}</Text>}
          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}><Text style={styles.rowText}>Invoice · {invoice.status} · {invoice.faceValue} USDT micro-units</Text>{!invoice.chainInvoiceId ? <Button title="Create onchain invoice record" onPress={() => void act(() => writeInvoiceOnchain(invoice.id))} disabled={busy || !creatorAdvanceAddress} /> : <Button title="Load offers" onPress={() => void act(() => loadCreatorOffers(invoice.id))} disabled={busy} />}{(offersByInvoice[invoice.id] ?? []).map((offer) => <View key={offer.id} style={styles.actionItem}><Text style={styles.muted}>Offer {offer.chainOfferId} · {offer.price} micro-USDT · {offer.status}</Text>{offer.status === 'ACTIVE' ? <Button title="Accept offer and fund invoice" onPress={() => void act(() => acceptOffer(invoice, offer))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}</View>)}
          <Text style={styles.muted}>Invoices become financeable only after brand approval and a finalized contract event.</Text>
        </> : null}
        {role === 'BRAND' ? <>
          <Input label="Registered legal name" value={legalName} onChangeText={setLegalName} />
          <Input label="Public brand name" value={publicName} onChangeText={setPublicName} />
          <Input label="Country code" value={brandCountry} onChangeText={setBrandCountry} />
          <Input label="Website (optional)" value={brandWebsite} onChangeText={setBrandWebsite} />
          <Input label="Business registration number" value={registrationNumber} onChangeText={setRegistrationNumber} />
          <Input label="Business contact email" value={brandContactEmail} onChangeText={setBrandContactEmail} />
          <Button title={registrationDocument ? `Registration PDF: ${registrationDocument.name}` : 'Choose registration PDF'} onPress={() => void act(async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) setRegistrationDocument(result.assets[0]); })} disabled={busy} />
          <Button title="Submit brand application" onPress={() => void act(submitBrand)} disabled={busy} />
          <Button title="Refresh applications & invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.map((brand) => <View key={brand.id} style={styles.actionItem}><Text style={styles.rowText}>{brand.legalName} · {brand.publicName} · {brand.status ?? 'PENDING'} · chain status {brand.chainStatus ?? 0}</Text>{brand.chainStatus === 0 ? <Button title="Register brand on Whitechain" onPress={() => void act(() => registerBrandOnchain(brand))} disabled={busy || !creatorAdvanceAddress} /> : null}{brand.chainStatus && brand.chainStatus > 0 ? <Button title="Authorize this wallet as invoice signer" onPress={() => void act(() => authorizeSelfAsBrandSigner(brand))} disabled={busy || !creatorAdvanceAddress} /> : null}{brand.status === 'ACTIVE' ? <><Input label="Collateral amount in USDT micro-units" value={collateralAmount} onChangeText={setCollateralAmount} keyboardType="numeric" /><Button title="Approve USDT and deposit collateral" onPress={() => void act(() => depositCollateral(brand))} disabled={busy || !creatorAdvanceAddress} /></> : null}</View>)}
          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}><Text style={styles.rowText}>Invoice · {invoice.status} · {invoice.faceValue} micro-USDT</Text>{invoice.chainInvoiceId && invoice.status === 'PENDING_BRAND' ? <><Button title="Sign EIP-712 approval and confirm" onPress={() => void act(() => approveInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /><Button title="Reject invoice onchain" onPress={() => void act(() => rejectInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}{invoice.chainInvoiceId && invoice.status === 'FUNDED' ? <><Input label="Repayment amount in USDT micro-units" value={repaymentAmount} onChangeText={setRepaymentAmount} keyboardType="numeric" /><Button title="Approve USDT and repay" onPress={() => void act(() => repayInvoice(invoice))} disabled={busy || !creatorAdvanceAddress} /><Button title="Settle overdue default from collateral" onPress={() => void act(() => settleDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}{invoice.chainInvoiceId && invoice.status === 'DEFAULTED' ? <><Input label="Default recovery amount in USDT micro-units" value={repaymentAmount} onChangeText={setRepaymentAmount} keyboardType="numeric" /><Button title="Approve USDT and recover default" onPress={() => void act(() => recoverDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /></> : null}</View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable chain actions.</Text> : null}
        </> : null}
        {role === 'INVESTOR' ? <>
          {!user?.roles.some((binding) => binding.role === 'INVESTOR') ? <Button title="Enable investor workspace" onPress={() => void act(() => enrollRole('INVESTOR'))} disabled={busy} /> : null}
          <Button title="Refresh financeable invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          <Input label="Offer price in USDT micro-units (6 decimals)" value={offerPrice} onChangeText={setOfferPrice} keyboardType="numeric" />
          {invoices.map((invoice) => <View key={invoice.id} style={styles.actionItem}><Text style={styles.rowText}>Invoice · {invoice.status} · {invoice.faceValue} micro-USDT</Text><Button title="Approve USDT and submit offer" onPress={() => void act(() => submitOffer(invoice))} disabled={busy || !creatorAdvanceAddress || !invoice.chainInvoiceId} />{invoice.chainInvoiceId ? <Button title="Settle overdue default" onPress={() => void act(() => settleDefault(invoice))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {investorOffers.map((offer) => <View key={offer.id} style={styles.actionItem}><Text style={styles.muted}>Offer {offer.chainOfferId} on invoice {offer.invoiceId} · {offer.price} micro-USDT · {offer.status}</Text>{offer.status === 'ACTIVE' ? <Button title="Cancel offer and refund USDT" onPress={() => void act(() => cancelInvestorOffer(offer))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable offers and funding.</Text> : null}
        </> : null}
        {role === 'ADMIN' ? <>
          <Input label="Investor wallet to allowlist" value={investorAddress} onChangeText={setInvestorAddress} />
          <Button title="Allow investor onchain" onPress={() => void act(allowInvestor)} disabled={busy || !creatorAdvanceAddress} />
          <Button title="Refresh platform brand queue" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.map((brand) => <View key={brand.id} style={styles.actionItem}><Text style={styles.rowText}>{brand.legalName} · {brand.publicName} · {brand.countryCode} · {brand.registrationNumber} · {brand.contactEmail} · review {brand.status} · chain status {brand.chainStatus ?? 0}</Text>{brand.website ? <Text style={styles.muted}>{brand.website}</Text> : null}<Button title="Review registration evidence" onPress={() => void act(async () => { if (!sessionToken) throw new Error('Sign in first.'); const response = await fetch(`${apiBaseUrl()}/admin/brands/${brand.id}/registration-evidence`, { headers: { Authorization: `Bearer ${sessionToken}` } }); if (!response.ok) throw new Error('Registration evidence unavailable.'); const pdf = new File(Paths.cache, `${brand.id}-registration.pdf`); await pdf.write(new Uint8Array(await response.arrayBuffer())); try { await pdf.preview({ title: `${brand.publicName} registration` }); } catch { if (!await Sharing.isAvailableAsync()) throw new Error('No PDF preview or sharing app is available on this device.'); await Sharing.shareAsync(pdf.uri, { dialogTitle: `${brand.publicName} registration evidence`, mimeType: 'application/pdf' }); } })} disabled={busy} />{brand.chainStatus && brand.chainStatus > 0 && brand.status !== 'ACTIVE' ? <Button title="Verify and activate onchain" onPress={() => void act(() => reviewAndActivateBrand(brand))} disabled={busy || !creatorAdvanceAddress} /> : null}</View>)}
          {!creatorAdvanceAddress ? <Text style={styles.muted}>Set EXPO_PUBLIC_CONTRACT_ADDRESS after reviewed testnet deployment to enable onchain administration.</Text> : null}
        </> : null}
      </View>
    </> : null}
    {busy ? <Text style={styles.muted}>Working…</Text> : null}
    {message ? <Text accessibilityRole="alert" style={styles.notice}>{message}</Text> : null}
    <Text style={styles.footer}>Test tokens have no monetary value. Never upload real customer documents to this local demo.</Text>
  </ScrollView></SafeAreaView>;
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonDim]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

function Input({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'numeric' }) {
  return <View style={styles.inputGroup}><Text style={styles.muted}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} autoCapitalize="none" keyboardType={keyboardType ?? 'default'} style={styles.input} placeholderTextColor={colors.quiet} /></View>;
}

function BalanceRow({ label, value, decimals, loading }: { label: string; value?: bigint; decimals: number; loading: boolean }) {
  return <View style={styles.balanceRow}><Text style={styles.rowText}>{label}</Text><Text style={styles.rowText}>{loading ? 'Loading…' : value === undefined ? 'Unavailable' : formatToken(value, decimals, 4)}</Text></View>;
}

function WalletSetup() {
  return <SafeAreaView style={styles.safe}><View style={styles.page}><Text style={styles.eyebrow}>CREATORADVANCE · TESTNET</Text><Text style={styles.title}>Connect your test wallet.</Text><Text style={styles.body}>Set EXPO_PUBLIC_REOWN_PROJECT_ID in apps/mobile/.env.local and restart Metro.</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, page: { flexGrow: 1, padding: spacing.page, paddingTop: 30, gap: spacing.section },
  eyebrow: { color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.card, gap: 12 },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 }, address: { color: colors.ink, fontSize: 20, fontWeight: '700' }, muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  roleRow: { flexDirection: 'row', gap: 8 }, role: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }, roleActive: { backgroundColor: colors.action, borderColor: colors.action }, roleText: { fontSize: 12, fontWeight: '700', color: colors.text }, roleTextActive: { color: '#fff' },
  button: { minHeight: 46, borderRadius: 11, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, buttonDim: { opacity: 0.6 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  rowText: { color: colors.ink, fontSize: 14, lineHeight: 20 }, balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, notice: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.text, fontSize: 13, lineHeight: 19 },
  inputGroup: { gap: 5 }, input: { minHeight: 44, paddingHorizontal: 11, borderColor: colors.border, borderWidth: 1, borderRadius: 9, color: colors.ink, fontSize: 15 }, actionItem: { gap: 8, paddingVertical: 8 },
  brandOption: { borderColor: colors.border, borderWidth: 1, borderRadius: 9, padding: 10 }, brandOptionSelected: { borderColor: colors.action, backgroundColor: '#eef3ff' },
  footer: { color: colors.quiet, fontSize: 11, lineHeight: 16 },
});
