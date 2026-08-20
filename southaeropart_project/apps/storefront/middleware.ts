import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk middleware for the storefront.
 *
 * Protected routes require sign-in: account, checkout, wishlist.
 * Everything else (products, sign-in, sign-up, webhooks) is public.
 */
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/checkout(.*)",
  "/wishlist(.*)",
  "/profile(.*)",
  "/orders(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
