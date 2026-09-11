# Service integrations

อ่านเฉพาะหัวข้อที่ตรงกับงาน ไฟล์ในรายการเป็น entrypoints ไม่ใช่หลักฐานว่า control ครบแล้ว

## Public APIs และ currency

- เริ่มจาก [API routes](../../../../apps/storefront/app/api), [currency helper](../../../../apps/storefront/lib/currency.ts)
  และ [CurrencyProvider](../../../../apps/storefront/components/providers/CurrencyProvider.tsx)
- แยก public catalog/currency/vehicle responses ออกจาก order/profile responses ที่ต้องตรวจสิทธิ์
  validate query, limit, enum และ sort identifier; กำหนด timeout/error/cache ของ upstream
- ตรวจว่า rate fallback/stale data ถูกแสดงอย่างไร ไม่เปลี่ยนอัตราสำหรับแสดงราคาให้กลายเป็นยอดเรียกเก็บเงินจริงโดยปริยาย
- เมื่อรับ URL ให้จำกัดต้นทาง/ปลายทางตามงานก่อน fetch; ไม่สร้าง open proxy และไม่ log credential ของ upstream

## Realtime

- เริ่มจาก [realtime route](../../../../apps/storefront/app/api/realtime/route.ts),
  [admin notifier](../../../../apps/admin/lib/realtime-notifier.ts),
  [admin actions](../../../../apps/admin/actions/realtime.actions.ts),
  [storefront provider](../../../../apps/storefront/components/providers/RealtimeLiveProvider.tsx)
  และ [admin provider](../../../../apps/admin/components/providers/realtime-provider.tsx)
- Trace publisher → transport → subscriber → refetch/invalidation ก่อนเปลี่ยน event payload
  แยก public catalog update ออกจากข้อมูล order/admin/PII และตรวจสิทธิ์ subscribe
- Publish หลัง commit; client ต้องทน event ซ้ำ หลุดการเชื่อมต่อ และ reconnect โดยอ่าน authoritative state ใหม่ได้
  cleanup listeners/timers/connection เมื่อ unmount และใช้ bounded backoff
- ตรวจจำนวน connection และพฤติกรรมหลาย instance ก่อนอ้างว่า in-memory notification รองรับ production
  คง fallback ที่ผู้ใช้ยังเห็นข้อมูลอัปเดตได้เมื่อ transport ล้มเหลว

## Email, newsletter และ shipping

- เริ่มจาก [Resend helper](../../../../packages/lib/src/resend.ts),
  [order email](../../../../apps/storefront/lib/order-email.ts),
  [shipment email](../../../../apps/admin/lib/shipment-email.ts),
  [newsletter actions](../../../../apps/admin/actions/newsletter.actions.ts)
  และ [unsubscribe route](../../../../apps/storefront/app/api/newsletter/unsubscribe/route.ts)
- ส่ง order/shipment notifications หลัง durable business commit พร้อม outbox หรือ retry ที่ deduplicate ได้
  หากส่งล้มเหลวต้องไม่เรียก fulfillment หรือตัด stock ซ้ำ
- แยก transactional email กับ newsletter consent/unsubscribe; คง opt-out ในการเลือก recipients
  escape ข้อมูลผู้ใช้ใน template และส่งเฉพาะ PII ที่ recipient มีสิทธิ์เห็น
- ตรวจ carrier/status semantics จาก [carrier helper](../../../../packages/lib/src/carrier.ts)
  อย่าอนุมานว่าเปลี่ยน label ใน UI เท่ากับเปลี่ยน shipment state
- การพัฒนา template ไม่ใช่คำสั่งส่ง campaign จริง ใช้ preview/email sink และ fixtures สำหรับการทดสอบ
  ถ้าผู้ใช้อนุญาตให้ส่งแล้วให้รักษาขอบเขต recipients/content ของคำขอนั้น ไม่ขอซ้ำโดยไม่มีเหตุ

