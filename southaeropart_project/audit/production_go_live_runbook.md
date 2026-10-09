# South Aero — คู่มือลำดับขั้นตอนการเปิดตัวสู่ Production (Go-Live Runbook)

> **เอกสารอ้างอิง:** [secure_checklist.md](file:///c:/Users/sirac/Downloads/southaeropart_project/southaeropart_project/audit/secure_checklist.md) · [CLAUDE.md](file:///c:/Users/sirac/Downloads/southaeropart_project/southaeropart_project/CLAUDE.md) · [0008_least_privilege_roles.sql](file:///c:/Users/sirac/Downloads/southaeropart_project/southaeropart_project/packages/db/sql/0008_least_privilege_roles.sql)  
> **วัตถุประสงค์:** กำหนดขั้นตอนแบบ Step-by-Step พร้อมคำสั่งและเกณฑ์ตรวจสอบ สำหรับทีมวิศวกรในการนำระบบ South Aero Platform ขึ้นสู่ Production อย่างปลอดภัย 100% ปราศจากช่องโหว่

---

## สารบัญขั้นตอน (Phase Overview)

```mermaid
flowchart TD
    P1["Phase 1: โดเมน, เครือข่าย & Edge (Cloudflare)"] --> P2["Phase 2: ฐานข้อมูล Neon (Least Privilege & Migrations)"]
    P2 --> P3["Phase 3: ผู้ให้บริการภายนอก (Stripe / Clerk / Resend / Cloudinary)"]
    P3 --> P4["Phase 4: การกำหนดค่าความลับเซิร์ฟเวอร์ (.env & Secrets)"]
    P4 --> P5["Phase 5: Deploy เซิร์ฟเวอร์ & Bootstrap Super Admin"]
    P5 --> P6["Phase 6: ตัวตั้งเวลางานเบื้องหลัง (Cron Maintenance)"]
    P6 --> P7["Phase 7: ทดสอบยืนยันระบบจริง (10 Verification Gates)"]
```

---

## Phase 1: โดเมน, เครือข่าย และ Edge Protection (Cloudflare)

### 1.1 การชี้ DNS และเปิดใช้ Cloudflare Proxy
1. จัดเตรียมโดเมนหลักและโดเมนย่อย:
   - **Storefront:** `https://southaero.com` (หรือ `https://www.southaero.com`)
   - **Admin Portal:** `https://admin.southaero.com` (แนะนำให้จำกัดการเข้าถึงหรืออยู่หลัง Cloudflare Access)
2. ใน **Cloudflare Dashboard** → **DNS Records**:
   - สร้าง A Record หรือ CNAME ชี้ไปยัง Server / Cloud Host
   - ตรวจสอบว่าเปิดสถานะ **Proxied (ส้ม)** สำหรับทั้งสองโดเมน

### 1.2 การล็อก Origin Firewall (ป้องกันการยิงตรงข้าม Cloudflare)
1. ติดตั้งกฎ Firewall บนเครื่อง Server โฮสต์จริง (เช่น `ufw` หรือ Cloud Provider Security Groups):
   - อนุญาตพอร์ต 80/443 **เฉพาะจาก IP Ranges ทางการของ Cloudflare เท่านั้น**:
     - อ้างอิง: https://www.cloudflare.com/ips/
   - บล็อก Inbound Traffic อื่นๆ ทั้งหมดที่พยายามยิงตรงผ่าน Server IP
2. ในแอปพลิเคชัน กำหนด:
   ```env
   TRUSTED_PROXY=cloudflare
   ```
   *(เพื่อให้ `trust-proxy.ts` ยอมรับเฉพาะ Header `cf-connecting-ip` ป้องกันการปลอมแปลง IP สำหรับระบบ Rate Limiter)*

### 1.3 เปิดใช้งาน WAF & Security Rules บน Cloudflare
1. **Security Level:** ตั้งค่าเป็น `Medium` หรือ `High`
2. **Bot Fight Mode:** เปิดใช้งานเพื่อสกัด Web Scraper อัตโนมัติ
3. **Custom Rate Limiting Rules:**
   - กำหนด Rate Limit สำหรับ Route `/api/webhooks/*` และ `/api/currency/rates`
   - กำหนดการแจ้งเตือนเมื่อพบ Traffic พุ่งผิดปกติ

---

## Phase 2: ฐานข้อมูล Neon (Least Privilege & Migrations)

### 2.1 ยืนยัน Production Database Branch
1. เข้า **Neon Console** → เลือกโปรเจกต์ Production
2. ตรวจสอบว่า Branch หลักคือ `production` หรือ `main`
3. ทำการสร้าง Branch สำรองชั่วคราว (Safety Snapshot) ก่อนทำการเปลี่ยนแปลง

### 2.2 บังคับใช้ Least Privilege Roles
1. เปิด **Neon SQL Editor** โดยใช้สิทธิ์ผู้ดูแลสูงสุด (Owner/Admin)
2. รันสคริปต์ [packages/db/sql/0008_least_privilege_roles.sql](file:///c:/Users/sirac/Downloads/southaeropart_project/southaeropart_project/packages/db/sql/0008_least_privilege_roles.sql) เพื่อสร้างบทบาทแยกส่วน:
   - `southaero_storefront`: มีสิทธิ์เฉพาะตารางหน้าร้าน (`SELECT` สินค้า, `INSERT/UPDATE` ออเดอร์และคิวงาน) **ไม่มีสิทธิ์อ่านข้อมูลแอดมินหรือรัน DDL**
   - `southaero_admin`: มีสิทธิ์จัดการแคตตาล็อก, สต็อก, คำสั่งซื้อ, คิว Reconciliation และตรวจสอบ Audit Logs
   - `southaero_migration`: สิทธิ์สูงสุดสำหรับรัน Migration เมื่อมีการอัปเดตระบบ
3. นำ Connection String ที่แยก User ไปกำหนดใน Environment ของแต่ละแอปพลิเคชัน:
   - Storefront ➔ ชี้ด้วย Role `southaero_storefront`
   - Admin ➔ ชี้ด้วย Role `southaero_admin`

### 2.3 ตรวจสอบสถานะ Migrations
1. รันตรวจสอบว่า Migrations ทั้งหมดถึงลำดับ `0007_reconciliation_resolution.sql`:
   ```bash
   pnpm db:migrate
   ```
2. ตรวจสอบว่าไม่มี Migration ค้างอยู่

---

## Phase 3: การตั้งค่าผู้ให้บริการภายนอก (Third-Party Providers)

### 3.1 Stripe Payments (สลับสู่ Live Mode)
1. **Live API Keys:**
   - ใน Stripe Dashboard สลับ toggle ด้านบนเป็น **Live Mode**
   - นำค่าคีย์มาใส่ในเซิร์ฟเวอร์:
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
     - `STRIPE_SECRET_KEY=sk_live_...`
2. **ตั้งค่า Production Webhook Endpoint:**
   - ไปที่ **Developers** ➔ **Webhooks** ➔ **Add destination**
   - **Endpoint URL:** `https://southaero.com/api/webhooks/stripe`
   - **Events to listen:**
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - บันทึกและคัดลอก **Signing Secret (`whsec_...`)**
   - นำไปใส่ใน `STRIPE_WEBHOOK_SECRET` ของเซิร์ฟเวอร์

### 3.2 Clerk Authentication
1. ใน Clerk Dashboard สลับโปรเจกต์เป็น **Production Instance**
2. ตั้งค่า **Custom Domain:** ผูกโดเมนย่อยยืนยันตัวตน (เช่น `auth.southaero.com`)
3. นำคีย์ Production มาบันทึก:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
   - `CLERK_SECRET_KEY=sk_live_...`
4. **ตั้งค่า Clerk Webhook:**
   - **Endpoint URL:** `https://southaero.com/api/webhooks/clerk`
   - คัดลอก Signing Secret ใส่ใน `CLERK_WEBHOOK_SECRET`

### 3.3 Resend (ระบบอีเมล)
1. ใน Resend Dashboard ➔ **Domains** ➔ เพิ่มโดเมน `southaero.com`
2. นำค่าเรคคอร์ด DNS (SPF, DKIM, DMARC) ไปใส่ใน Cloudflare DNS
3. ยืนยันจนขึ้นสถานะ **Verified**
4. กำหนดค่าในเซิร์ฟเวอร์:
   - `RESEND_API_KEY=re_live_...`
   - `RESEND_FROM_EMAIL=South Aero <orders@southaero.com>`
   - `ADMIN_ALERT_EMAIL=security@southaero.com,ops@southaero.com`

### 3.4 Cloudinary (Media CDN)
1. ใน Cloudinary Dashboard ➔ **Settings** ➔ **Security**:
   - เปิดใช้งาน **Strict Transformations** (ป้องกันการ Render รูปภาพขนาดอื่นโดยไม่ได้รับอนุญาต)
   - เปิดใช้งาน **Restricted Media Types**
2. นำ Production Credentials มาบันทึก:
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`

---

## Phase 4: การจัดเตรียมความลับระดับเซิร์ฟเวอร์ (Internal Secrets & Validation)

### 4.1 สร้างรหัสความลับความปลอดภัยสูง (Secure Random Secrets)
สร้างคีย์ใหม่เฉพาะของ Production ที่มีความยาวอย่างน้อย 44–64 ตัวอักษร (ห้ามใช้ค่าเดียวกับตอนทดสอบบน Localhost):

```bash
# ตัวอย่างคำสั่งสร้าง Random Hex 64 ตัวอักษร
openssl rand -hex 32
```

สร้างค่าสำหรับตัวแปรต่อไปนี้:
- `ADMIN_SESSION_SECRET` (อย่างน้อย 32 ตัวอักษร)
- `ADMIN_MFA_ENCRYPTION_KEY` (Hex 64 ตัวอักษร สำหรับเข้ารหัส TOTP)
- `ORDER_TOKEN_SECRET` (อย่างน้อย 32 ตัวอักษร)
- `REALTIME_SECRET` (อย่างน้อย 32 ตัวอักษร)
- `MAINTENANCE_SECRET` (อย่างน้อย 32 ตัวอักษร)
- `ADMIN_BOOTSTRAP_TOKEN` (สร้างชั่วคราวสำหรับใช้งานใน Phase 5)

### 4.2 ตรวจสอบความถูกต้องด้วย Pre-flight Validator
ก่อนสั่งรันระบบจริง ให้รันตรวจสอบความถูกต้องของค่า Environment ทั้งหมด:

```bash
pnpm env:check --mode production
```

**เกณฑ์ผ่าน:** ต้องแสดงผล `PASSED: 19, WARNINGS: 0, FAILURES: 0` เท่านั้น หากมีข้อผิดพลาดให้แก้ไขจนผ่าน 100%

---

## Phase 5: Deploy เซิร์ฟเวอร์ & Bootstrap Super Admin

### 5.1 สั่ง Build และเริ่มต้นเซอร์วิส
1. กำหนด `APP_ENV=production` และ `NODE_ENV=production`
2. รันคำสั่งสร้าง Production Bundle:
   ```bash
   pnpm build
   ```
3. เริ่มต้นการทำงานของ Service ผ่าน Docker / PM2 / Systemd

### 5.2 ลงทะเบียน Super Admin คนแรก (One-Time Bootstrap)
1. เข้าไปที่: `https://admin.southaero.com/setup`
2. กรอก `ADMIN_BOOTSTRAP_TOKEN` ที่สร้างไว้
3. กำหนดอีเมล, รหัสผ่านที่รัดกุม, และสแกน QR Code เพื่อเปิดใช้งาน **MFA (TOTP)**
4. เข้าสู่ระบบสำเร็จและตรวจสอบสิทธิ์ `super_admin`
5. ⚠️ **ดำเนินการทันที:** **ลบตัวแปร `ADMIN_BOOTSTRAP_TOKEN` ออกจาก Environment บนเซิร์ฟเวอร์ และ Restart เซอร์วิส Admin** เพื่อปิดช่องทาง Setup ถาวร

---

## Phase 6: ตั้งค่าตัวตั้งเวลางานเบื้องหลัง (Cron Maintenance)

ตั้งค่า External Cron Trigger (ผ่าน Cloudflare Cron Triggers, GitHub Actions หรือ Cron ของเซิร์ฟเวอร์) ให้ยิงเรียก:

- **Method:** `POST`
- **URL:** `https://southaero.com/api/maintenance/orders`
- **Headers:** `Authorization: Bearer <MAINTENANCE_SECRET>`
- **ความถี่:** ทุก 1–2 นาที

**การทดสอบ:**
ยิงทดสอบด้วย `curl`:
```bash
curl -X POST https://southaero.com/api/maintenance/orders \
  -H "Authorization: Bearer YOUR_MAINTENANCE_SECRET"
```
ต้องได้รับการตอบกลับ HTTP 200 พร้อม JSON `{ released: 0, failed: 0, ... }`

---

## Phase 7: การทดสอบ 10 Verification Gates บน Production

ดำเนินการทดสอบตามตารางด้านล่างและบันทึกผลลงใน [audit/secure_checklist.md](file:///c:/Users/sirac/Downloads/southaeropart_project/southaeropart_project/audit/secure_checklist.md):

| # | รายการทดสอบ | วิธีการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผู้รับผิดชอบ |
| :-: | :--- | :--- | :--- | :-: |
| 1 | **SSL & Security Headers** | `curl -I https://southaero.com` | พบ `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, และ Nonce-based CSP | DevOps |
| 2 | **Admin Superuser Setup** | เข้า `/setup` อีกครั้งหลังจากลบ Token | ต้องขึ้น Error ปฏิเสธการเข้าถึง ไม่สามารถ Setup ซ้ำได้ | Security Lead |
| 3 | **Admin MFA Enforcement** | ล็อกอินผ่าน `https://admin.southaero.com/login` | บังคับใส่รหัส OTP จากแอป Authenticator ถึงจะเข้า Dashboard ได้ | Security Lead |
| 4 | **Catalog & 3D Viewer** | เปิดดูหน้ารายละเอียดสินค้า | รูปภาพจาก Cloudinary โหลดเร็ว และโมเดล 3D หมุนแสดงผลได้ปกติ | Frontend Lead |
| 5 | **Guest Checkout Flow** | สั่งซื้อสินค้า 1 ชิ้นและตัดบัตรจริง (Micro-payment) | หักเงินสำเร็จผ่าน Stripe Live Payment Gateway | QA / Lead |
| 6 | **Stock Deduction Atomicity** | ตรวจสอบจำนวนสต็อกของสินค้าที่ซื้อในขั้นตอนที่ 5 | สต็อกลดลงแม่นยำ 1 ชิ้น ไม่มีการลดเบิ้ล | QA / Lead |
| 7 | **Stripe Webhook Delivery** | ตรวจสอบ Event ใน Stripe Dashboard และตาราง Orders | Webhook ตอบกลับ 200 และสถานะออเดอร์เปลี่ยนเป็น `paid` อัตโนมัติ | Backend Lead |
| 8 | **Customer Receipt Email** | ตรวจสอบกล่องจดหมายของอีเมลที่ใช้สั่งซื้อ | ได้รับใบเสร็จคำสั่งซื้อจาก South Aero ลง Inbox ปกติ (ไม่ตก Spam) | QA / Lead |
| 9 | **Shipping Quote Request** | ทดสอบกรอกแบบฟอร์มขอใบเสนอราคาค่าส่ง | ข้อมูลบันทึกเข้า DB และแสดงในหน้า Admin Shipping Quotes | QA / Lead |
| 10 | **Maintenance Worker** | ตรวจสอบ Log ของ Cron Job ที่ยิงทุก 1 นาที | ตอบกลับ HTTP 200 สม่ำเสมอ ไม่มี Error | DevOps |

---

## แผนฉุกเฉินและการย้อนคืนระบบ (Rollback Plan)

หากพบข้อผิดพลาดร้ายแรงระหว่าง Go-Live:
1. **Stripe Payment Issue:** สลับ API Key กลับสู่ Test Mode ทันที หรือปิดชั่วคราวผ่าน Feature Flag
2. **Database Issue:** กู้คืนข้อมูลจาก Neon Point-in-time Restore Branch
3. **Application Issue:** ย้อนกลับไปยัง Git Release Tag ล่าสุดที่ผ่านการทดสอบ
