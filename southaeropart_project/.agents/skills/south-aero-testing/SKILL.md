---
name: south-aero-testing
description: >-
  เลือกและรันการตรวจ South Aero ให้ตรงการเปลี่ยนแปลง รวม lint, typecheck, build, regression และ test isolation
  ใช้เมื่อแก้ bug, เพิ่ม behavior tests, ตรวจงานก่อนส่ง หรือแก้ verification scripts
  ไม่อนุมานว่า pnpm verify เป็นคำสั่ง read-only
---

# South Aero Verification and Debugging

อ่าน [CLAUDE.md](../../../CLAUDE.md) §6.2 เป็นข้อกำหนดการทดสอบ
เลือกหลักฐานที่พิสูจน์ behavior ของงาน ไม่เพิ่ม framework/tests สำหรับการเปลี่ยนข้อความหรือ CSS ที่กลับคืนได้ง่าย

## เริ่มจากสิ่งที่ต้องพิสูจน์

1. ตรวจ diff และ baseline errors แยก regression จากปัญหาที่มีอยู่ก่อน
   หา request/input/state ที่ทำให้เกิดอาการก่อนแก้ symptom หรือ disable guard
2. อ่าน script และ transitive imports ก่อน execute โดยเฉพาะ DB/provider/env initialization
   ชื่อ `test`/`verify`/`scratch` และตำแหน่ง guard ในไฟล์ไม่พิสูจน์ว่าไม่มี side effect ก่อน guard
3. เลือกคำสั่งที่มีจริงใน [command guide](references/commands.md)
   ไม่มี root `pnpm test`/`pnpm typecheck` ให้ใช้โดยอนุมานจากชื่อทั่วไป
4. งานเอกสาร/skills ตรวจ diff, frontmatter และ relative references ก็พอ
   งาน code รัน lint/typecheck ส่วนที่เกี่ยวข้อง; build เมื่อกระทบ integration/config
5. เพิ่ม regression test เมื่อ behavior มีความเสี่ยงหรือ bug มีโอกาสกลับมา
   ใช้ assertions ของ observable outcome ไม่ mirror implementation, class names หรือ console success
6. Pure logic tests หลีกเลี่ยง import barrel ที่ initialize DB/providers
   ใช้ existing runner; หากต้องเพิ่ม test dependency ให้ทำเฉพาะเมื่อ scope ต้องใช้และยังไม่มีทางเหมาะสมใน repo

## Tests ที่มี side effects

ก่อน order/Stripe verification หรือ test ที่เขียน DB/เรียก provider ต้องอ่าน
[isolation guide](references/isolation.md) และยืนยันเงื่อนไขทั้งหมด
หากทำไม่ได้ หยุดเฉพาะคำสั่งนั้น ทำ static/local checks ที่ปลอดภัยต่อและระบุ **ยังไม่ตรวจ**
อย่า set bypass flag, เปลี่ยนชื่อ DB หรือแต่ง env เพื่อให้ guard ผ่านโดยไม่มี isolation จริง

## เลือกกรณีตามงาน

- Auth: direct endpoint invocation, revoked/expired session, cross-user ownership และ role changes
- Commerce/payment: totals, shared bundle parts, final-stock concurrency, duplicate/out-of-order events,
  rollback และ provider-success/DB-failure
- Media: forged MIME/public ID, quota, unauthorized delete และ moderation failure
- UI/i18n: pending/empty/error, keyboard, mobile, switch locale→refresh และ hydration
- 3D: resource ownership, remount, adaptive/manual quality; แยก headless checks ออกจาก browser visual evidence

อ่าน race assertions ว่าควบคุม simultaneous attempts จริงหรือเพียงเรียก sequential
ตรวจ state ใน DB/provider หลัง failure/retry ไม่ใช้แค่ response status เป็นหลักฐาน

## สรุปผล

รายงานคำสั่งและผลตามจริง พร้อม baseline failure หรือเหตุผลที่ยังไม่ได้รัน
แยก static/typecheck/build/unit/integration/browser evidence; ไม่อ้างว่า lint ผ่านหมายถึง payment หรือ security ผ่าน
รันซ้ำหลังแก้ failure/เปลี่ยน code ที่เกี่ยวข้อง ไม่วน broad suite ที่ผ่านแล้วโดยไม่มีเหตุ
ใช้ [secure-review](../secure-review/SKILL.md) กับ security controls ที่ behavior tests นั้นเกี่ยวข้อง

