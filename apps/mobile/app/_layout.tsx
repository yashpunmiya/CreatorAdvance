import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { WagmiProvider } from 'wagmi';
import { walletRuntime } from '../src/lib/wallet';

export default function RootLayout() {
  if (!walletRuntime) return <Stack screenOptions={{ headerShown: false }} />;

  return (
    <AppKitProvider instance={walletRuntime.appKit}>
      <WagmiProvider config={walletRuntime.wagmiConfig}>
        <QueryClientProvider client={walletRuntime.queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <View style={{ position: 'absolute', height: '100%', width: '100%' }}>
            <AppKit />
          </View>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  );
}
