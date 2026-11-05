import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppKit, type Storage } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';
import { QueryClient } from '@tanstack/react-query';
import { whitechainSepolia } from './chain';

const projectId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID?.trim() ?? '';

const storage: Storage = {
  async getKeys() {
    return [...await AsyncStorage.getAllKeys()];
  },
  async getEntries<T>() {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.flatMap(([key, raw]) => {
      if (raw === null) return [];
      try {
        return [[key, JSON.parse(raw) as T] as [string, T]];
      } catch {
        return [];
      }
    });
  },
  async getItem<T>(key: string) {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  async setItem<T>(key: string, value: T) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
};

export const walletRuntime = projectId
  ? (() => {
      const networks: [typeof whitechainSepolia] = [whitechainSepolia];
      const adapter = new WagmiAdapter({
        projectId,
        networks,
      });
      const appKit = createAppKit({
        projectId,
        networks,
        defaultNetwork: whitechainSepolia,
        adapters: [adapter],
        features: { swaps: false, onramp: false, socials: false },
        storage,
        metadata: {
          name: 'CreatorAdvance',
          description: 'Creator invoice financing on Whitechain Sepolia',
          url: 'http://localhost',
          icons: [],
          redirect: { native: 'creatoradvance://' },
        },
      });
      const queryClient = new QueryClient();
      return { adapter, appKit, queryClient, wagmiConfig: adapter.wagmiConfig };
    })()
  : null;
