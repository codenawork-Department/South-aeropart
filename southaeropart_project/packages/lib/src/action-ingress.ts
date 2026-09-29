/** Match the browser Origin to the request host before Next handles a Server Action. */
export function isActionOriginAllowed(
  headers: Pick<Headers, "get">,
  requestUrl: string,
): boolean {
  const url = new URL(requestUrl);
  const host = headers.get("host") ?? url.host;
  const forwarded = headers.get("x-forwarded-host");
  // Next uses Forwarded-Host in its own check. An unverified different host must not override Host.
  if (forwarded && forwarded.toLowerCase() !== host.toLowerCase()) return false;
  const origin = headers.get("origin");
  // Preserve the framework's documented missing-Origin behavior; this is not an auth bypass.
  if (!origin) return true;
  try {
    const source = new URL(origin);
    return (
      source.origin === origin &&
      source.origin === `${url.protocol}//${host.toLowerCase()}`
    );
  } catch {
    return false;
  }
}

// React's decoded JSON budget is 1e6 units. A byte cap below that failure boundary
// gives oversized native JSON actions a stable rejection; multipart keeps the 4 MiB cap.
export const ACTION_JSON_MAX_BYTES = 1_000_000;
export const ACTION_MULTIPART_MAX_BYTES = 4 * 1024 * 1024;
export async function inspectActionBody(
  request: Request,
): Promise<null | { status: number; code: string; message: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (request.method !== "POST" || !request.headers.has("next-action"))
    return null;
  const limit = contentType.toLowerCase().startsWith("multipart/form-data")
    ? ACTION_MULTIPART_MAX_BYTES
    : ACTION_JSON_MAX_BYTES;
  const reader = request.clone().body?.getReader();
  if (!reader) return null;
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return null;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        // Tee cancellation may await the other branch; it must not block rejection.
        void reader.cancel().catch(() => {});
        return {
          status: 413,
          code: "PAYLOAD_TOO_LARGE",
          message: "Request too large",
        };
      }
    }
  } catch {
    return { status: 400, code: "BAD_REQUEST", message: "Invalid request" };
  } finally {
    reader.releaseLock();
  }
}
