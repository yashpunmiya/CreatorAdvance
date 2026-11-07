import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { apiRequest } from './api';

type UploadPurpose = 'brand-registration' | 'invoice-evidence' | 'delivery-proof' | 'campaign-brief';
type DocumentAsset = { uri: string; size?: number | null };
type UploadReservation = {
  mode: 'signed' | 'inline';
  objectKey?: string;
  uploadUrl?: string;
  maxBytes: number;
};

export async function uploadPrivatePdf(purpose: UploadPurpose, asset: DocumentAsset, sessionToken: string) {
  const reservation = await apiRequest<UploadReservation>('/documents/upload-url', sessionToken, {
    method: 'POST', body: JSON.stringify({ purpose }),
  });
  if (asset.size && asset.size > reservation.maxBytes) {
    throw new Error(`PDF must be ${reservation.maxBytes > 2 * 1024 * 1024 ? '8 MB' : '2 MB'} or smaller for this upload path.`);
  }

  const file = new File(asset.uri);
  const actualSize = asset.size ?? file.size;
  if (actualSize > reservation.maxBytes) {
    throw new Error(`PDF must be ${reservation.maxBytes > 2 * 1024 * 1024 ? '8 MB' : '2 MB'} or smaller for this upload path.`);
  }
  if (reservation.mode === 'signed') {
    if (!reservation.objectKey || !reservation.uploadUrl) throw new Error('The secure upload reservation is incomplete.');
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    const response = await expoFetch(reservation.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'x-upsert': 'false',
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
      body: file,
    });
    if (!response.ok) {
      const detail = (await response.text()).replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
      throw new Error(`Secure PDF upload failed (${response.status})${detail ? `: ${detail}` : '.'}`);
    }
    return { documentKey: reservation.objectKey };
  }

  return { documentBase64: await file.base64() };
}
