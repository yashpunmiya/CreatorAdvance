import { afterEach, describe, expect, it, vi } from "vitest";
import { createPrivateDocumentUploadUrl } from "./private-documents.js";

describe("private document signed uploads", () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  });

  it("keeps the storage API base path when resolving Supabase's relative signed URL", async () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      url: "/object/upload/sign/private-documents/wallet/file.pdf",
      token: "test-signature",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const signedUrl = await createPrivateDocumentUploadUrl("wallet/file.pdf");
    expect(signedUrl).not.toBeNull();
    const parsed = new URL(signedUrl!);
    expect(parsed.pathname).toBe("/storage/v1/object/upload/sign/private-documents/wallet/file.pdf");
    expect(parsed.searchParams.get("token")).toBe("test-signature");
  });
});
