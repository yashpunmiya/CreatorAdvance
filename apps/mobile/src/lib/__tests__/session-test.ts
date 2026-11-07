import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSession, saveSession, lastWorkspace } from '../session';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

beforeEach(() => jest.clearAllMocks());
test('restores a valid encrypted session', async () => {
  const session = { token: 'test', address: '0x123', expiresAt: new Date(Date.now() + 60_000).toISOString() };
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(session));
  expect(await loadSession()).toEqual(session);
  await saveSession(session);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('creatoradvance.session.v1', JSON.stringify(session));
});
test.each(['invalid json', JSON.stringify({ token: 'test', address: '0x123', expiresAt: '2020-01-01' })])('discards invalid or expired credentials', async raw => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(raw);
  expect(await loadSession()).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
test('restores only recognized workspace preferences', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('INVESTOR');
  expect(await lastWorkspace()).toBe('INVESTOR');
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('SUPERUSER');
  expect(await lastWorkspace()).toBeNull();
});
