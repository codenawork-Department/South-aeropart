import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Admin middleware — protects all routes except /login.
 *
 * Because Edge Middleware cannot access the database directly,
 * we only verify the JWT signature & expiry here. Full session
 * validation (DB lookup, active check) happens in `validateSession()`
 * inside server components / server actions.
 */

const PUBLIC_PATHS = ["/login"];

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return new Uint8Array(0);
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get("admin_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify JWT signature + expiry (lightweight Edge check)
  try {
    const secret = getSessionSecret();
    if (secret.length === 0) {
      // Secret not configured — reject
      return NextResponse.redirect(new URL("/login", request.url));
    }
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Token invalid or expired — redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("admin_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
