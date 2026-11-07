import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkspaceRole = 'CREATOR' | 'BRAND' | 'INVESTOR' | 'ADMIN';
export const isWorkspaceRole = (role: unknown): role is WorkspaceRole => ['CREATOR', 'BRAND', 'INVESTOR', 'ADMIN'].includes(String(role));
const key = 'creatoradvance.session.v1';
export type SavedSession = { token: string; address: string; expiresAt: string };
export async function saveSession(session: SavedSession) {
  await SecureStore.setItemAsync(key, JSON.stringify(session));
}
export async function clearSession() { await SecureStore.deleteItemAsync(key); }
export async function loadSession(): Promise<SavedSession | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SavedSession;
    if (typeof value.token !== 'string' || typeof value.address !== 'string' || !(Date.parse(value.expiresAt) > Date.now())) {
      await clearSession(); return null;
    }
    return value;
  } catch { await clearSession(); return null; }
}
export async function rememberWorkspace(role: WorkspaceRole) {
  await AsyncStorage.setItem('creatoradvance.workspace', role);
}
export async function lastWorkspace() {
  const role = await AsyncStorage.getItem('creatoradvance.workspace');
  return isWorkspaceRole(role) ? role : null;
}
