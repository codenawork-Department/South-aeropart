# DB and provider test isolation

ใช้ [CLAUDE.md](../../../../CLAUDE.md) §6.2 เป็นข้อกำหนดหลัก
หน้านี้ช่วยตรวจ runner ของ repo ไม่ใช่การรับรองว่าทดสอบกับ environment ปัจจุบันได้แล้ว

## อ่านก่อนรัน

- [verify_loop.ts](../../../../apps/storefront/scripts/verify_loop.ts)
- [verify_stripe_loop.ts](../../../../apps/storefront/scripts/verify_stripe_loop.ts)
- [test-guard.ts](../../../../apps/storefront/scripts/test-guard.ts)
- [DB client](../../../../packages/db/src/client.ts), [Stripe helper](../../../../packages/lib/src/stripe.ts)
  และ [Resend helper](../../../../packages/lib/src/resend.ts)

ตรวจ dotenv preload ใน package scripts ด้วย ไม่ตรวจเฉพาะ function body
Static imports ถูก evaluate ก่อน top-level function call; การวาง `assertTestIsolation()`
เหนือบรรทัด import ในข้อความไฟล์ไม่ได้รับประกันว่า client initialization รอ guard
ถ้าจำเป็นให้ bootstrap ตรวจ config ก่อน dynamic import หรือใช้ dependency injection/explicit clients

## สิ่งที่ต้องยืนยัน

1. Test DB/project อยู่ใน allowlist ของ environment แยก และ credentials ใช้ production ไม่ได้
   ตรวจ effective endpoint/project ด้วยวิธีที่ไม่พิมพ์ secret
2. Fixtures เป็นของ run นี้ ระบุ run ID และตรวจ queries ทุกตัวให้จำกัดอยู่กับ fixtures
   ห้ามเลือก active product แรกใน shared DB แล้วเปลี่ยน stock เพื่อทดสอบ
3. Stripe ใช้ test account/keys ที่ยืนยันแล้ว และ email ส่งเข้า sink/transport ที่ไม่ส่งถึงลูกค้าจริง
   test ต้องไม่ตกไปใช้ default live client ผ่าน transitive import
4. Automated guard ทำงานก่อนสร้าง client/เปิด network/side effects;
   missing/unknown/live configuration ต้อง fail closed
5. Cleanup อยู่ใน `finally` และลบเฉพาะ fixture/assets ของ run
   ห้าม restore snapshot ของ shared stock ทับ concurrent writes
   bounded retries ต้องไม่สร้าง payment/email ซ้ำ

## ตรวจ guard ตาม implementation จริง

ในโค้ดที่ใช้สร้างคู่มือนี้ guard ตรวจชื่อ host/substring ที่คล้าย test และมี
`ALLOW_TEST_MUTATIONS` override ให้กลับไปอ่าน source ทุกครั้งเมื่อใช้งาน
ชื่อ DB, `NODE_ENV=test` หรือการเปิด override ไม่พิสูจน์ credential isolation,
email sink หรือ run-owned fixtures ตาม §6.2 จึงไม่ใช่เหตุผลให้ข้ามรายการด้านบน

ทดสอบ guard ด้วย missing/unknown/live config ใน process แยกที่ไม่มี credential จริง
และ instrument client factory/transport ว่าไม่ถูกเรียกก่อน rejection
เมื่อ environment ยังยืนยันไม่ได้ ให้ทำ pure unit/static checks ต่อและรายงาน integration **ยังไม่ตรวจ**
อย่าปรับ guard ให้ผ่านเพื่อใช้ legacy runner กับข้อมูลที่ยังไม่แยก

