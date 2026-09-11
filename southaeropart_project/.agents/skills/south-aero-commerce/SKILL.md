---
name: south-aero-commerce
description: >-
  พัฒนา catalog, vehicle fitment, cart, wishlist, bundles, inventory และ order lifecycle ของ South Aero
  ใช้เมื่อเปลี่ยนสินค้า อะไหล่ย่อย ราคา snapshot หรือการตัด/คืนสต็อก
  สำหรับการยืนยันชำระเงินกับ Stripe ใช้ south-aero-payments ร่วมเฉพาะ flow ที่เกี่ยวข้อง
---

# South Aero Catalog, Orders and Inventory

อ่าน [CLAUDE.md](../../../CLAUDE.md) §4 และ §5.3–5.4
ใช้ [secure-review](../secure-review/SKILL.md) ก่อนและหลังแก้ DB/actions/stock

## เส้นทางข้อมูลหลัก

- Catalog/fitment: [products schema](../../../packages/db/src/schema/products.ts),
  [admin product actions](../../../apps/admin/actions/product.actions.ts),
  [admin bundle actions](../../../apps/admin/actions/bundle.actions.ts)
  และ [catalog actions](../../../apps/admin/actions/catalog.actions.ts)
- Cart/wishlist: [cart actions](../../../apps/storefront/actions/cart.actions.ts),
  [CartProvider](../../../apps/storefront/components/providers/CartProvider.tsx),
  [wishlist actions](../../../apps/storefront/actions/wishlist.actions.ts)
- Orders: [orders schema](../../../packages/db/src/schema/orders.ts),
  [checkout actions](../../../apps/storefront/actions/checkout.actions.ts),
  [fulfillment](../../../apps/storefront/lib/order-fulfillment.ts),
  [admin order actions](../../../apps/admin/actions/order.actions.ts)

## Catalog และ cart

- ตรวจ `single`/`bundle`, status, SKU/slug, compatibility กับ brand/model/year,
  material/installation และ image references ตาม schema จริง
- ใช้ price/status/stock จาก server เป็นข้อเท็จจริง; client cart ส่ง identity/quantity/options
  แล้ว server ตรวจใหม่ตอน checkout รวมรายการที่เลิกขายหรือ compatibility เปลี่ยน
- การแก้ product/bundle ต้องรักษา fields สองภาษาและสัมพันธ์ของ child parts
  ไม่ให้ product ชี้กลับมาหาตัวเองหรือสร้าง bundle composition ที่ flow ไม่รองรับ
- Wishlist/cart ของบัญชีต้อง scope ownership; ตรวจ login merge behavior หากแก้ local/server cart
  ไม่ย้ายของในตะกร้าระหว่างบัญชีโดยอิง localStorage อย่างเดียว

## Bundle และ order invariants

1. แตก bundle เป็นความต้องการต่อ child part: จำนวน bundle ที่ซื้อ × จำนวน part ต่อ bundle
   รวมความต้องการของ part เดียวกันจาก single items และทุก bundle ในออเดอร์ก่อนตรวจ stock
2. Capacity ของ bundle ขึ้นกับ part ที่ขาดก่อน; หากมี cached bundle stock ต้องตรวจทุกเส้นทาง sync
   ไม่ถือว่าหัก parent stock อย่างเดียวเท่ากับหักอะไหล่ย่อยแล้ว
3. ตรวจ/ตัด/คืน stock กับ order/payment/history ที่ต้องสอดคล้องกันใน transaction เดียว
   ใช้ conditional decrement หรือ locks พร้อมตรวจ affected rows และคงลำดับ lock ของ parts
4. ส่ง `tx` ให้ helpers ทั้งหมด ตรวจทั้ง fulfillment และ cancel/restore
   retry/duplicate request ต้องไม่ตัดหรือคืน stock ซ้ำ
5. เก็บ order item และ bundle-part snapshots เพื่อรักษาราคา จำนวน และรายละเอียดขณะซื้อ
   invoice/history ต้องไม่เปลี่ยนย้อนหลังตาม catalog ปัจจุบัน
6. เงินเป็น decimal string; คำนวณ subtotal/shipping/tax/discount จาก server
   ใช้หน่วยย่อยแบบ integer หรือ decimal-safe arithmetic ตาม flow ไม่บวก `parseFloat` แบบสะสม
7. ตรวจ state transitions จาก enums และ callers จริง ไม่รวม order/payment/fulfillment status เป็นสถานะเดียว
   delayed payment หลัง cancel/expiry หรือ stock ไม่พอต้องมี recovery ตาม §5.3
8. Revalidate data views หลัง commit; email/realtime failures ต้องไม่ทำให้ fulfillment รันซ้ำ

## ตรวจ behavior ที่เสี่ยง

เลือกกรณีที่เปลี่ยน: single+bundle แชร์ part, หลาย bundles แชร์ part, แย่งชิ้นสุดท้าย,
rollback กลาง transaction, duplicate fulfillment/cancel และแก้ catalog หลัง order เกิด
ใช้ [south-aero-testing](../south-aero-testing/SKILL.md) ก่อนรัน verify scripts
เมื่อแตะ provider/payment binding ใช้ [south-aero-payments](../south-aero-payments/SKILL.md)

