import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useAppKit } from '@reown/appkit-react-native';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { erc20BalanceAbi, sponsorUsdt, whitechainSepolia } from '../src/lib/chain';
import { walletRuntime } from '../src/lib/wallet';
import { formatToken } from '../src/lib/format-token';
import { colors, spacing } from '../src/theme';

export default function HomeScreen() {
  if (!walletRuntime) return <WalletSetup />;
  return <WalletDashboard />;
}

function WalletSetup() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Text style={styles.eyebrow}>CREATORADVANCE · TESTNET</Text>
        <Text style={styles.title}>Get paid for work you’ve already done.</Text>
        <Text style={styles.body}>
          Connect a wallet to see live Whitechain Sepolia balances and track invoice financing.
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Wallet connection isn’t configured</Text>
          <Text style={styles.noticeBody}>
            Add your public Reown project ID to apps/mobile/.env.local, then rebuild the Android app.
            No wallet or balance is simulated here.
          </Text>
        </View>
        <Text style={styles.network}>Whitechain Sepolia · Chain 1874 · USDT uses 6 decimals</Text>
      </View>
    </SafeAreaView>
  );
}

function WalletDashboard() {
  const { open, disconnect } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectFocused, setConnectFocused] = useState(false);
  const nativeBalance = useBalance({ address, chainId: whitechainSepolia.id, query: { enabled: Boolean(address) } });
  const tokenBalance = useReadContract({
    address: sponsorUsdt.address,
    abi: erc20BalanceAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: whitechainSepolia.id,
    query: { enabled: Boolean(address && chainId === whitechainSepolia.id) },
  });
  const correctNetwork = chainId === whitechainSepolia.id;

  async function connectWallet() {
    setConnectError(null);
    try {
      await open();
    } catch {
      setConnectError('Could not open the wallet chooser. Check your connection and try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>CREATORADVANCE · TESTNET</Text>
        <Text style={styles.title}>Get paid for work you’ve already done.</Text>
        <Text style={styles.body}>Your invoice financing workspace, backed by live Whitechain data.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>WALLET</Text>
          {isConnected && address ? (
            <>
              <Text style={styles.address}>{`${address.slice(0, 6)}…${address.slice(-4)}`}</Text>
              <Text style={styles.network}>{correctNetwork ? 'Whitechain Sepolia' : `Connected to chain ${chainId ?? 'unknown'}`}</Text>
              {!correctNetwork ? <Text style={styles.error}>Switch your wallet to chain 1874 to read balances.</Text> : null}
            </>
          ) : <Text style={styles.body}>No wallet connected</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isConnected ? 'Disconnect wallet' : 'Connect wallet'}
            onPress={() => isConnected ? disconnect() : void connectWallet()}
            onFocus={() => setConnectFocused(true)}
            onBlur={() => setConnectFocused(false)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed, connectFocused && styles.focused]}
          >
            <Text style={styles.buttonText}>{isConnected ? 'Disconnect' : 'Connect wallet'}</Text>
          </Pressable>
          {connectError ? <Text accessibilityRole="alert" style={styles.error}>{connectError}</Text> : null}
        </View>

        {isConnected && correctNetwork ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>LIVE BALANCES</Text>
            <BalanceRow label="USDT" value={tokenBalance.data} decimals={sponsorUsdt.decimals} displayDecimals={2} loading={tokenBalance.isLoading} error={tokenBalance.isError} retry={() => void tokenBalance.refetch()} />
            <BalanceRow label="WBT · gas" value={nativeBalance.data?.value} decimals={18} displayDecimals={4} loading={nativeBalance.isLoading} error={nativeBalance.isError} retry={() => void nativeBalance.refetch()} />
          </View>
        ) : null}

        <Text style={styles.footer}>Whitechain Sepolia · Chain 1874 · Test tokens have no monetary value.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BalanceRow({ label, value, decimals, displayDecimals, loading, error, retry }: {
  label: string;
  value: bigint | undefined;
  decimals: number;
  displayDecimals: number;
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const [retryFocused, setRetryFocused] = useState(false);
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceLabel}>{label}</Text>
      {loading ? <Text style={styles.balanceValue}>Loading…</Text> : null}
      {!loading && value !== undefined ? <Text style={styles.balanceValue}>{formatToken(value, decimals, displayDecimals)}</Text> : null}
      {!loading && error ? (
        <View style={styles.retryLine}>
          <Text style={styles.error}>Balance unavailable</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry ${label} balance`}
            onPress={retry}
            onFocus={() => setRetryFocused(true)}
            onBlur={() => setRetryFocused(false)}
            style={[styles.retryButton, retryFocused && styles.focused]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, padding: spacing.page, paddingTop: 36, gap: spacing.section },
  eyebrow: { color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '700', lineHeight: 40, maxWidth: 380 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.card, gap: 14 },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  address: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  network: { color: colors.muted, fontSize: 14 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  focused: { borderWidth: 3, borderColor: colors.muted },
  notice: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.card, gap: 8, marginTop: 8 },
  noticeTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  noticeBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
  balanceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  balanceLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  balanceValue: { color: colors.ink, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  retryLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.control },
  retryText: { color: colors.action, fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  footer: { color: colors.quiet, fontSize: 12, lineHeight: 18, marginTop: 'auto' },
});
