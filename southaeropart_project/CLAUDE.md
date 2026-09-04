# CLAUDE.md — South Aero Performance Platform

> Guidelines, architecture, and commands for Claude and AI coding agents working on the South Aero monorepo.

---

## 1. Project Overview & Architecture

Monorepo สำหรับแพลตฟอร์มอีคอมเมิร์ซร้านขายอะไหล่และชุดแต่งแอโรพาร์ทรถยนต์ (South Aero) จัดการด้วย **Turborepo** และ **pnpm workspaces**

```text
southaeropart_project/
├── apps/
│   ├── storefront/          # Next.js 14 App Router (Port 3000) — หน้าร้าน, แคตตาล็อก 3D, ตะกร้า, สั่งซื้อ
│   └── admin/               # Next.js 14 App Router (Port 3001) — ระบบหลังบ้าน, จัดการสินค้า, ออเดอร์, รีวิว
├── packages/
│   ├── db/                  # Drizzle ORM + Neon Postgres schema, migrations, db client
│   ├── ui/                  # Shared UI primitives (shadcn-style, cn utility)
│   ├── lib/                 # Shared helpers: Cloudinary (AI moderation), Omise, Resend, Moderation
│   └── config/              # Shared configs (ESLint preset, TypeScript base/nextjs)
├── turbo.json               # Pipeline configuration (build, lint, dev)
├── pnpm-workspace.yaml      # Workspace definition
└── package.json             # Root scripts and dev dependencies
```

### Key Architectural Decisions
- **Auth Separation:** แยก Auth ชัดเจน 100%
  - **Storefront:** ใช้ `@clerk/nextjs` (Google OAuth) สำหรับลูกค้า บันทึกข้อมูลลงตาราง `users` ผ่าน Webhook ไม่มี role admin
  - **Admin:** ใช้ Self-hosted Auth (`bcryptjs` + `jose` JWT + ตาราง `admin_sessions`) มี RBAC (`staff`, `admin`, `super_admin`), MFA-ready, ล็อกบัญชีเมื่อผิดเกิน 5 ครั้ง
- **Rendering & Data Flow:**
  - Next.js App Router เท่านั้น (ห้ามใช้ Pages Router)
  - React Server Components (RSC) เป็นค่าเริ่มต้น ใส่ `"use client"` เฉพาะเมื่อต้องใช้ State/Browser APIs
  - การเขียน/แก้ไขข้อมูล (Mutations) ใช้ **Server Actions (`"use server"`)** เท่านั้น
  - Route Handlers (`app/api/**/route.ts`) จำกัดเฉพาะ Webhooks (Clerk, Omise) และ Streaming Endpoints (PDF)
- **Database & Transactions:** Neon Postgres ผ่าน HTTP serverless driver (`drizzle-orm/neon-http`), ทุก multi-table write ต้องครอบด้วย `db.transaction()`
- **Media Delivery:** รูปภาพทั้งหมดต้องอัปโหลดผ่าน Cloudinary (ห้ามเก็บ binary/base64 ลง Postgres)
- **3D Visualization:** Storefront รองรับการแสดงผลโมเดล 3D แอโรพาร์ทด้วย `@google/model-viewer` และ Three.js (`@react-three/fiber`)

---

## 2. Tech Stack Matrix

| Layer | Technologies |
|---|---|
| **Monorepo** | Turborepo (`^2.10.12`), pnpm (`9.7.0`) |
| **Framework** | Next.js 14.2 (App Router), React 18.3, TypeScript 5.5 (`strict: true`) |
| **Database** | Neon Serverless Postgres, Drizzle ORM (`^0.33.0`), Drizzle Kit (`^0.24.0`) |
| **Storefront Auth** | Clerk (`@clerk/nextjs ^5.3.0`), Svix (Webhook verification) |
| **Admin Auth** | Self-hosted (bcryptjs 12 rounds, jose HS256 JWT, admin_sessions table) |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React, class-variance-authority, clsx, tailwind-merge |
| **Data Table** | TanStack Table v8 (Server-driven pagination & sorting) |
| **3D & Graphics** | Three.js, `@react-three/fiber`, `@react-three/drei`, `@google/model-viewer` |
| **Media & Storage**| Cloudinary, `next-cloudinary` (พร้อม AI moderation AWS Rekognition) |
| **Payments** | Omise API (Server-side fetch / SDK + Webhook) |
| **Email & Comms** | Resend API (`resend ^6.25.0`) |
| **Validation** | Zod 3.23 (Validates all Server Actions, Route Handlers, and `env.ts`) |

---

## 3. Essential Commands

### Development
```bash
pnpm dev                            # รันทุกแอปพร้อมกัน (Storefront: 3000, Admin: 3001)
pnpm --filter storefront dev        # รันเฉพาะ Storefront (http://localhost:3000)
pnpm --filter admin dev             # รันเฉพาะ Admin (http://localhost:3001)
```

### Build & Lint
```bash
pnpm build                          # Turbo build ทุกแอปและแพ็กเกจ
pnpm --filter storefront build      # Build เฉพาะ Storefront
pnpm --filter admin build           # Build เฉพาะ Admin
pnpm lint                           # ตรวจสอบ ESLint ทุกแอป
pnpm --filter storefront lint       # Lint เฉพาะ Storefront
pnpm --filter admin lint            # Lint เฉพาะ Admin
```

### Testing
> ⚠️ **หมายเหตุ:** ปัจจุบันโปรเจกต์ยังไม่ได้เซ็ตอัป automated test runner (ไม่มี script `test` ใน `package.json`) หากต้องการเพิ่ม unit/integration test ให้ใช้ **Vitest** สำหรับ packages และ **Playwright** สำหรับ E2E

### Database (Drizzle ORM + Neon)
```bash
pnpm db:push                        # ดัน Schema เข้า Neon DB ทันที (โหมด Dev)
pnpm db:generate                    # สร้าง Migration file ลง packages/db/drizzle
pnpm db:migrate                     # รัน Migration ขึ้นฐานข้อมูล Neon
pnpm db:studio                      # เปิด Drizzle Studio GUI (https://local.drizzle.studio)
```

### Webhook & Public Tunnel
```bash
# ใช้ Cloudflare Tunnel (มาตรฐานหลักของโปรเจกต์: ทะลุ Firewall, ได้ HTTPS สำหรับ Webhook & Mobile test):
pnpm tunnel:storefront          # สำหรับ Storefront (Port 3000)
pnpm tunnel:admin               # สำหรับ Admin (Port 3001)

# หรือรันคำสั่ง cloudflared ตรงๆ:
cloudflared tunnel --url http://localhost:3000

# ทางเลือกสำรองผ่าน SSH (localhost.run):
ssh -o ServerAliveInterval=30 -R 80:localhost:3000 localhost.run
```

### Troubleshooting (Windows PowerShell)
```powershell
# ปิด Process Node.js ทั้งหมดเมื่อเจอปัญหา Port 3000/3001 ค้าง:
Get-Process -Name node | Stop-Process -Force
```

---

## 4. Coding Standards & Conventions

1. **Next.js App Router Discipline:**
   - ใช้เฉพาะโครงสร้าง `app/` ห้ามสร้างหรือใช้ Pages Router (`pages/`)
   - Default เป็น React Server Component (RSC) เพิ่ม `"use client"` เมื่อจำเป็นจริงๆ เท่านั้น
2. **Server Actions for Mutations:**
   - การเขียน แก้ไข ลบข้อมูลต้องทำผ่าน Server Actions (`"use server"`) เท่านั้น
   - ห้าม query หรือ mutate ฐานข้อมูลจาก Client Components โดยตรง
   - สั่ง `revalidatePath` หรือ `revalidateTag` เสมอหลัง mutate ข้อมูลสำเร็จ
3. **Strict Validation & Types:**
   - `strict: true` ใน `tsconfig.json` ห้ามใช้ `any`
   - Validate input ของ Server Actions และ Route Handlers ด้วย **Zod** ทุกครั้งก่อนเรียกใช้ฐานข้อมูล
   - ใช้ inferred type จาก Drizzle (`$inferSelect`, `$inferInsert`) จาก `@repo/db`
4. **Monorepo DRY Principle:**
   - ห้าม copy logic ซ้ำระหว่าง `apps/storefront` และ `apps/admin`
   - Logic ส่วนกลางต้องอยู่ใน `packages/db`, `packages/ui`, หรือ `packages/lib` แล้ว import ผ่าน `@repo/*`
5. **Financial & Currency Handling:**
   - ฟิลด์จำนวนเงินทั้งหมดในฐานข้อมูลต้องเป็น `numeric`
   - ในฝั่ง TypeScript ต้องจัดการเป็น `string` ห้ามใช้ JavaScript `number`/`float` ในการคำนวณเงิน เพื่อป้องกันปัญหา IEEE 754 precision
6. **Environment Variables:**
   - ห้ามเรียก `process.env` โดยตรงใน `packages/*`
   - ทุกแอปต้อง parse และ validate env ผ่าน `lib/env.ts` ด้วย Zod
7. **Image Handling:**
   - ห้ามเก็บ binary/base64 ใน Postgres เด็ดขาด เก็บเฉพาะ `publicId` และ `secureUrl` จาก Cloudinary
   - ฝั่ง Frontend ให้แสดงผลรูปด้วย `<CldImage>` หรือ Next.js `<Image>` พร้อม Cloudinary loader
   - จำกัดจำนวนรูปไม่เกิน 20 รูปต่อสินค้า
8. **Admin Data Grid:**
   - หน้าตารางใน Admin ต้องใช้ Server-driven pagination / sorting / filtering ผ่าน URL Search Params (ห้ามดึงข้อมูลทั้งหมดมา paginate บน Client)

---

## 5. Security & Review Checklist

### Auth & Session

- [ ] **Auth Boundary:** ตาราง `users` (Clerk) กับ `admin_users` (Self-hosted) แยกกันเด็ดขาด ห้ามปะปนหรือแชร์ role column
- [ ] **Admin Auth:** ยืนยันว่า `lib/auth.ts` ยังคงใช้ bcrypt ≥12 rounds, SHA-256 token hash + `timingSafeEqual`, lockout 5 ครั้ง/15 นาที — หากแก้ไขไฟล์นี้ให้ตรวจซ้ำทุกครั้ง
- [ ] **Audit Trail:** ทุก mutating Server Action ใน Admin ต้องเรียก `logAuditEvent()` หลังจาก mutation สำเร็จ

### Next.js — ช่องโหว่ที่มักพลาด

- [ ] **Server Action Auth Guard:** ⚠️ ทุก Server Action ที่แก้ไขข้อมูลต้องเรียก `validateSession()` (Admin) หรือ `auth()` (Storefront/Clerk) **บรรทัดแรกของฟังก์ชัน** ก่อน query/mutate — Middleware ป้องกันเฉพาะ route-level แต่ไม่ป้องกัน direct POST ไปที่ Server Action endpoint
- [ ] **RSC Data Leakage:** ห้าม return ข้อมูลลับ (secret keys, password hashes, session tokens, internal IDs ที่ไม่ควรเปิดเผย) จาก Server Component ไปยัง Client Component เพราะ Next.js จะ serialize ลง RSC payload ที่ Client อ่านได้
- [ ] **`bodySizeLimit: 25mb`:** ค่านี้สูงมาก (ตั้งไว้ทั้ง Storefront และ Admin) — เปิดช่องให้ abuse upload ขนาดใหญ่ หากไม่จำเป็นต้อง upload ไฟล์ใหญ่ผ่าน Server Action ให้ลดลง หรือเพิ่ม rate-limit
- [ ] **Error Leakage ใน Production:** Server Action ต้อง catch error แล้ว return ข้อความทั่วไป (`"เกิดข้อผิดพลาด"`) ห้ามส่ง stack trace หรือ SQL error message กลับไปหา Client

### Payment & Webhook

- [ ] **Omise Secret Server-Only:** `OMISE_SECRET_KEY` ต้องไม่ขึ้นต้นด้วย `NEXT_PUBLIC_` เด็ดขาด — ตรวจ `.env` และ `env.ts` ทุกครั้งที่เพิ่ม env ใหม่
- [ ] **Webhook Verification:** Clerk → Svix (`CLERK_WEBHOOK_SECRET`), Omise → Token/IP allowlist — ทั้งคู่ต้องอยู่ใน Route Handler ไม่ใช่ Server Action และต้องตรวจ signature ก่อน parse body
- [ ] **Idempotency:** Omise อาจ retry webhook — ต้องมีกลไกเช็ค event ID ซ้ำก่อนอัปเดต `orders.paymentStatus`

### Database & ORM (Drizzle + Neon)

- [ ] **Raw SQL Injection:** `rawSql` (Neon tagged template) ถูก export จาก `@repo/db` — ใช้ได้เฉพาะ tagged template literal (`sqlClient\`SELECT ...\``) เท่านั้น ห้าม string concatenation (`sqlClient("SELECT " + userInput)`) เด็ดขาด
- [ ] **`process.env` ใน packages:** `packages/db/src/client.ts`, `packages/lib/src/cloudinary.ts`, `packages/lib/src/omise.ts` ยังอ่าน `process.env` โดยตรง (ขัด rule #8 ใน project-context) — ยอมรับได้ชั่วคราว แต่ต้องระวังเมื่อ refactor

### Security Headers & Secrets

- [ ] **Security Headers (Admin):** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` มีครบใน `admin/next.config.mjs` — แต่ยังขาด `Content-Security-Policy` (CSP) ซึ่งควรเพิ่มเพื่อป้องกัน XSS injection
- [ ] **Security Headers (Storefront):** ⚠️ ยังไม่มี custom security headers ใน `storefront/next.config.mjs` — ต้องเพิ่มให้เท่ากับ Admin
- [ ] **Content Moderation:** Cloudinary AI moderation (`aws_rek`) สำหรับรูปภาพ + `thai-bad-words` สำหรับข้อความรีวิว — ทั้งสองต้องทำฝั่ง Server ก่อน persist
- [ ] **Secrets:** ห้าม commit `.env` / `.env.local` — ตรวจ `.gitignore` เป็นระยะ
