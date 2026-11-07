import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET?.trim() || "private-documents";
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const remoteStorageUrl = () => process.env.SUPABASE_URL?.trim() && serviceKey()
  ? `${process.env.SUPABASE_URL!.trim().replace(/\/$/, "")}/storage/v1/object`
  : null;

export function privateDocumentKey(walletAddress: string) {
  const owner = createHash("sha256").update(walletAddress.toLowerCase()).digest("hex").slice(0, 20);
  return `${owner}/${randomBytes(24).toString("hex")}.pdf`;
}

export function ownsPrivateDocumentKey(key: string, walletAddress: string) {
  const owner = createHash("sha256").update(walletAddress.toLowerCase()).digest("hex").slice(0, 20);
  return new RegExp(`^${owner}/[a-f\\d]{48}\\.pdf$`, "i").test(key);
}

export async function createPrivateDocumentUploadUrl(key: string) {
  const objectUrl = remoteStorageUrl();
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const keyValue = serviceKey();
  if (!objectUrl || !supabaseUrl || !keyValue) return null;
  const storageRoot = `${supabaseUrl}/storage/v1`;
  const response = await fetch(`${objectUrl}/upload/sign/${encodeURIComponent(bucket())}/${encodedKey(key)}`, {
    method: "POST",
    headers: { apikey: keyValue, Authorization: `Bearer ${keyValue}`, "Content-Type": "application/json", "x-upsert": "false" },
    body: "{}",
  });
  if (!response.ok) throw new Error(`private_document_sign_failed_${response.status}`);
  const result = await response.json() as { url?: unknown; token?: unknown };
  if (typeof result.url !== "string" || typeof result.token !== "string") throw new Error("private_document_sign_response_invalid");
  // Supabase returns paths like `/object/upload/sign/<bucket>/<key>`. Joining
  // that as an absolute URL resets the path to the domain root and drops
  // `/storage/v1`, so append the relative route to the Storage API base.
  const signedUrl = /^https?:\/\//i.test(result.url)
    ? new URL(result.url)
    : new URL(`${storageRoot}/${result.url.replace(/^\/+/, "")}`);
  signedUrl.searchParams.set("token", result.token);
  return signedUrl.toString();
}

function encodedKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function savePrivateDocument(key: string, contents: Uint8Array) {
  const baseUrl = remoteStorageUrl();
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/${encodeURIComponent(bucket())}/${encodedKey(key)}`, {
      method: "POST",
      headers: {
        apikey: serviceKey()!,
        Authorization: `Bearer ${serviceKey()!}`,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      body: new Uint8Array(contents),
    });
    if (!response.ok) throw new Error(`private_document_upload_failed_${response.status}`);
    return;
  }
  const directory = resolve(process.env.PRIVATE_DOCUMENT_DIR ?? ".private-documents");
  const path = resolve(directory, key);
  if (!path.startsWith(`${directory}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("private_document_key_invalid");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, { flag: "wx", mode: 0o600 });
}

export async function loadPrivateDocument(key: string) {
  const baseUrl = remoteStorageUrl();
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/${encodeURIComponent(bucket())}/${encodedKey(key)}`, {
      headers: {
        apikey: serviceKey()!,
        Authorization: `Bearer ${serviceKey()!}`,
      },
    });
    if (!response.ok) throw new Error(`private_document_download_failed_${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const directory = resolve(process.env.PRIVATE_DOCUMENT_DIR ?? ".private-documents");
  const path = resolve(directory, key);
  if (!path.startsWith(`${directory}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("private_document_key_invalid");
  return readFile(path);
}

export async function removePrivateDocument(key: string) {
  const baseUrl = remoteStorageUrl();
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/${encodeURIComponent(bucket())}/${encodedKey(key)}`, {
      method: "DELETE",
      headers: {
        apikey: serviceKey()!,
        Authorization: `Bearer ${serviceKey()!}`,
      },
    });
    if (!response.ok && response.status !== 404) throw new Error(`private_document_delete_failed_${response.status}`);
    return;
  }
  const directory = resolve(process.env.PRIVATE_DOCUMENT_DIR ?? ".private-documents");
  const path = resolve(directory, key);
  if (!path.startsWith(`${directory}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("private_document_key_invalid");
  await unlink(path);
}
