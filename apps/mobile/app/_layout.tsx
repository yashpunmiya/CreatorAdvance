import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WagmiProvider } from 'wagmi';
import { walletRuntime } from '../src/lib/wallet';

export default function RootLayout() {
  if (!walletRuntime) return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;

  return (
    <SafeAreaProvider>
    <StatusBar style="dark" />
    <AppKitProvider instance={walletRuntime.appKit}>
      <WagmiProvider config={walletRuntime.wagmiConfig}>
        <QueryClientProvider client={walletRuntime.queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <View pointerEvents="box-none" style={{ position: 'absolute', height: '100%', width: '100%' }}>
            <AppKit />
          </View>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
    </SafeAreaProvider>
  );
}
