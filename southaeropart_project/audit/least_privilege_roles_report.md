# South Aero — รายงานการตรวจสอบความปลอดภัยของสิทธิ์ฐานข้อมูล (Least Privilege Report)

> **วันที่ทำการตรวจสอบ:** 2026-10-09T16:23:08.940Z  
> **Database Endpoint:** `postgresql://neondb_owner:***@ep-odd-wildflower-azwpz8oz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb`  
> **สถานะรวม:** ✅ ผ่านการตรวจสอบความปลอดภัย 100%

---

## 1. สถานะของบทบาท (Role Status)
- `southaero_storefront`: ✅ มีอยู่ในระบบ
- `southaero_admin`: ✅ มีอยู่ในระบบ

---

## 2. การแยกส่วนข้อมูลผู้ดูแลระบบ (Admin Isolation Barrier)
หน้าร้าน (`southaero_storefront`) ต้องไม่มีสิทธิ์อ่านหรือเขียนตารางความลับใดๆ ของผู้ดูแลระบบ:
- ตาราง `admin_users`: **ZERO ACCESS (ปิดกั้น 100%)**
- ตาราง `admin_sessions`: **ZERO ACCESS (ปิดกั้น 100%)**
- ตาราง `admin_audit_logs`: **ZERO ACCESS (ปิดกั้น 100%)**

---

## 3. สิทธิ์การจัดการแคตตาล็อกและสต็อกสินค้า
- แก้ไขสต็อกสินค้า (`stock_quantity`): **อนุญาตสำหรับจองสินค้า**
- แก้ไขราคาสินค้า (`price`): **บล็อกถาวร (Tamper-proof)**
- แก้ไขชื่อสินค้า (`name`): **บล็อกถาวร (Tamper-proof)**
