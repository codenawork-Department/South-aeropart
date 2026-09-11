---
name: south-aero-feature
description: >-
  พัฒนา feature หรือแก้ flow ของ South Aero ที่เชื่อม Next.js App Router, Server Actions,
  Route Handlers และ shared packages รวมถึง public API, realtime และ email integration
  ใช้เมื่อเปลี่ยน data flow หรือหลายชั้นของระบบ ไม่ใช้กับการปรับ CSS หรือข้อความล้วน
---

# South Aero Feature Development

อ่าน [CLAUDE.md](../../../CLAUDE.md) §1–4 และไฟล์ใน flow ที่เปลี่ยนก่อนเลือกแนวทาง
เอกสารเป็นข้อกำหนด; implementation ปัจจุบันอาจยังไม่ครบ ห้ามคัดลอกข้อบกพร่องเพียงเพราะเป็น pattern เดิม
เส้นทางด้านล่างเป็นจุดเริ่มค้นหา ให้ตรวจอีกครั้งหาก repository เปลี่ยน

## วางขอบเขตของ feature

- ไล่ page/component → action/handler → guard/validation → query/transaction → DTO → cache/side effects
  เลือก behavior ที่ผู้ใช้จะเห็นและ failure case ที่ต้องรองรับก่อนเพิ่ม abstraction
- Storefront อยู่ [apps/storefront](../../../apps/storefront); Admin อยู่ [apps/admin](../../../apps/admin)
  วาง logic ร่วมใน [packages](../../../packages) ตามหน้าที่ ไม่ import โค้ดข้ามแอป
- ใช้ `@repo/db` สำหรับ schema/client/types, `@repo/lib` สำหรับ provider helpers,
  `@repo/ui` สำหรับ UI ที่มีจริง; ตรวจ exports ก่อน import เพราะ package ไม่ได้มี component ครบตามชื่อ
- อ่าน manifest และ resolved lockfile ก่อนใช้ API ใหม่ ไม่ย้ายตัวอย่างจาก Next.js รุ่นใหม่มาใช้โดยไม่ตรวจ compatibility

## ลงมือพัฒนา

1. ใช้ App Router และ Server Components เป็นค่าเริ่มต้น ส่งเฉพาะ DTO ที่ client ต้องใช้
   จำกัด `"use client"` ไว้ที่ interaction ไม่ส่ง DB/secret/provider SDK ผ่าน shared barrel ไป client
2. UI mutations ใช้ `"use server"` ใน actions; ใช้ Route Handlers สำหรับ webhook/public API ตามสถาปัตยกรรม
   ไม่เพิ่ม REST endpoint ซ้ำกับ action โดยไม่มีความจำเป็นจาก feature
3. Validate untrusted input ด้วย Zod ก่อน business query; protected reads/writes ตรวจ session,
   permission และ ownership ฝั่ง server ส่วน public flow ต้องมีขอบเขตและ abuse control
4. ทำ multi-table writes ที่ต้องสอดคล้องกันใน transaction เดียว ส่ง transaction client เข้า helpers ทุกตัว
   จัดการ external side effects แยกตาม commit/retry semantics ไม่ถือว่า DB rollback provider ได้
5. Revalidate path/tag หลัง mutation สำเร็จ ตรวจทั้งหน้ารายการ รายละเอียด และผู้ใช้ข้อมูลอีกแอป
   การ invalidate cache ของแอปหนึ่งไม่ใช่หลักฐานว่าอีกแอปอัปเดตแล้ว
6. รักษา error contract ของ callers; รองรับ pending/empty/failure และไม่กลืน `redirect()`
   หรือ framework control flow ใน broad catch

## เลือกคู่มือเฉพาะงาน

- Data/schema → [south-aero-database](../south-aero-database/SKILL.md)
- Customer/admin/guest identity → [south-aero-auth](../south-aero-auth/SKILL.md)
- Catalog, cart, bundle, stock, orders → [south-aero-commerce](../south-aero-commerce/SKILL.md)
- Stripe → [south-aero-payments](../south-aero-payments/SKILL.md)
- Upload/moderation → [south-aero-media](../south-aero-media/SKILL.md)
- Public API, realtime หรือ Resend → อ่าน [service integrations](references/service-integrations.md) เฉพาะ flow ที่เกี่ยวข้อง

ใช้ [secure-review](../secure-review/SKILL.md) ก่อนและหลังงานที่เข้า scope ของ skill
เลือก lint/typecheck/behavior checks ตาม [south-aero-testing](../south-aero-testing/SKILL.md)
รายงาน behavior ที่เปลี่ยน จุดที่ได้รับผล และผลตรวจจริง ไม่ขยายงาน feature เป็น audit/rewrite ทั้งระบบ

