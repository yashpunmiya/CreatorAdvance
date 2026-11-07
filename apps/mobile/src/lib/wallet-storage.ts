import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from '@reown/appkit-react-native';
const prefix = 'creatoradvance.wallet.';
export const walletStorage: Storage = {
  async getKeys() {
    return (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
  },
  async getEntries<T>() {
    const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.flatMap(([key, raw]) => {
      if (raw === null) return [];
      try {
        return [[key.slice(prefix.length), JSON.parse(raw) as T] as [string, T]];
      } catch {
        return [];
      }
    });
  },
  async getItem<T>(key: string) {
    const raw = await AsyncStorage.getItem(prefix + key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  async setItem<T>(key: string, value: T) {
    await AsyncStorage.setItem(prefix + key, JSON.stringify(value));
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(prefix + key);
  },
};
