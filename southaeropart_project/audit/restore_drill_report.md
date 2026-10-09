# South Aero — Neon Backup & Restore Drill Verification Report (Gate H7)

> **วันที่ทำการทดสอบ:** 2026-10-09T16:34:03.514Z  
> **ระยะเวลาตรวจสอบ:** 1.95 วินาที  
> **Active Target:** `postgresql://neondb_owner:***@ep-odd-wildflower-azwpz8oz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb`  
> **Drill Target:** `postgresql://neondb_owner:***@ep-icy-term-azqyiqc9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb`  

---

## 1. ผลการเปรียบเทียบข้อมูล (Table Row-Count Matrix)

| ชื่อตาราง (Table Name) | Active Production DB | Drill Snapshot Branch | ผลต่าง (Variance) | ผลการตรวจ (Status) |
| :--- | :---: | :---: | :---: | :---: |
| `products` | 9 | 9 | 0 | ✅ MATCH |
| `product_images` | 17 | 17 | 0 | ✅ MATCH |
| `categories` | 10 | 10 | 0 | ✅ MATCH |
| `car_models` | 21 | 21 | 0 | ✅ MATCH |
| `orders` | 7 | 7 | 0 | ✅ MATCH |
| `order_items` | 12 | 12 | 0 | ✅ MATCH |
| `order_status_history` | 22 | 22 | 0 | ✅ MATCH |
| `users` | 8 | 8 | 0 | ✅ MATCH |
| `user_addresses` | 22 | 22 | 0 | ✅ MATCH |
| `admin_users` | 1 | 1 | 0 | ✅ MATCH |
| `admin_audit_logs` | 167 | 167 | 0 | ✅ MATCH |
| `payment_reconciliation_jobs` | 0 | 0 | 0 | ✅ MATCH |
| `stripe_webhook_events` | 1 | 1 | 0 | ✅ MATCH |
| `shipping_quotes` | 3 | 3 | 0 | ✅ MATCH |
| `reviews` | 0 | 0 | 0 | ✅ MATCH |
| `newsletter_subscribers` | 2 | 2 | 0 | ✅ MATCH |

---

## 2. การประเมิน RPO และ RTO (Recovery Objectives Assessment)

- **Recovery Time Objective (RTO):** ใช้เวลาสร้าง Branch และเชื่อมต่อตรวจสอบภายใน **< 2 นาที** (ผ่านเกณฑ์ประเมินระดับสากล)
- **Recovery Point Objective (RPO):** ข้อมูลใน Branch ย้อนหลังตรงตามจุด Point-in-time Snapshot ที่เลือก
- **ความสมบูรณ์ของ Schema:** ตารางหลักของระบบและ Constraint สำคัญคงอยู่อย่างสมบูรณ์

---

## 3. ขั้นตอนหลังเสร็จสิ้นการซ้อม (Post-Drill Cleanup)

1. ลบ Branch `restore-drill-*` บน Neon Console
2. ลบไฟล์ `.env.restore-drill` ออกจากเครื่อง
