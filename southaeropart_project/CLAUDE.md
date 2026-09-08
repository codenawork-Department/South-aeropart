# CLAUDE.md — South Aero Performance Platform

> Guidelines, architecture, and commands for Claude and AI coding agents working on the South Aero monorepo.

---

## 1. Project Overview & Architecture

Monorepo สำหรับแพลตฟอร์มอีคอมเมิร์ซร้านขายอะไหล่และชุดแต่งแอโรพาร์ทรถยนต์ (South Aero) จัดการด้วย **Turborepo** และ **pnpm workspaces**

```text
southaeropart_project/
├── apps/
│   ├── storefront/          # Next.js 14 App Router (Port 3000) — แคตตาล็อก 3D, ตะกร้า, สั่งซื้อ, Bundles, Wishlist, i18n
│   └── admin/               # Next.js 14 App Router (Port 3001) — จัดการสินค้า/Bundles, แคตตาล็อก, ออเดอร์, รีวิว, บริการ
├── packages/
│   ├── db/                  # Drizzle ORM + Neon Postgres schema, migrations, db client (createDbClient)
│   ├── ui/                  # Shared UI primitives (shadcn-style, cn utility)
│   ├── lib/                 # Shared helpers: Cloudinary (AI moderation), Stripe SDK, Resend, Moderation
│   └── config/              # Shared configs (ESLint preset, TypeScript base/nextjs)
├── scripts/
│   └── git-hooks/           # Pre-commit hook ป้องกัน secret หลุดเข้า Git
├── turbo.json               # Pipeline configuration
├── pnpm-workspace.yaml      # Workspace definition
└── package.json             # Root scripts and dev dependencies
```

### Key Architectural Decisions
- **Auth Separation:**
  - **Storefront:** `@clerk/nextjs` (Google OAuth) สำหรับลูกค้า บันทึกข้อมูลลงตาราง `users` ผ่าน Webhook (ไม่มี role admin)
  - **Admin:** Self-hosted Auth (`bcryptjs` + `jose` JWT + ตาราง `admin_sessions`) มี RBAC (`staff`, `admin`, `super_admin`), Lockout 5 ครั้ง/15 นาที
- **Rendering & Data Flow:**
  - Next.js App Router เท่านั้น (Default: React Server Components)
  - Mutations ใช้ **Server Actions (`"use server"`)** เท่านั้น
  - Route Handlers (`app/api/**/route.ts`) ใช้เฉพาะ Webhooks (Clerk, Stripe) และ API endpoints (Currency, Realtime, Vehicles, Newsletter)
- **Database & Transactions:** Neon Serverless Postgres ผ่าน Drizzle ORM ทุก multi-table write / stock mutation ต้องครอบด้วย `db.transaction()`
- **Media Delivery:** อัปโหลดผ่าน Cloudinary เท่านั้น (ห้ามเก็บ binary/base64 ใน Postgres) พร้อม AI moderation
- **3D Visualization:** Storefront แสดงผลโมเดล 3D ด้วย Three.js (`@react-three/fiber`, `@react-three/drei`) และ `@google/model-viewer`
- **Stripe Architecture (Exclusive Payment Provider):**
  - **Backend:** ใช้ Stripe SDK จัดการ PaymentIntent บน Server ด้วย `STRIPE_SECRET_KEY`
  - **Frontend:** ใช้ Stripe Elements (`@stripe/react-stripe-js`) โดยรับเฉพาะ `client_secret` จาก Server Action
  - **Methods:** รองรับ Credit/Debit Cards, PromptPay QR, Apple Pay, Google Pay พร้อมระบบ Mock Payment สำหรับ Dev
- **Localization:** รองรับ 2 ภาษา (`th`, `en`) ผ่าน cookie `south_aero_lang` ใน `apps/storefront/i18n`

---

## 2. Tech Stack Matrix

| Layer | Technologies |
|---|---|
| **Monorepo** | Turborepo (`^2.10.12`), pnpm (`9.7.0`) |
| **Framework** | Next.js 14.2 (App Router, Turbopack default), React 18.3, TypeScript 5.5 (`strict: true`) |
| **Database** | Neon Serverless Postgres, Drizzle ORM (`^0.33.0`), Drizzle Kit (`^0.24.0`) |
| **Storefront Auth** | Clerk (`@clerk/nextjs ^5.3.0`), Svix (`^1.24.0` Webhook verification) |
| **Admin Auth** | Self-hosted (bcryptjs 12 rounds, jose HS256 JWT, admin_sessions table, lockout guard) |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React (`^0.441.0`), class-variance-authority, clsx, tailwind-merge |
| **Data Table** | TanStack Table v8 (`@tanstack/react-table ^8.20.0`) (Server-driven pagination & sorting) |
| **3D & Graphics** | Three.js (`^0.169.0`), `@react-three/fiber (^8.18.0)`, `@react-three/drei (^9.122.0)`, `@google/model-viewer (^4.3.1)` |
| **Media & Storage**| Cloudinary (`^2.4.0`), `next-cloudinary (^6.6.0)` (พร้อม AI moderation AWS Rekognition) |
| **Payments** | **Stripe SDK** (`stripe ^22.6.1`), **Stripe Elements** (`@stripe/stripe-js ^9.15.0`, `@stripe/react-stripe-js ^6.9.0`), `qrcode ^1.5.4` |
| **Email & Comms** | Resend API (`resend ^6.25.0`) |
| **Validation** | Zod 3.23 (Validates all Server Actions, Route Handlers, and `env.ts`) |
| **Moderation** | `thai-bad-words` + custom regex list สำหรับข้อความรีวิว |

---

## 3. Essential Commands

### Development
```bash
pnpm dev                            # รันทุกแอปพร้อมกันด้วย Turbopack (Storefront: 3000, Admin: 3001)
pnpm dev:storefront                 # รันเฉพาะ Storefront (http://localhost:3000)
pnpm dev:admin                      # รันเฉพาะ Admin (http://localhost:3001)
pnpm --filter storefront dev:webpack # รัน Storefront ด้วย Webpack (ทางเลือกสำรอง)
pnpm --filter admin dev:webpack     # รัน Admin ด้วย Webpack
```

### Build, Lint & Clean
```bash
pnpm build                          # Turbo build ทุกแอปและแพ็กเกจ
pnpm --filter storefront build      # Build เฉพาะ Storefront
pnpm --filter admin build           # Build เฉพาะ Admin
pnpm lint                           # ตรวจสอบ ESLint ทุกแอป
pnpm clean                          # ล้างแคช .next และ .turbo ทั้งหมด
```

### Database (Drizzle ORM + Neon)
```bash
pnpm db:push                        # ดัน Schema เข้า Neon DB ทันที (โหมด Dev)
pnpm db:generate                    # สร้าง Migration file ลง packages/db/drizzle
pnpm db:migrate                     # รัน Migration ขึ้นฐานข้อมูล Neon
pnpm db:studio                      # เปิด Drizzle Studio GUI (https://local.drizzle.studio)
```

### Verification & Test Scripts
```bash
# E2E Order & Bundle stock guard verification loop:
pnpm verify                         # หรือ pnpm --filter storefront verify

# Stripe payment intent, webhook & idempotency verification loop:
pnpm verify:stripe                  # หรือ pnpm --filter storefront verify:stripe
```

### Git Security Hook
```bash
# เปิดใช้งาน Pre-commit hook บล็อก secret key หลุดเข้า Git:
git config core.hooksPath scripts/git-hooks
```

### Webhook & Public Tunnel
```bash
# Cloudflare Tunnel สำหรับทดสอบ Webhook (Clerk, Stripe):
pnpm tunnel:storefront              # Port 3000
pnpm tunnel:admin                   # Port 3001
cloudflared tunnel --url http://localhost:3000
ssh -o ServerAliveInterval=30 -R 80:localhost:3000 localhost.run
```

### Troubleshooting (Windows PowerShell)
```powershell
# ปิด Process Node.js ทั้งหมดเมื่อเจอปัญหา Port ค้าง:
Get-Process -Name node | Stop-Process -Force
```

---

## 4. Coding Standards & Conventions

1. **Next.js App Router Discipline:**
   - ใช้เฉพาะโครงสร้าง `app/` (ห้ามใช้ `pages/`)
   - ค่าเริ่มต้นเป็น React Server Component (RSC) ใช้ `"use client"` เฉพาะเมื่อจำเป็น
2. **Server Actions for Mutations:**
   - การเขียน แก้ไข ลบข้อมูลต้องผ่าน Server Actions (`"use server"`) เท่านั้น ห้าม query DB จาก Client
   - สั่ง `revalidatePath` หรือ `revalidateTag` เสมอหลัง mutation สำเร็จ
3. **Strict Validation & Types:**
   - `strict: true` ใน `tsconfig.json` ห้ามใช้ `any`
   - Validate input ของ Server Actions และ Route Handlers ด้วย **Zod** ก่อนแตะ DB
   - ใช้ Inferred types จาก Drizzle (`$inferSelect`, `$inferInsert`) ผ่าน `@repo/db`
4. **Monorepo DRY Principle:**
   - ห้าม copy logic ซ้ำระหว่าง apps รวม logic ส่วนกลางไว้ที่ `@repo/db`, `@repo/ui`, `@repo/lib`
5. **Financial & Currency Handling:**
   - ฟิลด์เงินใน DB ต้องเป็น `numeric` และใน TypeScript ต้องเป็น `string` (ป้องกัน IEEE 754 precision loss)
   - การส่งยอดเงินเข้า Stripe ต้องแปลงเป็นหน่วยสตางค์ (Integer) ผ่าน `toSmallestCurrencyUnit()` ห้ามใช้ `parseFloat * 100`
6. **Environment Variables:**
   - ห้ามเรียก `process.env` ใน Client Components และแยก Server-only secrets ให้ชัดเจน
   - ทุกแอปต้อง parse และ validate env ผ่าน `lib/env.ts` ด้วย Zod
7. **Image Handling:**
   - ห้ามเก็บ binary/base64 ใน Postgres เก็บเฉพาะ `publicId` และ `secureUrl` จาก Cloudinary
   - ฝั่ง Frontend แสดงผลด้วย `<CldImage>` หรือ Next.js `<Image>` (จำกัดไม่เกิน 20 รูป/สินค้า)
8. **Admin Data Grid:**
   - หน้าตารางใน Admin ต้องใช้ Server-driven pagination / sorting / filtering ผ่าน URL Search Params
9. **Bundle & Inventory Atomicity:**
   - การสั่งซื้อสินค้าทั้ง Single และ Bundle ต้องตรวจสอบและตัดสต็อกอะไหล่ย่อยทุกชิ้นแบบ atomic ภายใต้ `db.transaction()`

---

## 5. Security & Review Checklist

### Auth & Session
- [ ] **Auth Boundary:** ตาราง `users` (Clerk) กับ `admin_users` (Self-hosted) แยกกันเด็ดขาด ห้ามปะปนหรือแชร์ role column
- [ ] **Admin Auth:** ยืนยันว่า `lib/auth.ts` ใช้ bcrypt ≥12 rounds, SHA-256 token hash + `timingSafeEqual`, lockout 5 ครั้ง/15 นาที
- [ ] **Audit Trail:** ทุก mutating Server Action ใน Admin ต้องเรียก `logAuditEvent()` หลัง mutation สำเร็จ

### Next.js Vulnerability Guards
- [ ] **Server Action Auth Guard:** ⚠️ ทุก Server Action ต้องเรียก `validateSession()` (Admin) หรือ `auth()` (Storefront/Clerk) **บรรทัดแรกของฟังก์ชัน**
- [ ] **RSC Data Leakage:** ห้าม return secret keys, password hashes, session tokens ไปยัง Client Components เด็ดขาด
- [ ] **`bodySizeLimit: 4mb`:** กำหนดไว้ใน `next.config.mjs` ของทั้ง Storefront และ Admin เพื่อป้องกัน abuse upload
- [ ] **Error Leakage ใน Production:** Server Action ต้อง catch error และ return ข้อความทั่วไป ห้ามส่ง stack trace หรือ SQL error สู่ Client

### Stripe & Financial Security Checklist
- [ ] **Secret Isolation:** `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` ต้องอยู่ฝั่ง Server เท่านั้น ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_`
- [ ] **Client Secret Scope:** ฝั่ง Client ได้รับเฉพาะ `client_secret` เพื่อ mount Stripe Elements ห้ามส่ง Secret Key ออกมาเด็ดขาด
- [ ] **Webhook Signature Verification:** ตรวจสอบ signature ด้วย `constructStripeWebhookEvent(rawBody, signature, secret)` โดยใช้ raw body ก่อน parse JSON เสมอ (ใน Route Handler เท่านั้น)
- [ ] **Lifecycle Event Handling:** จัดการ Event สำคัญให้ครบถ้วน:
  - `payment_intent.succeeded`: บันทึกสถานะชำระเงิน ตัดสต็อกสินค้า/bundle และส่งอีเมลยืนยัน
  - `payment_intent.payment_failed`: บันทึก error message และอัปเดตสถานะออเดอร์ให้ถูกต้อง
- [ ] **Idempotency Guard:** ตรวจสอบสถานะ `orders.paymentStatus` หรือ Event ID ซ้ำก่อน fulfill ป้องกัน double fulfillment หรือตัดสต็อกซ้ำซ้อน
- [ ] **Zero Floating-Point Drift:** แปลงยอดเงินเข้า Stripe เป็นจำนวนเต็มหน่วยสตางค์ (Integer) ผ่าน `toSmallestCurrencyUnit()` เท่านั้น
- [ ] **Atomic Fulfillment:** การตัดสต็อกและอัปเดตสถานะออเดอร์เมื่อชำระเงินสำเร็จ ต้องทำภายใน `db.transaction()` เสมอ

### Database & ORM (Drizzle + Neon)
- [ ] **Raw SQL Injection:** `rawSql` ใช้ได้เฉพาะ tagged template literal (`sqlClient\`SELECT ...\``) เท่านั้น ห้าม string concatenation เด็ดขาด
- [ ] **Transaction Safety:** ทุก multi-table write (orders + items + bundle parts, status history) ต้องห่อหุ้มใน `db.transaction()`

### Security Headers & Secrets
- [ ] **Security Headers:** มีครบทั้ง Admin และ Storefront ใน `next.config.mjs` (`Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- [ ] **Content Moderation:** Cloudinary AI moderation (`aws_rek`) สำหรับรูปภาพ + `thai-bad-words` สำหรับข้อความรีวิว (ทำฝั่ง Server ก่อน persist)
- [ ] **Secrets & Pre-commit Hook:** ห้าม commit `.env` / `.env.local` — ติดตั้ง hook ด้วย `git config core.hooksPath scripts/git-hooks`
