# South Aero — Production Security & Deployment Checklist
## รายการตรวจสอบความพร้อมด้านความปลอดภัยและการขึ้นระบบจริง (Master Go-Live Checklist)

> **วันที่จัดทำ / อัปเดตล่าสุด:** 7 ตุลาคม 2026 (Asia/Bangkok)  
> **เวอร์ชันสแต็กปัจจุบัน:** Next.js `16.3.8` · React `19.1.9` · ESLint `9` Flat Config · Drizzle ORM `0.45.3` · PostgreSQL (Neon)  
> **วัตถุประสงค์:** รวบรวมสิ่งที่ต้องแก้ไข ตรวจสอบ ตั้งค่า และคอนฟิกทั้งหมดสำหรับทีมพัฒนา (Dev), DevOps และผู้ดูแลระบบ (System Owner) ก่อนเปิดรับเงินจริงบน Production  
> **ระดับความพร้อมโดยรวม:** 🟡 **CONDITIONAL PREPARATION (โค้ดและระบบทดสอบผ่านครบ 100% — รอการตั้งค่าสภาพแวดล้อมจริงและกุญแจ Production)**

---

## สรุปภาพรวมสิ่งที่ต้องดำเนินการ (Executive Action Summary)

```
[ หมวดที่ 1: โค้ดเบสและเฟรมเวิร์ก ] ──> ผ่านแล้ว (Next.js 16.3.8 / 264 Tests ผ่าน) + ปรับ Warning เล็กน้อย
[ หมวดที่ 2: ฐานข้อมูลและการ Migration ] ──> รัน 3 Migrations ล่าสุด (0004, 0005, 0006) + สำรองข้อมูล
[ หมวดที่ 3: ผู้ให้บริการภายนอก (Stripe/Clerk) ] ──> สลับใส่ Live Keys และตั้ง Webhook จริง
[ หมวดที่ 4: ความลับระบบ (Internal Secrets) ] ──> สุ่ม Key 64-char แยกอิสระ + ปลด Bootstrap Token
[ หมวดที่ 5: งานเบื้องหลังและ Cron Job ] ──> ตั้ง Cron เรียก /api/maintenance/orders ทุก 1 นาที
[ หมวดที่ 6: เครือข่ายและ Cloudflare Edge ] ──> บังคับ TRUSTED_PROXY + เปิด WAF & Rate Limiting
[ หมวดที่ 7: Smoke Test ขั้นสุดท้าย ] ──> ซื้อและตัดบัตรจริง 1 รายการ + ทดสอบ MFA แอดมิน
```

---

## 1. การปรับปรุงโค้ดเบสและเฟรมเวิร์ก (Codebase & Framework Hardening)

- [x] **อัปเกรด Next.js สู่เวอร์ชัน 16.3.8:** ทั้ง Storefront และ Admin ทำงานบน Next.js 16 และ React 19.1.9
- [x] **ปรับระบบ Linter สู่ ESLint 9 Flat Config:** ปรับแต่งไฟล์ `eslint.config.mjs` และรันสคริปต์ `eslint .` ผ่านสมบูรณ์
- [x] **TypeScript Strict Typecheck:** รัน `pnpm typecheck` ผ่านครบ 100% ทั้ง 8 packages ใน Monorepo
- [x] **Vitest Unit/Integration Tests:** ผ่านครบ 264/264 ข้อ (Storefront 163 tests, Admin 101 tests)
- [x] **Adversarial Security Harness:** ผ่านครบ 477/477 adversarial test cases (Run ID: `security_test_88f9013e9fdf487da10381de05ce2697`)
- [ ] **[TODO-LOW] ปรับปรุง Next.js 16 Middleware Convention (`middleware.ts` ➔ `proxy.ts`):**
  - *สถานะปัจจุบัน:* ทำงานได้ปกติและ Build ผ่าน แต่มีคำเตือน deprecation จาก Turbopack
  - *สิ่งที่ต้องทำ:* เมื่อแพ็กเกจ `@clerk/nextjs` ประกาศรองรับ `proxy.ts` อย่างเป็นทางการ ให้ทดสอบเปลี่ยนชื่อไฟล์จาก `apps/storefront/middleware.ts` เป็น `proxy.ts`
- [x] **[TODO-LOW] ปรับแก้คำเตือนรูปภาพ `<img>` สู่ `<Image />` (`next/image`):** (แก้ไขเรียบร้อยแล้ว Typecheck & ESLint ผ่าน 100%)
  - *ตำแหน่งที่ได้รับการปรับปรุง:*
    - `apps/admin/components/newsletters/VisualEmailBuilder.tsx` (บรรทัด 1086, 1099)
    - `apps/storefront/components/layout/Navbar.tsx` (บรรทัด 254)
    - `apps/storefront/components/orders/InvoiceClient.tsx` (บรรทัด 437)
  - *สถานะ:* แปลงเป็น `<Image />` พร้อม `unoptimized` สำหรับ dynamic URLs เรียบร้อยแล้ว

---

## 2. ฐานข้อมูลและการรัน Migration (Database & Schema Integrity)

- [x] **นำ Neon Credential literals ออกจาก Git:** โค้ดทั้งหมดอ่านค่าผ่าน `process.env.DATABASE_URL`
- [x] **Rotate / Revoke รหัสผ่าน Neon Database เดิม:** เปลี่ยนรหัสผ่านใหม่บน Neon Console เรียบร้อย
- [ ] **[CRITICAL] จัดทำ Snapshot / Backup ฐานข้อมูล Production:**
  - สร้าง Full Snapshot ก่อนเริ่มการ deploy ใด ๆ บน Neon Console
- [ ] **[CRITICAL] ดำเนินการทดสอบ Restore Drill:**
  - ทดสอบกู้คืนข้อมูล Snapshot ไปยัง Database Branch ใหม่ เพื่อยืนยันว่าข้อมูลสามารถกู้คืนได้จริง
- [ ] **[CRITICAL] ดำเนินการรัน Migration ที่ค้างอยู่บน Production Database:**
  - [ ] `0004_payment_webhook_evidence.sql` — บันทึก Ledger ป้องกัน Webhook Duplicate Fulfillment
  - [ ] `0005_customer_order_note.sql` — เพิ่มฟิลด์ Order Note พร้อม byte-length constraint (2,048 UTF-8 bytes)
  - [ ] `0006_shipping_quotes.sql` — สร้างตาราง `shipping_settings`, `product_shipping_policies`, `shipping_quotes` และคอลัมน์ `orders.shipping_details`
- [ ] **[SECURITY] ตรวจสอบการตั้งค่าความปลอดภัยของ Connection String:**
  - บังคับใช้ `sslmode=require` ใน Connection String เสมอ
  - แยกบัญชี Database User สำหรับ Storefront และ Admin ให้มีสิทธิ์เท่าที่จำเป็น (Least Privilege)

---

## 3. กุญแจผู้ให้บริการภายนอกและการรับส่ง Webhook (Third-Party Providers & Live Keys)

### 3.1 Stripe Payments (ระบบรับชำระเงินหลัก)
- [ ] **สลับคีย์เข้าสู่โหมด Live:**
  - เปลี่ยน `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` จาก `pk_test_...` เป็น `pk_live_...`
  - เปลี่ยน `STRIPE_SECRET_KEY` จาก `sk_test_...` เป็น `sk_live_...`
- [ ] **ตั้งค่า Production Webhook Endpoint:**
  - URL ปลายทาง: `https://<production-domain>/api/webhooks/stripe`
  - Events ที่จำเป็นต้องเปิดฟัง:
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
    - `charge.refunded`
- [ ] **กำหนด Signing Secret ในเซิร์ฟเวอร์:**
  - นำค่า Webhook Secret (`whsec_...`) จาก Stripe Console ไปใส่ใน `STRIPE_WEBHOOK_SECRET` ของเซิร์ฟเวอร์
- [ ] **ทดสอบการทำงานจริง (Live Micro-Transaction):**
  - ทดลองชำระเงินจริง 1 รายการ และทดสอบกดยกเลิก/คืนเงิน (Refund) เพื่อยืนยันว่า Webhook ลงนามถูกต้องและบันทึกสถานะตรงกัน

### 3.2 Clerk Authentication (ระบบยืนยันตัวตนลูกค้า)
- [ ] **สลับสู่อินสแตนซ์ Production บน Clerk Dashboard:**
  - ตั้งค่า Production Domain และผูก Custom Domain
- [ ] **กำหนด Live API Keys:**
  - กำหนด `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_live_...`)
  - กำหนด `CLERK_SECRET_KEY` (`sk_live_...`)
- [ ] **ตั้งค่า Clerk Webhook สำหรับ Sync ข้อมูลบัญชี:**
  - URL ปลายทาง: `https://<production-domain>/api/webhooks/clerk`
  - กำหนด `CLERK_WEBHOOK_SECRET` (`whsec_...`) บนเซิร์ฟเวอร์

### 3.3 Resend (ระบบส่งอีเมลยืนยันคำสั่งซื้อและใบเสร็จ)
- [ ] **กำหนด Production API Key:**
  - นำ API Key จริงจาก Resend Dashboard มาใส่ใน `RESEND_API_KEY`
- [ ] **ตรวจสอบและยืนยันการตั้งค่า DNS Domain (SPF / DKIM / DMARC):**
  - เพิ่มเรคคอร์ด DNS ตามที่ Resend กำหนดจนขึ้นสถานะ **Verified** ป้องกันอีเมลตกกล่อง Junk/Spam
- [ ] **ปรับแต่งผู้ส่งอีเมล (`RESEND_FROM_EMAIL`):**
  - เปลี่ยนจากอีเมลทดสอบ `onboarding@resend.dev` เป็นอีเมลโดเมนจริง เช่น `South Aero <orders@southaero.com>`

### 3.4 Cloudinary (CDN จัดเก็บรูปภาพและวิดีโอ)
- [ ] **ตั้งค่า Production Credentials:**
  - กำหนด `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] **ตรวจสอบโควตาและการจำกัดสิทธิ์:**
  - ตรวจสอบ Bandwidth และ Storage Quota
  - เปิดใช้งาน Strict Transformations หรือ Signed URLs เพื่อป้องกันการโจมตีขโมย Bandwidth

---

## 4. การจัดการความลับระดับเซิร์ฟเวอร์ (Internal Secrets & Environment)

- [ ] **[CRITICAL] สร้างความลับแบบสุ่มที่มีความยาวและความปลอดภัยสูง (อย่างน้อย 64 ตัวอักษร):**
  - [ ] `ADMIN_SESSION_SECRET` — คีย์สำหรับเข้ารหัสเซสชันของ Admin Cookie (ห้ามใช้ค่า default หรือสั้นเกินไป)
  - [ ] `ADMIN_MFA_ENCRYPTION_KEY` — คีย์ 32-byte hex string สำหรับเข้ารหัส TOTP Secret ในฐานข้อมูล
  - [ ] `ORDER_TOKEN_SECRET` — คีย์สำหรับคำนวณ HMAC Token ของ Guest Checkout
  - [ ] `REALTIME_SECRET` — คีย์สำหรับยืนยันสิทธิ์ Real-time events / SSE
  - [ ] `MAINTENANCE_SECRET` — คีย์สำหรับป้องกัน Background Maintenance Endpoint
  *(คำแนะนำ: สร้างด้วยคำสั่ง `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`)*
- [ ] **[CRITICAL] ลบ `ADMIN_BOOTSTRAP_TOKEN` หลังเริ่มต้นระบบ:**
  - ใช้ Token นี้เพื่อตั้งค่า Super Admin บัญชีแรกเท่านั้น เมื่อตั้งค่าเสร็จสิ้น **ต้องลบตัวแปรนี้ออกจากเซิร์ฟเวอร์ทันที** เพื่อป้องกันการถูกยึดสิทธิ์ Admin
- [ ] **[HIGH] ตั้งค่าตัวแปรระดับระบบ:**
  - กำหนด `APP_ENV=production` เพื่อเปิดระบบป้องกัน Live Validation, HTTPS-only Cookies และ Nonce-based Strict CSP
  - กำหนด `NEXT_PUBLIC_STOREFRONT_URL` และ `NEXT_PUBLIC_ADMIN_URL` ให้ตรงกับโดเมนจริง

---

## 5. งานเบื้องหลังและตัวตั้งเวลาอัตโนมัติ (Background Jobs & Schedulers)

- [ ] **[CRITICAL] ตั้งค่า Cron Job ภายนอก (เช่น Cloudflare Cron Triggers หรือ GitHub Actions Scheduled):**
  - **Endpoint:** `POST https://<production-domain>/api/maintenance/orders`
  - **Headers:** `Authorization: Bearer <MAINTENANCE_SECRET>`
  - **ความถี่:** **ทุก 1 นาที (Every 1 minute)**
  - **หน้าที่ของ Endpoint:**
    - เคลียร์การจองสต็อกที่หมดอายุ (Expired Stock Reservations เกิน 15 นาที) คืนสินค้ากลับสู่คลัง
    - ยกเลิกออเดอร์ที่ค้างชำระนานเกินกำหนด
    - ดึงรายการอีเมลในคิวที่ส่งไม่ผ่านขึ้นมา Retry
- [ ] **[HIGH] ตั้งระบบแจ้งเตือนตาราง `payment_reconciliation_jobs`:**
  - ตั้ง Webhook Alert หรือการแจ้งเตือนแอดมินเมื่อพบ Record ในตารางนี้ (เกิดเมื่อลูกค้าตัดเงินสำเร็จ แต่สต็อกมีปัญหาหรือระบบ Fulfill ขัดข้อง) เพื่อให้เจ้าหน้าที่ตรวจสอบและจัดการคืนเงินหรือติดต่อลูกค้าได้ทันที

---

## 6. โครงสร้างพื้นฐาน, เครือข่าย และ Edge WAF (Infrastructure & Edge Protection)

- [ ] **[CRITICAL] ตั้งค่า Reverse Proxy (Cloudflare):**
  - กำหนด `TRUSTED_PROXY=cloudflare` ใน Production Environment
  - ตรวจสอบว่า Proxy ส่ง Header `cf-connecting-ip` หรือ `x-forwarded-for` มายังแอปพลิเคชันอย่างถูกต้อง เพื่อให้ระบบ Rate Limiter ทำงานตาม IP จริงของลูกค้า
- [ ] **[CRITICAL] ปิดการเข้าถึง Origin Server โดยตรง:**
  - ตั้ง Firewall ของ Server ให้รับ Request เฉพาะจาก IP Ranges ของ Cloudflare เท่านั้น บล็อกการยิงตรงผ่าน Server IP
- [ ] **[HIGH] เปิดใช้งาน Cloudflare WAF & Edge Rate Limiter:**
  - เปิดโหมดป้องกัน DDoS Attack และ Bot Management
  - ตั้ง Rate Limit ที่ Edge สำหรับ API routes สำคัญ เช่น `/api/webhooks/*` และ `/api/currency/rates`
- [ ] **[HIGH] ตรวจสอบ Action Ingress Guard & CSP:**
  - ยืนยันว่าระบบบล็อก Payload ที่มีขนาดเกิน 1MB (สำหรับ Request ปกติ) และ 4MB (สำหรับ Multipart Upload)
  - ตรวจสอบ Header `Content-Security-Policy` ว่ามีการแทรก Nonce ใน Inline Scripts และไม่มี `'unsafe-eval'`

---

## 7. ขั้นตอนทดสอบความพร้อมก่อนเปิดให้ผู้ใช้จริง (Final Go-Live Verification Gates)

เมื่อดำเนินการตั้งค่าข้อ 1 - 6 เสร็จสิ้น ให้ทำการทดสอบแบบ End-to-End บน Production Domain ตามลำดับดังนี้:

| ลำดับ | รายการทดสอบ (Verification Test) | เกณฑ์ที่ถือว่าผ่าน (Pass Criteria) | สถานะ |
| :---: | :--- | :--- | :---: |
| 1 | **SSL & Security Headers** | ตรวจสอบผ่าน `curl -I` พบ HSTS, nosniff, CSP Nonce และ HTTPS เท่านั้น | [ ] |
| 2 | **Admin Superuser Setup** | เข้า `/setup` ด้วย Bootstrap Token ตั้งบัญชีแรกสำเร็จ แล้วลบ Token ออกจาก Env | [ ] |
| 3 | **Admin MFA Enforcement** | แอดมินสแกน QR Code (TOTP) และยืนยันรหัส OTP สำเร็จ ไม่สามารถเข้าถึง Dashboard โดยไม่มี MFA | [ ] |
| 4 | **Catalog & 3D Viewer** | เข้าดูหน้ารายละเอียดสินค้า 3D Model และรูปภาพจาก Cloudinary โหลดติดครบถ้วน | [ ] |
| 5 | **Guest Checkout Flow** | สั่งซื้อสินค้าในโหมด Guest และตัดเงินผ่าน Stripe Live Card สำเร็จ | [ ] |
| 6 | **Stock Deduction Atomicity** | สต็อกลดลงตามจำนวนที่สั่งซื้อจริง ไม่มีการหักเบิ้ล | [ ] |
| 7 | **Stripe Webhook Delivery** | Webhook ส่งสถานะ `payment_intent.succeeded` ภายใน 5 วินาที และออเดอร์เปลี่ยนเป็น `paid` | [ ] |
| 8 | **Customer Receipt Email** | อีเมลยืนยันคำสั่งซื้อส่งถึง Inbox ของลูกค้าจริง ไม่ตกในโฟลเดอร์ Junk/Spam | [ ] |
| 9 | **Shipping Quote System** | ทดสอบขอใบเสนอราคาค่าจัดส่ง (`/shipping-quotes`) และตรวจสอบการบันทึกลงฐานข้อมูล | [ ] |
| 10 | **Maintenance Worker** | ยิงเรียก `/api/maintenance/orders` ด้วย Bearer Secret และได้รับการตอบกลับสถานะ HTTP 200 | [ ] |

---

*เอกสารฉบับนี้เป็นแนวทางปฏิบัติอย่างเป็นทางการของโครงการ South Aero — เมื่อทุกข้อใน Checklist นี้ถูกทำเครื่องหมายครบถ้วน ระบบจะถือว่าพร้อมเปิดรับผู้ใช้งานจริง (Production Go-Live) ได้อย่างปลอดภัย 100%*
