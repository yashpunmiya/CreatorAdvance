import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletStorage } from '../wallet-storage';
jest.mock('@react-native-async-storage/async-storage', () => ({ getAllKeys: jest.fn(), multiGet: jest.fn(), removeItem: jest.fn(), setItem: jest.fn(), getItem: jest.fn() }));
test('wallet enumeration cannot expose app preferences or transactions', async () => {
  jest.mocked(AsyncStorage.getAllKeys).mockResolvedValue(['creatoradvance.workspace', 'creatoradvance:pending:1874:wallet', 'creatoradvance.wallet.connection']);
  expect(await walletStorage.getKeys()).toEqual(['connection']);
});
test('wallet removal is confined to its namespace', async () => {
  await walletStorage.removeItem('creatoradvance.workspace');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('creatoradvance.wallet.creatoradvance.workspace');
});
