---
name: south-aero-ui
description: >-
  สร้างหรือปรับหน้าจอและ components ของ South Aero ด้วย React, Tailwind และ UI ที่มีใน repo
  ครอบคลุม responsive layout, accessibility, form states และ loading/error UX
  ใช้กับ Storefront และ Admin; งาน WebGL ใช้ south-aero-3d และงานคำแปลใช้ south-aero-i18n
---

# South Aero UI

อ่าน [CLAUDE.md](../../../CLAUDE.md) §1 และ §4 พร้อม page/layout/component ใกล้เคียง
รักษาภาษาภาพของหน้าที่แก้ เว้นแต่ผู้ใช้ขอออกแบบใหม่

## อ่านระบบ UI ที่มีจริง

- Storefront: [globals.css](../../../apps/storefront/app/globals.css),
  [Tailwind config](../../../apps/storefront/tailwind.config.js),
  [layout components](../../../apps/storefront/components/layout)
- Admin: [globals.css](../../../apps/admin/app/globals.css),
  [Tailwind config](../../../apps/admin/tailwind.config.js),
  [dashboard layout](../../../apps/admin/app/%28dashboard%29/layout.tsx)
- Shared UI: [exports](../../../packages/ui/src/index.ts) และ [cn](../../../packages/ui/src/lib/utils.ts)
  ตรวจ component ที่มีอยู่ก่อนใช้งาน; อย่าสมมติว่า shadcn-style หมายถึงติดตั้ง shadcn components ครบแล้ว

## ทำ interaction ให้ครบ

1. แยก data loading ฝั่ง server ออกจาก client interaction ตามขอบเขตที่จำเป็น
   รักษา layout/metadata ฝั่ง server และลด props ให้เหลือข้อมูลที่ใช้จริง
2. Form ต้องมี labels, field errors, submit pending, success และ retry ที่รักษาค่าที่กรอก
   disable การ submit ซ้ำช่วย UX แต่ไม่ได้ทดแทน server idempotency
3. Loading/skeleton ใช้พื้นที่ใกล้เคียงเนื้อหาจริง ลด layout shift; แยกไม่มีข้อมูลออกจากโหลดผิดพลาด
   อย่าเปลี่ยน query failure เป็นรายการว่างจนผู้ใช้เข้าใจผิด
4. ตรวจ keyboard, focus-visible, modal focus/close/return, accessible name ของ icon buttons
   และ contrast; อย่าใช้สีอย่างเดียวบอกสถานะ order/payment
5. ตรวจ mobile, tablet, desktop รวมข้อความไทย/อังกฤษยาว ราคา และ touch targets
   เคารพ reduced motion และคงการใช้งานได้เมื่อ animation ถูกลด
6. รูปสินค้าคง aspect ratio และ alt ที่มีความหมาย ใช้ Next Image/CldImage ตาม flow เดิม
   ให้ `sizes` สอดคล้อง layout ไม่ตั้ง priority ให้ทุกภาพใน grid

## ตรวจผลที่ผู้ใช้เห็น

เปิด route ที่แก้เมื่อมี browser/dev server ให้ใช้ ตรวจ flow จริงทั้ง keyboard และขนาดหน้าจอที่เกี่ยวข้อง
หากเปิดไม่ได้ ให้บอกว่าตรวจ layout ด้วย browser ยังไม่ได้ ไม่อ้างผลจากการอ่าน CSS
ใช้ [south-aero-testing](../south-aero-testing/SKILL.md) เลือก lint/typecheck โดยไม่เพิ่ม tests ที่ตรวจเพียง class names

ข้อความ Storefront ที่เพิ่มใช้ [south-aero-i18n](../south-aero-i18n/SKILL.md)
Admin table/analytics ใช้ [south-aero-admin](../south-aero-admin/SKILL.md) เมื่อเปลี่ยน data behavior
งาน CSS/copy ล้วนไม่ต้องเปิด security audit; ถ้าแตะ action/auth/upload ให้ใช้
[secure-review](../secure-review/SKILL.md) เฉพาะส่วนที่เข้า scope

