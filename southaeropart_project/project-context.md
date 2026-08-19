# AI Coding Agent — System Context: Auto Parts E-Commerce Platform

## [System Instructions]

You are an AI Coding Agent generating production-grade code for this repository. Follow these directives on every task, without exception:

1. **Framework discipline:** Always use Next.js App Router (`app/` directory). Never generate Pages Router (`pages/`) code.
2. **Rendering strategy:** Default to React Server Components. Only add `"use client"` at the top of a file when the component requires browser APIs, hooks (`useState`, `useEffect`), or event handlers.
3. **Data mutations:** Always use Server Actions (`"use server"`) for writes (create/update/delete). Never call the database from a Client Component. Route Handlers (`app/api/**/route.ts`) are reserved for: webhooks (Omise, Clerk), PDF streaming endpoints, and third-party callback URLs that cannot invoke a Server Action directly.
4. **TypeScript:** `strict: true` is mandatory in every `tsconfig.json`. No `any` types. All Drizzle schemas must export inferred `Select`/`Insert` types and reuse them across the monorepo via `@repo/db`.
5. **Validation:** Every Server Action and Route Handler must validate input with `zod` before touching the database.
6. **Workspace imports:** Never duplicate logic across `apps/storefront` and `apps/admin`. Shared logic belongs in `packages/db`, `packages/ui`, or `packages/lib`, imported via workspace aliases (`@repo/db`, `@repo/ui`, `@repo/lib`).
7. **Money handling:** All currency fields are `numeric` in Postgres and treated as strings in TypeScript. Never use `number`/`float` for prices, totals, or amounts.
8. **No direct `process.env` access** inside `packages/*`. Export a validated, typed config object (via `zod`) from a single `env.ts` per package/app.
9. **Images:** Never store binary/base64 image data in Postgres or pass it through Server Actions as payload. All images go through Cloudinary; only `publicId` + `secureUrl` are persisted.
10. When uncertain about a requirement, prefer the safer, more explicit implementation (explicit types, explicit error handling, explicit loading/error UI states) over a terse one.

---

## [Project Structure]

```text
auto-parts-platform/
├── apps/
│   ├── storefront/
│   │   ├── app/
│   │   │   ├── (shop)/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [slug]/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   └── wishlist/page.tsx
│   │   │   ├── (account)/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── orders/
│   │   │   │       ├── page.tsx
│   │   │   │       └── [orderId]/page.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   │   ├── api/
│   │   │   │   └── webhooks/
│   │   │   │       ├── omise/route.ts
│   │   │   │       └── clerk/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── actions/
│   │   │   ├── cart.actions.ts
│   │   │   ├── checkout.actions.ts
│   │   │   ├── wishlist.actions.ts
│   │   │   └── review.actions.ts
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── env.ts
│   │   ├── middleware.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── admin/
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── page.tsx
│       │   │   ├── products/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   └── [id]/edit/page.tsx
│       │   │   ├── orders/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   └── reviews/page.tsx
│       │   ├── login/page.tsx          # self-hosted login (email/password)
│       │   ├── api/
│       │   │   └── pdf/
│       │   │       ├── receipt/[orderId]/route.ts
│       │   │       └── tax-invoice/[orderId]/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── actions/
│       │   ├── product.actions.ts
│       │   ├── order.actions.ts
│       │   └── review-moderation.actions.ts
│       ├── components/
│       │   └── data-table/
│       ├── lib/
│       │   ├── env.ts
│       │   └── auth.ts                 # self-hosted admin auth (bcryptjs + jose)
│       ├── middleware.ts
│       └── package.json
│
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts             # customer accounts (Clerk ID as PK)
│   │   │   │   ├── admin.ts             # admin_users + admin_sessions + admin_audit_logs
│   │   │   │   ├── products.ts          # categories, brands, products, images, compatibility
│   │   │   │   ├── orders.ts            # orders, order_items, order_status_history
│   │   │   │   ├── reviews.ts
│   │   │   │   ├── user-interests.ts
│   │   │   │   └── index.ts             # relations + re-exports
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/       # shadcn/ui primitives (Button, Dialog, Table...)
│   │   │   ├── lib/utils.ts      # cn() helper
│   │   │   └── index.ts
│   │   ├── components.json
│   │   └── package.json
│   │
│   ├── lib/
│   │   ├── src/
│   │   │   ├── cloudinary.ts
│   │   │   ├── omise.ts
│   │   │   ├── moderation/
│   │   │   │   └── text-moderation.ts
│   │   │   └── pdf/
│   │   │       ├── receipt-template.tsx
│   │   │       └── tax-invoice-template.tsx
│   │   └── package.json
│   │
│   └── config/
│       ├── eslint-preset.js
│       └── typescript/
│           ├── base.json
│           ├── nextjs.json
│           └── package.json
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── project-context.md
```

---

## [Tech Stack Matrix]

| Category | Package(s) | Notes |
|---|---|---|
| Monorepo | `turbo`, `pnpm` | pnpm workspaces + Turborepo task pipeline |
| Framework | `next@^14`, `react@^18`, `react-dom@^18` | App Router only |
| Language | `typescript`, `@types/node`, `@types/react` | `strict: true` |
| Database ORM | `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless` | Neon Postgres, serverless driver |
| Validation | `zod` | All Server Action / Route Handler inputs |
| Auth (Storefront) | `@clerk/nextjs` | Google OAuth via Clerk. User records synced via webhook into `users` table |
| Auth (Admin) | `bcryptjs`, `jose` | Self-hosted email/password + MFA (TOTP). Sessions stored in `admin_sessions` table. Audit trail in `admin_audit_logs` |
| Styling | `tailwindcss`, `postcss`, `autoprefixer` | Shared Tailwind config from `packages/config` |
| UI Components | `shadcn/ui` (CLI-generated, not an npm dep), `class-variance-authority`, `clsx`, `tailwind-merge` | Lives in `packages/ui` |
| Admin Data Grid | `@tanstack/react-table` | Server-driven pagination/sorting |
| Icons | `lucide-react` | — |
| Media Storage | `cloudinary`, `next-cloudinary` | Server-side upload + `<CldImage>` on client |
| Text Moderation | `thai-bad-words` + custom regex list | Applied server-side before persisting reviews |
| Payments | `omise` (official Node SDK) or raw REST via `fetch` with Basic Auth | Server-side only, never exposed to client |
| PDF Generation | `@react-pdf/renderer` | Rendered server-side inside a Route Handler, streamed as `application/pdf` |
| Linting/Formatting | `eslint`, `prettier`, `eslint-config-next` | Shared preset in `packages/config` |

---

## [Database Schema]

> The schema source of truth lives in `packages/db/src/schema/`. The summaries below are for quick reference.

### Architecture Decisions

- **Users vs Admins are fully separated:** `users` = customer accounts (Clerk Google OAuth, text PK = Clerk ID). `admin_users` = back-office accounts (email/password + MFA, UUID PK). No shared role column.
- **Products are normalized:** `brands` and `categories` are separate lookup tables (with slugs). `product_compatibility` is a normalized table replacing the old JSONB `compatibility` column for filterable make/model/year queries.
- **Orders have audit history:** `order_status_history` is an append-only table tracking who changed the status and when. `orders.assignedAdminId` tracks which admin handles the order.
- **Reviews link to admin moderation:** `reviews.moderatedByAdminId` references `admin_users` for the admin who approved/rejected.

### Table Overview

| Table | PK Type | Key Relationships |
|-------|---------|-------------------|
| `users` | `text` (Clerk ID) | → orders, reviews, user_interests |
| `admin_users` | `uuid` | → admin_sessions, admin_audit_logs, orders (assigned), reviews (moderated) |
| `admin_sessions` | `uuid` | → admin_users (FK) |
| `admin_audit_logs` | `uuid` | → admin_users (FK, nullable) |
| `categories` | `uuid` | Self-referencing parent/child hierarchy |
| `brands` | `uuid` | → products |
| `products` | `uuid` | → categories (FK), brands (FK) |
| `product_images` | `uuid` | → products (FK, cascade) |
| `product_compatibility` | `uuid` | → products (FK, cascade) |
| `orders` | `uuid` | → users (FK), admin_users (assigned, FK) |
| `order_items` | `uuid` | → orders (FK, cascade), products (FK) |
| `order_status_history` | `uuid` | → orders (FK, cascade), admin_users (changed_by, FK) |
| `reviews` | `uuid` | → products (FK, cascade), users (FK), admin_users (moderated_by, FK) |
| `user_interests` | `uuid` | → users (FK, cascade), products (FK, cascade) |

---

## [Implementation Rules]

### Rule 1 — Image Handling (Cloudinary only)

- Every image (product photos, review photos) MUST go through Cloudinary. Never persist raw binary or base64 in Postgres.
- Enable Cloudinary's AI moderation add-on (`moderation: "aws_rek"`) on upload. If `result.moderation[0].status === "rejected"`, immediately destroy the asset and reject the request with a clear error.
- Enforce the 20-images-per-product limit in the Server Action **before** calling Cloudinary, not just in the UI.
- Persist only `cloudinaryPublicId` + `secureUrl` in `product_images` / `reviews.imageUrls`.
- Deliver images via `next-cloudinary`'s `<CldImage>` (or `next/image` with a Cloudinary loader) — never a raw `<img>` tag — to get automatic format/quality optimization.

```typescript
// packages/lib/src/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadModeratedImage(fileDataUrl: string, folder: string) {
  const result = await cloudinary.uploader.upload(fileDataUrl, {
    folder,
    moderation: "aws_rek",
    resource_type: "image",
  });

  if (result.moderation?.[0]?.status === "rejected") {
    await cloudinary.uploader.destroy(result.public_id);
    throw new Error("IMAGE_MODERATION_REJECTED");
  }

  return { publicId: result.public_id as string, secureUrl: result.secure_url as string };
}
```

### Rule 2 — Authentication (split architecture)

#### Storefront (Clerk — Google OAuth)
- Uses `@clerk/nextjs` with Google OAuth as the only sign-in method.
- `storefront/middleware.ts`: protect only account/checkout/wishlist routes; product browsing is public.
- Clerk webhook (`/api/webhooks/clerk`) syncs user data into the `users` table on `user.created` / `user.updated` / `user.deleted` events. Webhook payloads are verified via Svix.
- The `users` table has **no role column** — all users are customers. `isBanned` is used for soft-banning.

#### Admin (Self-hosted — email/password + MFA)
- Admin has its own website running locally (port 3001). **Does NOT use Clerk.**
- Uses `bcryptjs` for password hashing and `jose` for JWT session tokens.
- Sessions are stored server-side in `admin_sessions` table. Each session can be individually revoked ("log out of all devices").
- `admin/middleware.ts` (Edge): lightweight JWT signature + expiry check only. Full session validation (DB lookup, `isActive` check) happens in server components via `validateSession()`.
- Brute-force protection: after 5 failed attempts, account is locked for 15 minutes (`failedLoginAttempts` + `lockedUntil`).
- MFA (TOTP) support: `mfaEnabled`, `mfaSecretEncrypted` (AES-encrypted), `mfaRecoveryCodesHash`.
- All sensitive admin actions are logged to the immutable `admin_audit_logs` table.
- Role hierarchy: `staff` < `admin` < `super_admin` (stored in `admin_users.role` as a pgEnum).
```

### Rule 3 — Payments (Omise, server-side only)

- Charge creation happens server-side only (Server Action or Route Handler) using the Omise **secret key** via HTTP Basic Auth (`base64(secretKey:)`). The secret key must never reach the client bundle.
- The `charge.complete` webhook MUST be a Route Handler (`app/api/webhooks/omise/route.ts`) — Server Actions cannot be invoked by an external service.
- Omise does not sign webhook payloads by default. Mitigate by (a) IP-allowlisting Omise's published webhook range at the infra layer, and/or (b) appending a shared secret token as a query parameter on the registered webhook URL and validating it in the handler.
- Track processed webhook event IDs (e.g. in a `webhook_events` table) to guarantee idempotency — Omise may retry delivery.
- On `charge.complete`, update `orders.paymentStatus` and `orders.status` inside a `db.transaction`. Also insert a row into `order_status_history` for audit.

### Rule 4 — Text Content Moderation (Reviews)

- Every review submission runs through `thai-bad-words` plus a supplementary regex blocklist **inside the Server Action**, before insertion.
- If profanity is detected, set `moderationStatus = "rejected"` and store `moderationReason`; do not silently strip words and auto-approve.
- Clean submissions default to `moderationStatus = "pending"` for manual admin approval via the admin dashboard (`/reviews`), not auto-published.

### Rule 5 — General Coding Conventions

- All multi-table writes (order + order items, product + product images) MUST use `db.transaction(async (tx) => { ... })`.
- Admin data grids (`@tanstack/react-table`) MUST use server-driven pagination/sorting/filtering via URL search params — never fetch the entire table client-side.
- PDF generation (`@react-pdf/renderer`) happens in a Route Handler that returns a `Response` with `Content-Type: application/pdf`, streamed — not generated client-side.
- Revalidate cached data with `revalidatePath` / `revalidateTag` after every mutating Server Action.

---

## [Step-by-Step Initialization]

```bash
# 1. Scaffold the Turborepo (pnpm workspace)
npx create-turbo@latest auto-parts-platform --package-manager pnpm
cd auto-parts-platform

# 2. Create the two Next.js apps
npx create-next-app@latest apps/storefront --typescript --tailwind --app --eslint --import-alias "@/*"
npx create-next-app@latest apps/admin --typescript --tailwind --app --eslint --import-alias "@/*"

# 3. Scaffold packages/db
mkdir -p packages/db/src/schema
cd packages/db && pnpm init && cd ../..
pnpm add drizzle-orm @neondatabase/serverless --filter @repo/db
pnpm add -D drizzle-kit --filter @repo/db

# 4. Scaffold packages/ui with shadcn/ui (monorepo-aware CLI)
mkdir -p packages/ui/src/components
cd packages/ui && pnpm init && cd ../..
pnpm dlx shadcn@latest init --cwd packages/ui
pnpm dlx shadcn@latest add button dialog table input form card --cwd packages/ui

# 5. Scaffold packages/lib (Cloudinary / Omise / PDF / moderation helpers)
mkdir -p packages/lib/src
cd packages/lib && pnpm init && cd ../..

# 6. Install Clerk in storefront ONLY (admin uses self-hosted auth)
pnpm add @clerk/nextjs svix --filter storefront

# 6b. Install admin auth dependencies
pnpm add bcryptjs jose --filter admin
pnpm add -D @types/bcryptjs --filter admin

# 7. Install Cloudinary
pnpm add cloudinary next-cloudinary --filter @repo/lib
pnpm add next-cloudinary --filter storefront
pnpm add next-cloudinary --filter admin

# 8. Install payments SDK
pnpm add omise --filter @repo/lib

# 9. Install PDF generation
pnpm add @react-pdf/renderer --filter @repo/lib

# 10. Install admin data-grid + icons + moderation
pnpm add @tanstack/react-table lucide-react --filter admin
pnpm add lucide-react --filter storefront
pnpm add thai-bad-words --filter @repo/lib

# 11. Install shared validation
pnpm add zod --filter storefront --filter admin --filter @repo/db --filter @repo/lib

# 12. Configure Drizzle Kit (packages/db/drizzle.config.ts) then push schema
pnpm --filter @repo/db drizzle-kit push

# 13. Copy env template and fill in secrets
cp .env.example apps/storefront/.env.local
cp .env.example apps/admin/.env.local

# 14. Run dev servers via Turborepo
pnpm turbo run dev
```