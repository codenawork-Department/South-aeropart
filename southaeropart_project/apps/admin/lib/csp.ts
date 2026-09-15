import { NextRequest, NextResponse } from "next/server";

export function securedNextResponse(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'"} https://res.cloudinary.com https://upload-widget.cloudinary.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://res.cloudinary.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
    "frame-src 'self' https://upload-widget.cloudinary.com",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
