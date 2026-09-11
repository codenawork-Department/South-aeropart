---
name: south-aero-payments
description: >-
  พัฒนา Stripe PaymentIntent, Elements, PromptPay, payment webhooks, refunds และ payment recovery ของ South Aero
  ใช้เมื่อเปลี่ยน payment authorization, idempotency, amount/currency binding หรือ mock payment
  ไม่ใช้กับการแสดงราคาที่ไม่เปลี่ยนยอดหรือ flow การชำระเงินจริง
---

# South Aero Stripe Payments

อ่าน [CLAUDE.md](../../../CLAUDE.md) §5.3 และ §6.2 พร้อม
[secure-review](../secure-review/SKILL.md) ก่อนและหลังแก้ payment flow
Stripe เป็น provider ของโครงการ ไม่เพิ่ม provider ใหม่จากตัวอย่างใน skill

## เริ่มจาก flow ที่มี

- [shared Stripe helper](../../../packages/lib/src/stripe.ts):
  `getStripe`, `createPaymentIntent`, `toSmallestCurrencyUnit`, `constructStripeWebhookEvent`
- [checkout actions](../../../apps/storefront/actions/checkout.actions.ts):
  order ownership, create/reuse intent และ mock actions
- [payment components](../../../apps/storefront/components/checkout):
  `PaymentClient`, `StripePaymentForm` และ checkout state
- [Stripe webhook](../../../apps/storefront/app/api/webhooks/stripe/route.ts),
  [fulfillment](../../../apps/storefront/lib/order-fulfillment.ts),
  [orders schema](../../../packages/db/src/schema/orders.ts)

## รักษา payment contract

1. ตรวจสิทธิ์ต่อ order ก่อนสร้าง/reuse intent หรือคืน `client_secret`
   derive total/currency จาก server snapshot ไม่เชื่อ amount/owner/metadata จาก client
2. เก็บเงินเป็น decimal string แล้วแปลงผ่าน `toSmallestCurrencyUnit()` สำหรับ flow ที่รองรับ
   helper ปัจจุบันจัดทศนิยมสองหลัก; หากเพิ่มสกุล/rounding ต้องตรวจ official currency rules และแก้ contract/tests
   ก่อนใช้ ไม่ใช้ `parseFloat * 100` หรือถือว่า helper ตรวจ input/safe-integer bounds ครบแล้ว
3. ใช้ stable idempotency key ของ operation เดิมทั้ง create/refund retry
   ผูก DB business key/constraint และวาง recovery เมื่อ Stripe สำเร็จแต่ DB บันทึกไม่สำเร็จ
4. Frontend ใช้ Stripe Elements เก็บ secret key ฝั่ง server; ไม่รับ PAN/CVC ผ่านระบบ
   รองรับ pending/processing/failed/canceled ตาม methods ที่มี ไม่ mark paid จาก redirect/client success
5. Webhook ใช้ raw body กับ provider signature ก่อนใช้ payload
   ตรวจ intent ID ที่ผูกไว้, amount received, currency, account และ live/test mode ก่อน fulfillment
   metadata/order number อย่างเดียวไม่ใช่หลักฐานว่าเงินเป็นของ order นั้น
6. กัน event ซ้ำด้วย durable event record และ atomic business-state transition
   ต้องกัน concurrent delivery และต่าง event IDs สำหรับ order/intent เดียว ไม่ใช่แค่ read-then-write `paid`
7. รักษา state เมื่อ events สลับลำดับ; canceled/expired/paid-but-unavailable ต้อง reconcile/compensate
   ใช้ [south-aero-commerce](../south-aero-commerce/SKILL.md) สำหรับ stock transaction
8. ตอบ webhook success หลัง commit หรือ durable enqueue; ให้ retry ได้เมื่อบันทึกไม่สำเร็จ
   ส่ง email ด้วย durable retry/dedup หลัง commit ไม่ทำให้ payment/stock รันซ้ำ
9. Mock payment ต้องปิดฝั่ง server ใน production รวม direct action invocation
   การซ่อนปุ่มหรือแยกหน้า mock ไม่ใช่ guard

ตรวจ wrong signature, wrong owner/amount/currency/intent/mode, duplicate+concurrent delivery,
out-of-order และ provider-success/DB-failure ตาม flow ที่เปลี่ยน
ก่อน `pnpm verify:stripe` ต้องผ่าน
[test isolation](../south-aero-testing/references/isolation.md) และ §6.2
การทดสอบ Stripe ใช้ test account และ email sink; รายงานสิ่งที่ยังไม่ได้ทดสอบตามหลักฐานจริง

