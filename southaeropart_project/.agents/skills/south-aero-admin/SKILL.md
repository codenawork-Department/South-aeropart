---
name: south-aero-admin
description: >-
  พัฒนา Admin tables, dashboard, KPI และ business analytics ของ South Aero
  ใช้เมื่อแก้ server-driven pagination/sorting/filtering, aggregates, chart data หรือ reporting semantics
  งานตกแต่ง UI ล้วนใช้ south-aero-ui และงาน session ใช้ south-aero-auth
---

# South Aero Admin Data and Analytics

อ่าน [CLAUDE.md](../../../CLAUDE.md) §4 โดยเฉพาะ Admin data grid และ §5.1/5.4
ใช้ [secure-review](../secure-review/SKILL.md) เมื่อเปลี่ยน protected queries/actions/financial data

## จุดเริ่มอ่าน

- [dashboard pages](../../../apps/admin/app/%28dashboard%29) และ
  [dashboard components](../../../apps/admin/components/dashboard)
- [analytics actions](../../../apps/admin/actions/analytics.actions.ts),
  [order actions](../../../apps/admin/actions/order.actions.ts),
  [product actions](../../../apps/admin/actions/product.actions.ts)
- [products table](../../../apps/admin/components/products/products-table.tsx),
  [bundles table](../../../apps/admin/components/bundles/bundles-table.tsx),
  [orders dashboard](../../../apps/admin/components/orders/OrdersDashboardClient.tsx)

## Tables

1. ให้ URL Search Params เป็นแหล่ง state สำหรับ pagination/sorting/filtering ตามข้อกำหนด
   ตรวจ page→action→DB จริง; ถ้า implementation เดิมยังไม่รองรับ อย่าอ้างว่ามีแล้ว
2. Validate page/pageSize/filter และ allowlist sort keys ที่ server
   ใช้ filters เดียวกันกับ items และ total count พร้อม stable tie-breaker ใน ordering
3. Reset/clamp page อย่างมีเหตุเมื่อ filter เปลี่ยนหรือแถวสุดท้ายถูกลบ
   เก็บ query params ที่ไม่เกี่ยวข้องและตรวจ back/forward/bookmark ได้
4. TanStack Table เป็น UI/state layer ตาม stack ของโครงการ;
   server-paginated data ต้องไม่ถูก sort/filter เฉพาะแถวในหน้าปัจจุบันแล้วแสดงเหมือนครอบคลุมทั้งชุด
   ตรวจ component เดิมก่อนตัดสินใจเพิ่มหรือย้าย table implementation
5. จำกัด row payload ไม่ส่ง PII/secret หรือทุกแถวเพื่อให้ client ทำงานเอง
   guards ต้องคุม action/query แม้เข้า URL หรือเรียก action โดยตรง

## Dashboard และตัวเลข

- นิยาม metric ก่อนแก้ query: ช่วงเวลา/timezone, order states ที่นับ,
  revenue/paid/refunded/canceled, shipping/tax, quantity และ cost basis
  หาก schema ไม่มีข้อมูลต้นทุน ห้ามเรียก estimate ว่ากำไรจริงโดยไม่ระบุสมมติฐาน
- ตรวจ joins กับ orderItems/bundle parts ไม่คูณยอด order ซ้ำ และไม่รวมรายได้ single+bundle ซ้อนกัน
  ใช้ snapshots เมื่อรายงานอดีตต้องคงเดิมหลังแก้สินค้า
- คำนวณยอดเงินจริงด้วย decimal-safe arithmetic; แปลงเป็น number เฉพาะ chart boundary ที่ต้องใช้
  โดยเก็บ authoritative totals/rounding ไว้ในชั้นที่เหมาะสม
- แยก zero, missing และ query error; percent change ที่ฐานเป็นศูนย์ต้องมี behavior ที่เข้าใจได้
  chart labels/tooltips ต้องบอกหน่วยและช่วงเวลาเดียวกับ KPI
- อ่าน query cost ก่อนเพิ่ม dashboard panel ลด N+1 และหลีกเลี่ยงเรียก aggregate ชุดใหญ่ซ้ำจากหลาย component
  cache ต้องไม่ทำให้ข้อมูล protected หลุดข้ามสิทธิ์

ตรวจ deep-link/filter/page navigation และ reconcile ยอดจาก fixtures ขนาดเล็กที่คำนวณด้วยมือได้
ใช้ [south-aero-ui](../south-aero-ui/SKILL.md) สำหรับ responsive/keyboard/chart readability
และ [south-aero-testing](../south-aero-testing/SKILL.md) สำหรับการตรวจ query behavior

