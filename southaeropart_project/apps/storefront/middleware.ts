import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clerk middleware — enable when Clerk keys are configured.
// Protects account, checkout, and wishlist routes; product browsing is public.
//
// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// const isProtectedRoute = createRouteMatcher(["/account(.*)", "/checkout(.*)", "/wishlist(.*)"]);
//
// export default clerkMiddleware((auth, req) => {
//   if (isProtectedRoute(req)) auth().protect();
// });

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
