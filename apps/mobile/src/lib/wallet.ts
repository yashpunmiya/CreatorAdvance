import { walletStorage } from './wallet-storage';
import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';

import { createAppKit } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';
import { QueryClient } from '@tanstack/react-query';
import { whitechainSepolia } from './chain';

const projectId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID?.trim() ?? '';
const appOrigin = (
  process.env.EXPO_PUBLIC_APP_ORIGIN?.trim()
  ?? process.env.EXPO_PUBLIC_API_URL?.trim()
  ?? 'https://creatoradvance-api.vercel.app'
).replace(/\/$/, '');


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
        storage: walletStorage,
        metadata: {
          name: 'CreatorAdvance',
          description: 'Creator invoice financing on Whitechain Sepolia',
          url: appOrigin,
          icons: [],
          redirect: { native: 'creatoradvance://' },
        },
      });
      const queryClient = new QueryClient();
      return { adapter, appKit, queryClient, wagmiConfig: adapter.wagmiConfig };
    })()
  : null;
