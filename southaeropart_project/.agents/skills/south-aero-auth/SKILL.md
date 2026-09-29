---
name: south-aero-auth
description: >-
  พัฒนาและแก้ auth, authorization, RBAC และ session ของ South Aero
  ครอบคลุม Clerk customer sync, admin login/session, guest order access และ resource ownership
  ไม่ใช้กับการตกแต่งหน้าล็อกอินที่ไม่เปลี่ยนพฤติกรรมยืนยันตัวตน
---

# South Aero Authentication and Authorization

ใช้ [CLAUDE.md](../../../CLAUDE.md) §5.1–5.2, §5.6 เป็นข้อกำหนด และ
[secure-review](../secure-review/SKILL.md) ก่อนและหลังงานในขอบเขต
อ่าน CLAUDE.md §6.4 เพื่อแยก implementation ที่มีแล้วจาก runtime/production evidence ที่ยังขาด
มี MFA enrollment/challenge/recovery และ session expiry แล้ว; อย่าอ้างว่าทุก external login/recovery flow ผ่านจากการมีโค้ด

## แยกสามเส้นทาง identity

- Customer: [Storefront middleware](../../../apps/storefront/middleware.ts),
  [user sync](../../../apps/storefront/lib/user-sync.ts),
  [Clerk webhook](../../../apps/storefront/app/api/webhooks/clerk/route.ts),
  [users schema](../../../packages/db/src/schema/users.ts)
- Admin: [auth helpers](../../../apps/admin/lib/auth.ts),
  [auth actions](../../../apps/admin/actions/auth.actions.ts),
  [Admin middleware](../../../apps/admin/middleware.ts),
  [admin schema](../../../packages/db/src/schema/admin.ts)
- Guest orders: [guest-order-token](../../../apps/storefront/lib/guest-order-token.ts)
  และ [checkout actions](../../../apps/storefront/actions/checkout.actions.ts),
  [read DTO](../../../apps/storefront/lib/order-read-dto.ts),
  [read limiter](../../../apps/storefront/lib/order-read-limit.ts)

Customer `users` และ `admin_users` เป็นคนละ boundary
ห้าม customer input/Clerk metadata กำหนด admin role หรือใช้ order ID/email เพียงอย่างเดียวเป็นสิทธิ์ guest

## ปรับ flow โดยรักษาสิทธิ์

1. ระบุ caller ที่อนุญาตและ resource ก่อนแก้: anonymous/customer owner/guest token/staff/admin/super_admin
   ไล่ทั้ง page/RSC, Server Action, API และ export/download ที่อ่านข้อมูลเดียวกัน
2. ฝั่ง customer ต้องตรวจผล `auth()` และผูก resource กับ user จาก session
   ฝั่ง admin ตรวจ `validateSession()` กับ role/permission และ resource scope
   middleware/layout/ซ่อนปุ่มไม่ทดแทน guard ของ entrypoint ที่เรียกตรงได้
3. ตรวจว่าการเปลี่ยน role, logout, password reset และ account disable มีผลกับ session ที่ออกไปแล้ว
   อ่าน JWT verification และ session row lookup จริง; การ verify signature อย่างเดียวไม่พิสูจน์ revocation
   คง idle 30 นาที/absolute 8 ชั่วโมง; `validateSession(true)` ใช้เฉพาะ enrollment ที่ตั้งใจอนุญาต
   ห้ามนำ enrollment-only session ไปใช้ protected actions และต้อง consume MFA challenge/recovery code แบบกัน concurrent reuse
4. รักษา password bounds, bcrypt cost, lockout/rate limit และ safe errors ตาม §5.1
   ไม่ bypass login/setup guard เพื่อให้ dev UI ใช้งานได้
5. สำหรับ Clerk webhook ตรวจ raw-body/Svix ก่อนใช้ payload และตรวจ user sync ที่ซ้ำ/ล่าช้า
   ไม่กำหนด customer session guard ให้ webhook ที่ใช้ provider signature
6. ตรวจ cookie scope/expiry/Secure/HttpOnly/SameSite และ CSRF/Origin ของ cookie mutations
   คง public login/catalog/guest flow ที่ออกแบบไว้พร้อม abuse controls
7. Admin mutation ใช้ actor จาก session และ audit ที่ทนต่อ failure;
   role/financial mutation ต้องไม่ commit แล้วทำ audit หายตาม §5.1
   ไม่ log passwords, tokens, session cookies หรือ guest token

Guest HMAC ผูก order/user/createdAt และตรวจอายุ 7 วันฝั่ง server รวม invalid/future date
คง HttpOnly/Secure ใน production/SameSite=Lax cookie และ generic denial ของ order reads
ไม่แทน guest proof ด้วย order ID/email, ไม่เก็บ token ใน analytics/logs และจำกัดการรั่วผ่าน URL/referrer
Rate-limit read actions ใช้ shared DB counter; caller ต้องเคารพ `retryAfter` ใน action envelope และไม่ poll ซ้อนกัน

## พิสูจน์ผล

เลือก tests ตาม flow ที่เปลี่ยน: anonymous, expired/revoked session, A อ่าน/แก้ข้อมูล B,
staff ยกระดับสิทธิ์, role change, invalid guest token และ direct endpoint invocation
การเรียก helper อย่างเดียวไม่ครอบคลุม HTTP/session boundary
ใช้ environment แยกตาม [south-aero-testing](../south-aero-testing/SKILL.md)
และรายงาน runtime cases ที่ยังไม่ได้ทดสอบ

