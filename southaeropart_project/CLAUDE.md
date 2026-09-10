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
  - Mutations จาก UI ใช้ **Server Actions (`"use server"`)**; Webhooks/API ที่ระบุไว้ใช้ Route Handlers โดยต้องตรวจสิทธิ์หรือยืนยันผู้ส่งตามประเภท endpoint
  - Route Handlers (`app/api/**/route.ts`) ใช้เฉพาะ Webhooks (Clerk, Stripe) และ API endpoints (Currency, Realtime, Vehicles, Newsletter)
- **Database & Transactions:** Neon Serverless Postgres ผ่าน Drizzle ORM ทุก multi-table write / stock mutation ต้องครอบด้วย `db.transaction()`
- **Media Delivery:** อัปโหลดผ่าน Cloudinary เท่านั้น (ห้ามเก็บ binary/base64 ใน Postgres); รูปภาพใช้ AI moderation ส่วน 3D/ชนิดไฟล์อื่นใช้ validation ตาม §5.5
- **3D Visualization:** Storefront แสดงผลโมเดล 3D ด้วย Three.js (`@react-three/fiber`, `@react-three/drei`) และ `@google/model-viewer`
- **Stripe Architecture (Exclusive Payment Provider):**
  - **Backend:** ใช้ Stripe SDK จัดการ PaymentIntent บน Server ด้วย `STRIPE_SECRET_KEY`
  - **Frontend:** ใช้ Stripe Elements (`@stripe/react-stripe-js`) โดยรับเฉพาะ `client_secret` จาก Server Action
  - **Methods:** รองรับ Credit/Debit Cards, PromptPay QR, Apple Pay, Google Pay พร้อมระบบ Mock Payment สำหรับ Dev
- **Localization:** รองรับ 2 ภาษา (`th`, `en`) ผ่าน cookie `south_aero_lang` ใน `apps/storefront/i18n`

---

## 2. Tech Stack Matrix

ตารางนี้อธิบาย stack ใน repository ไม่ใช่รายการเวอร์ชันที่อนุมัติให้ deploy ต้องตรวจ resolved versions ใน `pnpm-lock.yaml` และสถานะการสนับสนุนตาม §6 ก่อน release

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

**ก่อนรัน:** อ่าน script และตรวจ effective environment โดยไม่แสดง secrets; scripts ปัจจุบันโหลด `../../.env`, แก้สินค้า/สต็อก และอาจเรียก Stripe/ส่งอีเมล ต้องใช้ฐานข้อมูลทดสอบแยก, fixtures ของการทดสอบ, Stripe test account และ email sink เท่านั้น ห้ามรันกับ production หรือ environment ที่ยังยืนยันไม่ได้ ดูเงื่อนไข §6.2

```bash
# Order & Bundle verification — รันได้เมื่อผ่านเงื่อนไข test isolation แล้ว:
pnpm verify                         # หรือ pnpm --filter storefront verify

# Stripe verification — ต้องเป็น test mode และผ่านเงื่อนไข test isolation:
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
   - การเขียน แก้ไข ลบข้อมูลจาก UI ต้องผ่าน Server Actions (`"use server"`); Webhooks/API ใช้ Route Handlers ตาม §1 ห้าม query DB จาก Client
   - สั่ง `revalidatePath` หรือ `revalidateTag` เสมอหลัง mutation สำเร็จ
3. **Strict Validation & Types:**
   - `strict: true` ใน `tsconfig.json` ห้ามใช้ `any`
   - Validate input ที่ไม่น่าเชื่อถือของ Server Actions และ Route Handlers ด้วย **Zod** ก่อนใช้ใน business query/mutation; session lookup ของ auth guard ทำก่อนได้ และ webhook ต้องตรวจ signature จาก raw body ก่อนใช้ payload
   - ใช้ Inferred types จาก Drizzle (`$inferSelect`, `$inferInsert`) ผ่าน `@repo/db`
4. **Monorepo DRY Principle:**
   - ห้าม copy logic ซ้ำระหว่าง apps รวม logic ส่วนกลางไว้ที่ `@repo/db`, `@repo/ui`, `@repo/lib`
5. **Financial & Currency Handling:**
   - ฟิลด์เงินใน DB ต้องเป็น `numeric` และใน TypeScript ต้องเป็น `string` (ป้องกัน IEEE 754 precision loss)
   - การส่งยอดเงินเข้า Stripe ต้องแปลงเป็นหน่วยสตางค์ (Integer) ผ่าน `toSmallestCurrencyUnit()` ห้ามใช้ `parseFloat * 100`
6. **Environment Variables:**
   - อ่าน secrets เฉพาะใน server-only modules; Client ใช้ได้เฉพาะค่าที่ออกแบบให้เป็น public เช่น Stripe publishable key ห้ามใส่ secrets ใน `NEXT_PUBLIC_*` หรือ Next.js `env` config ที่ bundle ไป client
   - ทุกแอปต้อง parse และ validate env ผ่าน `lib/env.ts` ด้วย Zod
7. **Image Handling:**
   - ห้ามเก็บ binary/base64 ใน Postgres เก็บเฉพาะ `publicId` และ `secureUrl` จาก Cloudinary
   - ฝั่ง Frontend แสดงผลด้วย `<CldImage>` หรือ Next.js `<Image>` (จำกัดไม่เกิน 20 รูป/สินค้า)
8. **Admin Data Grid:**
   - หน้าตารางใน Admin ต้องใช้ Server-driven pagination / sorting / filtering ผ่าน URL Search Params
9. **Bundle & Inventory Atomicity:**
   - การสั่งซื้อสินค้าทั้ง Single และ Bundle ต้องตรวจสอบและตัดสต็อกอะไหล่ย่อยทุกชิ้นแบบ atomic ภายใต้ `db.transaction()`

---

## 5. Security Requirements

ใช้ [secure-review](.agents/skills/secure-review/SKILL.md) ก่อนและหลังแก้งานที่เข้า scope ของ skill โดยใช้ส่วนนี้เป็นข้อกำหนดหลัก สำหรับงาน feature ตรวจหมวดที่เกี่ยวข้อง; สำหรับ production readiness ตรวจทั้ง §5–§6

เป้าหมายคือข้อกำหนดที่เกี่ยวข้องของ **OWASP ASVS 5.0 ระดับ 2** โดยต้องจัดทำ mapping รายข้อและหลักฐานก่อนอ้างว่าผ่าน ASVS เอกสารนี้เป็น baseline ของโครงการ ไม่ใช่ ASVS ทั้งฉบับ และการมี checklist ไม่ได้ยืนยันว่า implementation ผ่านแล้ว

### 5.1 Authentication, Authorization & Sessions

- **Deny by default:** ทุก protected Server Action, Route Handler และ server-side data access ต้องตรวจ session ที่ใช้ได้จริง, role/permission และสิทธิ์ต่อ resource ก่อนอ่าน/แก้ข้อมูลที่ป้องกันไว้ การเรียก `auth()` แล้วไม่ตรวจ `userId` หรือผล guard ไม่ถือว่าป้องกันแล้ว; ไม่กำหนดว่าต้องเป็นบรรทัดแรก แต่ห้ามมี protected side effect ก่อน guard
- **Ownership / IDOR:** ผูก query กับผู้ใช้จาก session และตรวจสิทธิ์ทั้ง read/write/export/upload/delete ห้ามเชื่อ `userId`, role, order owner หรือราคาใน input; การซ่อนปุ่มและ middleware อย่างเดียวไม่เพียงพอ ป้องกัน shared cache ส่งข้อมูลส่วนตัวข้ามบัญชี
- **Public endpoints:** ระบุเหตุผลและขอบเขต public ให้ชัด เช่น login, catalog, newsletter หรือ guest checkout ที่ออกแบบไว้ พร้อม validation และ abuse control; guest order ต้องมีหลักฐานสิทธิ์ที่เดาไม่ได้ ห้ามใช้ order ID/email อย่างเดียว Webhooks ตรวจผู้ส่งด้วย signature ไม่บังคับ customer/admin session
- **Auth boundary:** แยก customer `users` กับ `admin_users` และสิทธิ์ admin ตามสถาปัตยกรรม ห้ามให้ customer input หรือ Clerk customer metadata ยกระดับเป็น admin
- **Admin credentials:** bcrypt ≥12 rounds และจัดการข้อจำกัดความยาวรหัสผ่านของ bcrypt โดยไม่ truncate เงียบๆ; lockout 5 ครั้ง/15 นาทีร่วมกับ rate limiting และป้องกัน user enumeration; บังคับ MFA สำหรับทุกบัญชีที่เข้าระบบ admin พร้อม recovery ที่ไม่ลดระดับการยืนยันตัวตน และ re-authentication สำหรับเปลี่ยนสิทธิ์/credential หรือ refund ที่มีความเสี่ยงสูง
- **Session lifecycle:** cookie ต้อง `HttpOnly`, `Secure` ใน production, `SameSite` ที่เหมาะกับ flow, Path/Domain แคบที่สุด; มี idle/absolute expiry ฝั่ง server, rotate หลัง login/ยกระดับสิทธิ์, revoke เมื่อ logout/reset password/ปิดบัญชี และมีผลทันทีเมื่อเปลี่ยน role
- **JWT/session verification:** ใช้ `jose` verify signature พร้อม algorithm allowlist, expiry และ claims ตามที่ระบบกำหนด; ตรวจ session row ว่ายัง active และผู้ใช้ยังมีสิทธิ์จริง ใช้ key ที่สุ่มอย่างปลอดภัยและมีแผน rotation หากใช้ opaque bearer token ให้เก็บ hash และเปรียบเทียบอย่างปลอดภัย ไม่บังคับ hash JWT ซ้ำแทนการตรวจ signature
- **Audit trail:** ทุก admin mutation ต้องบันทึก actor จาก session, action, target, เวลา, outcome และ correlation ID ผ่าน `logAuditEvent()` หรือกลไกที่เทียบเท่า การเปลี่ยนสิทธิ์/การเงินต้องไม่ commit แล้วทำ audit หาย: บันทึกใน transaction เดียวกันหรือ transactional outbox; เก็บ login/authorization failures ด้วย และจำกัดสิทธิ์แก้/ลบ audit logs

### 5.2 Request Validation, CSRF & Abuse

- Validate untrusted input ด้วย Zod ก่อน business query/mutation รวม path/query/form/body: จำกัดความยาว, จำนวนรายการ, pagination, enum, integer/range และ reject/strip fields ที่ผู้ใช้ไม่มีสิทธิ์แก้ Auth guard อาจ query session ก่อน validation ได้
- Cookie-authenticated mutations ต้องมี CSRF protection ที่เหมาะกับ endpoint: ตรวจ Origin/Host และ CSRF token เมื่อจำเป็น; ตรวจพฤติกรรม Server Actions หลัง reverse proxy และจำกัด trusted/allowed origins ห้าม mutation ผ่าน GET และห้าม wildcard CORS พร้อม credentials Webhook ยกเว้น CSRF ได้เฉพาะ route ที่ตรวจ signature
- จำกัด rate ตามบัญชี/IP/operation ด้วย shared store หรือ edge control ที่ทำงานข้าม instance; ครอบคลุม login/recovery, checkout/PaymentIntent, newsletter, upload และ API ที่มีต้นทุน ระบุ policy เมื่อ limiter ใช้งานไม่ได้และอย่าเชื่อ forwarded IP จากแหล่งที่ไม่ใช่ trusted proxy
- กำหนดขนาด request และ timeout ตาม endpoint; `serverActions.bodySizeLimit: "4mb"` ครอบคลุมเฉพาะ Server Actions ไม่ใช่ Route Handlers หรือ direct Cloudinary upload ต้องมี limits ที่ ingress/handler/provider ด้วย
- External fetch ที่รับ URL จาก input ต้องจำกัด scheme/host, redirects, timeout/response size และป้องกันเข้าถึง private/internal/metadata addresses (SSRF)

### 5.3 Payments, Webhooks & Inventory

- **Server-authoritative totals:** อ่านราคา/ส่วนลด/ค่าส่ง/ภาษีที่เชื่อถือได้ฝั่ง server และเก็บ order snapshot; ไม่รับยอดหรือ `paid` จาก client เป็นข้อเท็จจริง ใช้ DB `numeric`/TypeScript `string` และ decimal-safe arithmetic ตลอดทาง แปลงผ่าน `toSmallestCurrencyUnit()` พร้อมตรวจ currency exponent, rounding, safe integer และขอบเขตยอด ห้าม `parseFloat(x) * 100`
- **Payment binding:** ก่อนสร้าง/คืน `client_secret` ตรวจสิทธิ์ต่อออเดอร์; ก่อน fulfill ตรวจ PaymentIntent ID ที่ผูกไว้, amount received, currency, account และ live/test mode ให้ตรงออเดอร์ ห้ามใช้ metadata order ID เพียงอย่างเดียว; ห้าม log `client_secret` หรือส่งให้บุคคลอื่น
- **Signature:** Stripe ใช้ `constructStripeWebhookEvent(rawBody, signature, secret)` และ Clerk ใช้ Svix verification กับ raw body/headers ตาม SDK ตรวจ timestamp/replay tolerance ตาม provider; ห้ามใช้ payload หรือมี side effect ก่อน verify การ parse/serialize body ใหม่ทำให้ signature ไม่ตรง ไม่ใช่หลักฐานว่าปลอมผ่านได้เอง
- **Creation idempotency:** การสร้าง PaymentIntent/refund ต้องใช้ provider idempotency key ที่คงเดิมเมื่อ retry operation เดิม พร้อม business key/constraint กันสร้างซ้ำใน DB; มี recovery เมื่อ provider สำเร็จแต่การบันทึก DB ล้มเหลว
- **Concurrent delivery:** กัน event ซ้ำด้วย durable event record และ unique constraint ร่วมกับการเปลี่ยน business state แบบ atomic เช่น conditional update ตรวจ affected rows หรือ row lock ใน transaction การอ่าน `paymentStatus`/event ID ก่อนเขียนเฉยๆ ไม่พอ ต้องกันสอง event IDs ที่พยายาม fulfill PaymentIntent/order เดียวกันด้วย
- **Atomic stock:** ตรวจและตัด stock ของ single/bundle parts ทุกชิ้นพร้อม order/payment/status history ใน transaction เดียว ใช้ conditional decrement หรือ locks/isolation ที่ป้องกัน oversell จริง; lock parts ตามลำดับคงที่และมี bounded retry สำหรับ deadlock/serialization failure เพิ่ม DB constraints เช่น stock ไม่ติดลบ, quantity เป็นบวก และ unique business keys
- **Payment state machine:** กำหนด transition สำหรับ succeeded/failed/canceled/refund/dispute ตาม flow ที่รองรับ; event ล่าช้าหรือสลับลำดับต้องไม่ย้อน `paid` เป็น `failed` โดยผิดเงื่อนไข มี reconciliation กับ Stripe เมื่อ event ขาดหายหรือผลไม่แน่นอน
- **Paid but unavailable:** ออกแบบ reservation/expiry หรือ compensation/refund เมื่อจ่ายสำเร็จแต่สต็อกไม่พอ/ออเดอร์ยกเลิกแล้ว และทดสอบ payment ที่มาหลัง reservation หมดอายุ ห้ามปล่อยให้รับเงินจริงแล้วออเดอร์ค้างโดยไม่มีทางแก้
- **Durable processing:** ตอบ webhook success หลัง commit ผลหรือรับงานลง durable queue แล้ว; ถ้าบันทึกไม่ได้ต้องให้ provider retry ส่งอีเมล/งานภายนอกผ่าน outbox หรือ durable retry หลัง commit พร้อม deduplication; DB transaction ไม่ rollback Stripe หรือ email ให้เอง

### 5.4 Database & Data Exposure

- ทุก multi-table write ที่ต้องสอดคล้องกันใช้ `db.transaction()` และตรวจว่า driver ที่ใช้รองรับจริง; เพิ่ม FK/unique/check constraints ตาม invariant และทดสอบ rollback/concurrency ไม่ถือว่ามี transaction แล้วปลอดภัยทุกกรณี
- SQL values ต้อง parameterized ผ่าน Drizzle หรือ tagged template ที่ parameterize จริง; ห้าม concatenate input หรือใช้ raw escape กับข้อมูลผู้ใช้ Dynamic column/order identifiers ต้องมาจาก allowlist
- Return DTO เฉพาะ fields ที่จำเป็นจาก Actions/RSC/API; ห้ามส่ง DB row ทั้งก้อนโดยไม่ตรวจ รวม password hashes, tokens, secrets และ PII ที่ผู้รับไม่มีสิทธิ์ ใช้ server-only boundary สำหรับ DB/secret modules
- Expected errors ใช้ข้อความ/รหัสที่ปลอดภัย; unexpected errors ส่งข้อความทั่วไปพร้อม correlation ID และ log รายละเอียดที่ redact แล้ว ห้ามเปิด SQL/stack/secrets ผ่าน response หรือ production error page ระวัง catch กลืน `redirect()`/framework control flow

### 5.5 Browser Security & Media

- ตรวจ response headers ของ build แบบ production ผ่าน deployment/proxy จริง: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` และ HTTPS/HSTS ตามโดเมนที่รองรับ TLS จริง อย่าเปิด HSTS includeSubDomains/preload โดยไม่ตรวจโดเมนย่อย
- CSP ต้องจำกัด script/connect/frame origins ตามที่ใช้งาน และมี `object-src`, `base-uri`, `frame-ancestors`; ใช้ nonce/hash สำหรับ scripts แทนการอนุญาต inline ทั้งหมด ไม่ใช้ `unsafe-eval` ใน production ข้อยกเว้นต้องมีเหตุผล มาตรการชดเชย ผู้รับผิดชอบ และวันหมดอายุตาม §6.3 พร้อมทดสอบ Clerk/Stripe/Cloudinary/3D
- Render ข้อความด้วย escaping ปกติ; หากรองรับ HTML ให้ sanitize ด้วย allowlist ที่ดูแลต่อเนื่อง ตรวจ URL scheme และการใช้ `dangerouslySetInnerHTML` ตัวกรองคำหยาบและ AI moderation ไม่ได้ป้องกัน XSS
- Upload ต้องตรวจ auth/ownership/quota, allowed formats ตามชนิด asset (ภาพ/3D), MIME/file signature และขนาดจริง; ไม่เชื่อชื่อไฟล์หรือ MIME จาก client ตรวจสิทธิ์ delete/overwrite ของ Cloudinary public ID ด้วย
- Cloudinary signed upload ต้องออก signature ฝั่ง server หลังตรวจสิทธิ์ จำกัด preset/folder/resource type/format/size/อายุ และห้ามเซ็น arbitrary parameters จาก client; ยืนยันผล upload/provider callback ก่อนผูกกับ entity ห้ามรับ arbitrary `secureUrl`/`publicId` เป็นหลักฐานว่าอัปโหลดถูกต้อง
- รูปภาพผ่าน moderation และกักไว้จนผลอนุมัติก่อนเผยแพร่; ข้อความรีวิวผ่าน moderation ฝั่ง server ส่วน 3D/ชนิดไฟล์ที่ AI moderation ไม่รองรับให้ใช้ validation/quarantine ที่เหมาะสม ห้ามอ้างว่าผ่าน image moderation; ไม่เก็บ binary/base64 ใน Postgres

### 5.6 Secrets & Privacy

- Secrets อยู่ server/secret manager และ env schema ต้อง fail closed เมื่อ production config ไม่ครบ ห้ามเปิดเผยผ่าน `NEXT_PUBLIC_*`, Next.js client env, logs, error reporting, analytics หรือ artifacts; แยก publishable keys ออกจาก secrets อย่างชัดเจน
- แยก dev/staging/production credentials, databases และ provider accounts; ให้ runtime DB role มีสิทธิ์เท่าที่จำเป็น แยก migration role ห้ามใช้ production credentials ใน CI ของ untrusted PR หรือ destructive tests
- ใช้ pre-commit secret hook ร่วมกับ CI secret scanning รวมประวัติที่เกี่ยวข้อง; หาก secret เคยหลุดต้อง revoke/rotate การลบจากไฟล์อย่างเดียวไม่พอ
- จำกัดการเก็บ/เข้าถึง/ส่งออก PII พร้อม retention/deletion policy; redact password, session token, payment client secret และข้อมูลส่วนตัวที่ไม่จำเป็นจาก logs ห้ามรับหรือเก็บ PAN/CVC ในระบบนี้ ใช้ Stripe Elements ตามสถาปัตยกรรม

## 6. Production Release Gates & Evidence

ข้อกำหนดต่อไปนี้ต้องตรวจจริงก่อนเปิดรับผู้ใช้ production การแก้เอกสารไม่ได้ติดตั้ง control หรือทำให้ gate ผ่านโดยอัตโนมัติ

### 6.1 Dependencies, CI & Production Configuration

- ใช้ framework/Node.js และ dependencies ที่ยังได้รับ security support ตรวจ resolved versions ใน lockfile และ official advisories ทุก release; ใช้ frozen lockfile ใน CI และกำหนดเจ้าของ patching
- CI ต้องรัน lint/typecheck/build, security tests ที่เกี่ยวข้อง, dependency scan, secret scan และ static security analysis พร้อมบังคับ required checks ก่อน deploy; scanner unavailable/skipped ไม่ถือว่าผ่าน ต้องมีหลักฐานผูกกับ commit/build ที่ deploy
- Production ต้อง fail closed หากเปิด mock payment, auth bypass, debug/test endpoints หรือใช้ provider test configuration; ทดสอบเรียก mock action โดยตรง ไม่อาศัยการซ่อน UI
- Deploy production build ด้วย HTTPS, origin/proxy configuration ที่ตรวจแล้วและ environment แยก; ตรวจ security headers, cookie และ private-data caching จาก runtime จริง รวม health check ที่ไม่เปิดเผย secrets

### 6.2 Safe Verification & Required Security Tests

- ก่อนรัน `pnpm verify` / `pnpm verify:stripe` ต้องตรวจ script รวม import-time side effects และ effective env จริง ไม่อาศัยชื่อ `NODE_ENV` หรือชื่อฐานข้อมูลอย่างเดียว
- Test runner ต้องมี automated guard ก่อนเปิด DB client/เรียก provider: อนุญาตเฉพาะ test DB/project ที่ระบุแยกและ credentials ที่เข้าถึง production ไม่ได้, Stripe test account/key และ email sink; config ไม่ครบ/ไม่รู้จัก/เป็น live ต้องหยุดก่อน side effect ห้ามรัน legacy script จนมี guard และยืนยัน environment ได้
- ใช้ fixtures เฉพาะ run, cleanup ใน `finally` และไม่แก้สินค้า/สต็อกที่แชร์กับผู้ใช้; ห้าม restore ค่าทับ concurrent writes ของผู้อื่น หากยังจัด test isolation ไม่ได้ ให้รายงาน **ยังไม่ตรวจ** และทำ static/unit checks ที่ปลอดภัยต่อได้
- Auth tests: anonymous/expired/revoked session ถูกปฏิเสธ, customer A เข้า resource ของ B ไม่ได้, staff ยกระดับสิทธิ์ไม่ได้, role change มีผล, CSRF และ direct endpoint invocation ข้าม UI ไม่ผ่าน
- Payment tests: client เปลี่ยนราคา/owner ไม่ได้, signature ผิดไม่มี side effect, event ซ้ำทั้ง sequential/concurrent และ event ต่าง ID สำหรับ payment เดียวไม่ fulfill ซ้ำ, out-of-order ไม่ย้อนสถานะ และ mismatch amount/currency/PaymentIntent ถูกปฏิเสธ
- Stock/recovery tests: แย่งซื้อชิ้นสุดท้ายพร้อมกัน, bundle ที่แชร์ parts, rollback เมื่อ query ล้มเหลว, retry หลัง provider success/DB failure, delayed payment หลัง cancel/expiry และ email failure หลัง commit ไม่ทำให้สูญออเดอร์หรือตัด stock ซ้ำ
- Media/abuse tests: oversized/unsupported file, ปลอม MIME/URL/public ID, unauthorized delete, rate limit และ public endpoint abuse; ทดสอบ production CSP กับ integration จริงใน staging
- Code changes รัน lint และ typecheck ของส่วนที่เกี่ยวข้อง; build เมื่อกระทบ integration/config; order/Stripe ใช้ verify scripts เมื่อผ่าน guard ข้างต้นเท่านั้น Pure documentation changes ตรวจ diff, references และ skill frontmatter โดยไม่ต้องรัน DB/payment scripts

### 6.3 Release Decision & Operations

- บันทึก control/ASVS requirement ที่เกี่ยวข้อง, สถานะ **ผ่าน / ไม่ผ่าน / ยังไม่ตรวจ / ไม่เกี่ยวข้อง**, หลักฐานไฟล์+ฟังก์ชัน/บรรทัด, test command/result, environment และ commit/date ข้อ **ไม่เกี่ยวข้อง** ต้องมีเหตุผล; แยกหลักฐาน static review จาก runtime tests ห้ามใส่ secrets ในรายงาน
- Block production release หากมี Critical/High ที่ยังไม่แก้, critical controls ด้าน auth/payment/data integrity ไม่ผ่านหรือยังไม่ตรวจ, ใช้ unsupported framework/runtime หรือยังยืนยัน test isolation/production configuration ไม่ได้
- ข้อยกเว้นเฉพาะความเสี่ยงที่ไม่ใช่ release blocker ต้องให้เจ้าของระบบยอมรับโดยชัดแจ้ง พร้อมขอบเขต ผลกระทบ มาตรการชดเชย ผู้รับผิดชอบ และวันหมดอายุ ห้าม agent ยอมรับความเสี่ยงแทนหรือเปลี่ยน failed เป็น passed
- กำหนด patch response: ช่องโหว่ที่ถูก exploit หรือ Critical ต้อง triage/mitigate ทันที; High ต้องมี owner/กำหนดแก้ไม่เกิน 7 วัน ส่วนระดับอื่นกำหนดตามผลกระทบ โดย SLA ไม่ได้ยกเว้น release blocker
- ก่อนเปิดใช้จริงต้องมี backup/PITR ตาม RPO/RTO ที่เจ้าของระบบกำหนด และหลักฐาน restore ใน environment แยก; ทดสอบ migrations บน staging, ประเมิน locks/data loss, ใช้ migration role และมี rollback/roll-forward plan ห้ามใช้ `db:push` แทน reviewed production migrations
- มี alert และผู้รับผิดชอบสำหรับ webhook failures/backlog, paid-but-unfulfilled orders, stock anomalies, auth abuse และ privileged changes; ทดสอบว่าแจ้งเตือนได้จริง พร้อม runbook สำหรับ reconcile/refund, revoke session/rotate secrets และ rollback release

### 6.4 Known Baseline Gaps (ตรวจจาก repository วันที่ 2026-09-10)

รายการนี้เป็นสิ่งที่ต้องแก้/ตรวจต่อ ไม่ใช่ผลรับรองระบบทั้งหมด; อัปเดตสถานะพร้อมหลักฐานเมื่อ implementation เปลี่ยน

- `pnpm-lock.yaml` ของทั้งสองแอป resolve Next.js `14.2.35`; สาย 14.x อยู่นอก support policy ต้องอัปเกรดสายที่ยังรองรับและทดสอบก่อน release
- `apps/admin/next.config.mjs` และ `apps/storefront/next.config.mjs` ยังอนุญาต `script-src 'unsafe-inline'` ใน production ต้องปรับ nonce/hash หรือจัดการข้อยกเว้นตาม §6.3
- `apps/storefront/scripts/verify_loop.ts` และ `verify_stripe_loop.ts` โหลด root `.env` และมี DB/provider side effects ต้องเพิ่มและตรวจ test-isolation guard ตาม §6.2 ก่อนรัน
- ยังไม่มีหลักฐานในงานตรวจเอกสารนี้ว่าระบบผ่าน CI security gates, MFA/session lifecycle, runtime authorization/payment tests หรือ restore drill ห้ามอ้างว่าผ่านจากการแก้สองไฟล์นี้

### References

- [OWASP ASVS 5.0 control domains](https://cheatsheetseries.owasp.org/IndexASVS.html) — ใช้กำหนด coverage และ mapping ไม่ใช่อ้าง certification จาก checklist ย่อ
- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security), [Support Policy](https://nextjs.org/support-policy) — ตรวจเอกสารให้ตรง installed version
- [Stripe Webhooks](https://docs.stripe.com/webhooks), [Idempotent Requests](https://docs.stripe.com/api/idempotent_requests), [Clerk auth](https://clerk.com/docs/reference/nextjs/app-router/auth)
