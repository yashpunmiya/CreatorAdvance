const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const appOrigin = (process.env.EXPO_PUBLIC_APP_ORIGIN ?? apiUrl).replace(/\/$/, '');
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiRequest<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    signal: init.signal ?? controller.signal,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() as T & { error?: string } : undefined;
  if (!response.ok) throw new ApiError(response.status, data?.error ?? `Request failed (${response.status})`);
  return data as T;
  } finally { clearTimeout(timeout); }
}

export function apiBaseUrl() { return apiUrl; }
export function siweOrigin() { return appOrigin; }
