import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useAppKit } from '@reown/appkit-react-native';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccount, useBalance, useReadContract, useSignMessage } from 'wagmi';
import { apiRequest } from '../src/lib/api';
import { erc20BalanceAbi, sponsorUsdt, whitechainSepolia } from '../src/lib/chain';
import { formatToken } from '../src/lib/format-token';
import { walletRuntime } from '../src/lib/wallet';
import { colors, spacing } from '../src/theme';

type Brand = { id: string; publicName: string; status?: string; chainBrandId?: string };
type Invoice = { id: string; faceValue: string; dueDate: string; listingExpiry?: string; status: string; brandId?: string };
type SessionUser = { walletAddress: string; roles: { role: string }[] };

export default function HomeScreen() {
  return walletRuntime ? <Workspace /> : <WalletSetup />;
}

function Workspace() {
  const { open, disconnect } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string>();
  const [sessionAddress, setSessionAddress] = useState<string>();
  const [user, setUser] = useState<SessionUser>();
  const [role, setRole] = useState<'CREATOR' | 'BRAND' | 'INVESTOR'>('CREATOR');
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
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [deliveryHash, setDeliveryHash] = useState('');
  const [campaignHash, setCampaignHash] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<{ uri: string; size?: number; name: string }>();
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>();
  const sessionToken = address?.toLowerCase() === sessionAddress?.toLowerCase() ? token : undefined;
  const nativeBalance = useBalance({ address, chainId: whitechainSepolia.id, query: { enabled: Boolean(address) } });
  const tokenBalance = useReadContract({ address: sponsorUsdt.address, abi: erc20BalanceAbi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: whitechainSepolia.id, query: { enabled: Boolean(address && chainId === whitechainSepolia.id) } });

  async function act(task: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message.replaceAll('_', ' ') : 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  }

  async function signIn() {
    if (!address || chainId !== 1874) throw new Error('Switch the connected wallet to Whitechain Sepolia (1874) first.');
    const { nonce } = await apiRequest<{ nonce: string }>('/auth/nonce', undefined, { method: 'POST', body: JSON.stringify({ address }) });
    const issuedAt = new Date().toISOString();
    const message = `localhost:8081 wants you to sign in with your Ethereum account:\n${address}\n\nSign in to CreatorAdvance. This request will not trigger a blockchain transaction.\n\nURI: http://localhost:8081\nVersion: 1\nChain ID: 1874\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
    const signature = await signMessageAsync({ message });
    const session = await apiRequest<{ token: string; user: SessionUser }>('/auth/verify', undefined, { method: 'POST', body: JSON.stringify({ message, signature }) });
    setToken(session.token); setSessionAddress(address); setUser(session.user);
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
    } else {
      const [invoiceResult] = await Promise.all([
        apiRequest<{ invoices: Invoice[] }>('/investor/invoices', sessionToken),
        apiRequest('/investor/offers', sessionToken),
      ]);
      setInvoices(invoiceResult.invoices); setBrands([]);
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
    await apiRequest('/brands', sessionToken, { method: 'POST', body: JSON.stringify({ legalName, publicName, website: brandWebsite, countryCode: brandCountry }) });
    await refreshWorkspace(); setMessage('Brand application submitted for review. It is not active or financeable until approved and registered onchain.');
  }

  async function submitInvoice() {
    if (!sessionToken || !selectedBrandId) throw new Error('Search for and select an active brand before submitting an invoice.');
    if (!evidenceFile) throw new Error('Select the payable PDF evidence first.');
    if (!/^\d+$/.test(faceValue) || BigInt(faceValue) <= 0n) throw new Error('Enter face value as a positive integer in USDT micro-units (6 decimals).');
    if (!/^[\da-f]{64}$/i.test(deliveryHash) || !/^[\da-f]{64}$/i.test(campaignHash)) throw new Error('Enter the SHA-256 delivery and campaign evidence hashes.');
    if (evidenceFile.size && evidenceFile.size > 8 * 1024 * 1024) throw new Error('PDF must be 8 MB or smaller.');
    const evidenceBase64 = await new File(evidenceFile.uri).base64();
    const dueDate = new Date(Date.now() + 60 * 24 * 60 * 60_000);
    const listingExpiry = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    await apiRequest('/creator/invoices', sessionToken, { method: 'POST', body: JSON.stringify({
      brandId: selectedBrandId, invoiceNumber, faceValue,
      dueDate: dueDate.toISOString(), listingExpiry: listingExpiry.toISOString(), evidenceBase64,
      deliverySha256: deliveryHash, campaignSha256: campaignHash,
    }) });
    await refreshWorkspace();
    setMessage('Invoice submitted for the brand to review.');
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
      <View style={styles.roleRow}>{(['CREATOR', 'BRAND', 'INVESTOR'] as const).map((item) => <Pressable key={item} onPress={() => { setRole(item); setInvoices([]); setBrands([]); }} style={[styles.role, role === item && styles.roleActive]}><Text style={[styles.roleText, role === item && styles.roleTextActive]}>{item}</Text></Pressable>)}</View>
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
          {invoices.map((invoice) => <Text key={invoice.id} style={styles.rowText}>Invoice · {invoice.status} · {invoice.faceValue} USDT micro-units</Text>)}
          <Text style={styles.muted}>Invoices become financeable only after brand approval and a finalized contract event.</Text>
        </> : null}
        {role === 'BRAND' ? <>
          <Input label="Registered legal name" value={legalName} onChangeText={setLegalName} />
          <Input label="Public brand name" value={publicName} onChangeText={setPublicName} />
          <Input label="Country code" value={brandCountry} onChangeText={setBrandCountry} />
          <Input label="Website (optional)" value={brandWebsite} onChangeText={setBrandWebsite} />
          <Button title="Submit brand application" onPress={() => void act(submitBrand)} disabled={busy} />
          <Button title="Refresh applications & invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {brands.map((brand) => <Text key={brand.id} style={styles.rowText}>{brand.publicName} · {brand.status ?? 'PENDING'}</Text>)}
          {invoices.map((invoice) => <Text key={invoice.id} style={styles.rowText}>Invoice · {invoice.status} · {invoice.id}</Text>)}
          <Text style={styles.muted}>Contract registration and invoice approval require a deployed, configured contract and signer action.</Text>
        </> : null}
        {role === 'INVESTOR' ? <>
          {!user?.roles.some((binding) => binding.role === 'INVESTOR') ? <Button title="Enable investor workspace" onPress={() => void act(() => enrollRole('INVESTOR'))} disabled={busy} /> : null}
          <Button title="Refresh financeable invoices" onPress={() => void act(refreshWorkspace)} disabled={busy} />
          {invoices.map((invoice) => <Text key={invoice.id} style={styles.rowText}>Invoice · {invoice.status} · {invoice.faceValue} USDT micro-units</Text>)}
          <Text style={styles.muted}>Offer submission and funding are unavailable until the contract is deployed and allowlisting is configured.</Text>
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
  inputGroup: { gap: 5 }, input: { minHeight: 44, paddingHorizontal: 11, borderColor: colors.border, borderWidth: 1, borderRadius: 9, color: colors.ink, fontSize: 15 },
  brandOption: { borderColor: colors.border, borderWidth: 1, borderRadius: 9, padding: 10 }, brandOptionSelected: { borderColor: colors.action, backgroundColor: '#eef3ff' },
  footer: { color: colors.quiet, fontSize: 11, lineHeight: 16 },
});
