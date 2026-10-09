-- =============================================================================
-- SOUTH AERO PERFORMANCE — LEAST PRIVILEGE DATABASE ROLES & GRANTS
-- =============================================================================
-- วัตถุประสงค์: แยกสิทธิ์การเข้าถึงฐานข้อมูลระหว่าง Storefront, Admin และ Migration
-- ตามข้อกำหนด CLAUDE.md §6.3 และ Master Security Checklist หมวดที่ 2 (Gate H8)
--
-- ขั้นตอนการนำไปใช้:
-- 1. ล็อกอินเข้า Neon Console -> Project -> Roles
-- 2. สร้างบทบาทใหม่ 2 ตัว (หรือรัน CREATE ROLE ด้านล่าง):
--      - southaero_storefront (กำหนด Password ปลอดภัยอย่างน้อย 32 ตัวอักษร)
--      - southaero_admin (กำหนด Password ปลอดภัยอย่างน้อย 32 ตัวอักษร)
-- 3. เปิด SQL Editor บน Neon Console ด้วยสิทธิ์ Owner (neondb_owner) แล้วรันสคริปต์นี้
-- 4. นำ Connection String ที่ผูกกับแต่ละ Role ไปใส่ใน Environment Variables:
--      - Storefront: DATABASE_URL สำหรับ storefront_role
--      - Admin: DATABASE_URL สำหรับ admin_role
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. สร้าง Roles (Least-Privilege Clean Architecture ใน Neon)
-- -----------------------------------------------------------------------------
-- ⚠️ ข้อพึงระวังสำคัญของ Neon:
-- หากสร้าง Role ผ่าน Neon Console GUI (ปุ่ม Add role) ระบบจะมอบสิทธิ์ neon_superuser
-- (ซึ่งเข้าถึงข้อมูลได้ทั้งหมด) ให้โดยอัตโนมัติ
-- เพื่อให้เป็น Least-Privilege ที่แท้จริง (แยกสิทธิ์หน้าร้านออกจากแอดมินโดยสิ้นเชิง):
-- ต้องสร้าง Role ผ่านคำสั่ง SQL เท่านั้น เพื่อไม่ให้ติดสิทธิ์ neon_superuser
--
-- ปลดและสร้างใหม่ให้เป็น Restricted Role สะอาด:
DROP ROLE IF EXISTS southaero_storefront;
DROP ROLE IF EXISTS southaero_admin;

-- กำหนดรหัสผ่านที่ปลอดภัย (อย่างน้อย 32 ตัวอักษร)
-- กำหนดรหัสผ่านที่ปลอดภัย (อย่างน้อย 32 ตัวอักษร)
CREATE ROLE southaero_storefront WITH LOGIN NOINHERIT PASSWORD 'REPLACE_WITH_STOREFRONT_PASSWORD';
CREATE ROLE southaero_admin WITH LOGIN NOINHERIT PASSWORD 'REPLACE_WITH_ADMIN_PASSWORD';

-- -----------------------------------------------------------------------------
-- 2. รีเซ็ตสิทธิ์เริ่มต้นใน Schema Public
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO southaero_storefront, southaero_admin;

-- -----------------------------------------------------------------------------
-- 3. กำหนดสิทธิ์สำหรับ STOREFRONT (Least Privilege Runtime Role)
-- -----------------------------------------------------------------------------
-- กฎความปลอดภัยสำคัญ:
-- - Storefront ไม่มีสิทธิ์เข้าถึงตาราง admin_users, admin_sessions, admin_audit_logs โดยเด็ดขาด
--   (ป้องกันการดึงรหัสผ่านแอดมินหรือ Token แม้จะเกิด SQL Injection บน Storefront)
-- - แคตตาล็อกสินค้าเป็น Read-Only (ยกเว้น stock_quantity สำหรับจองสินค้า)
-- - ตารางธุรกรรมลูกค้าให้สิทธิ์ INSERT/UPDATE เท่าที่จำเป็น

-- A. ถอนสิทธิ์ทั้งหมดของ Storefront ก่อนเพื่อความปลอดภัยแบบ Fail-Closed
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM southaero_storefront;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM southaero_storefront;

-- B. แคตตาล็อกสินค้า & การตั้งค่า (Read-Only)
GRANT SELECT ON
  categories,
  brands,
  car_models,
  materials,
  installations,
  products,
  product_images,
  product_compatibility,
  product_bundle_items,
  shipping_settings,
  product_shipping_policies,
  homepage_hero_cards,
  cms_image_slots,
  icons
TO southaero_storefront;

-- C. การจองและตัดสต็อกสินค้า (Atomic Stock Management)
GRANT UPDATE (stock_quantity, updated_at) ON products TO southaero_storefront;

-- D. ตารางธุรกรรมลูกค้า & คำสั่งซื้อ (Read-Write)
GRANT SELECT, INSERT, UPDATE ON
  users,
  user_addresses,
  user_vehicles,
  user_interests,
  user_login_logs,
  orders,
  order_items,
  order_item_bundle_parts,
  order_status_history,
  order_stock_reservations,
  order_email_jobs,
  payment_reconciliation_jobs,
  stripe_webhook_events,
  shipping_quotes,
  reviews,
  review_uploads,
  newsletter_subscribers
TO southaero_storefront;

-- E. ตาราง Rate Limit & Abuse Control (Read-Write-Delete)
GRANT SELECT, INSERT, UPDATE, DELETE ON abuse_buckets TO southaero_storefront;

-- F. Sequences ทั้งหมดสำหรับ Storefront
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO southaero_storefront;

-- -----------------------------------------------------------------------------
-- 4. กำหนดสิทธิ์สำหรับ ADMIN (Application Backoffice Runtime Role)
-- -----------------------------------------------------------------------------
-- Admin จำเป็นต้องอ่านและเขียนข้อมูลได้ทุกตารางในการบริหารจัดการระบบ
-- แต่ไม่มีสิทธิ์ DDL (ห้าม CREATE TABLE, DROP TABLE, ALTER TABLE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO southaero_admin;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO southaero_admin;

-- -----------------------------------------------------------------------------
-- 5. กำหนดสิทธิ์อัตโนมัติสำหรับตารางที่จะสร้างขึ้นในอนาคต (Default Privileges)
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO southaero_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO southaero_admin;

-- =============================================================================
-- สรุป Matrix การจำกัดสิทธิ์ (Security Verification Matrix)
-- =============================================================================
-- Table                      | Storefront        | Admin             | Notes
-- ---------------------------|-------------------|-------------------|----------------------------------
-- admin_users                | NO ACCESS (0)     | SELECT/INS/UPD/DEL| Storefront เข้าถึงไม่ได้ 100%
-- admin_sessions             | NO ACCESS (0)     | SELECT/INS/UPD/DEL| ป้องกันการ hijack session cookie
-- admin_audit_logs           | NO ACCESS (0)     | SELECT/INS        | ป้องกันการดัดแปลง audit log
-- products                   | SELECT + UPD stock| SELECT/INS/UPD/DEL| Storefront แก้ไขได้เฉพาะตัวเลขสต็อก
-- orders                     | SELECT/INS/UPD    | SELECT/INS/UPD/DEL| ปรับสถานะผ่าน Server Actions เท่านั้น
-- payment_reconciliation_jobs| SELECT/INS        | SELECT/UPD        | Storefront สร้างเคส, แอดมินเป็นคนจัดการ
-- =============================================================================
