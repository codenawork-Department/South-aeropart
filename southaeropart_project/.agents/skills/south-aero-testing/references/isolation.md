# DB and provider test isolation

ใช้ [CLAUDE.md](../../../../CLAUDE.md) §6.2 เป็นข้อกำหนดหลัก อ่าน runner จริงก่อนใช้
การผ่าน guard/random schema เป็นเพียงส่วนหนึ่งของ isolation ไม่พิสูจน์ว่า credentials เข้า production ไม่ได้
ตรวจ target/project/role โดยไม่แสดง connection strings, keys หรือ private fixture records

## เลือก runner ให้ตรงหลักฐาน

| Runner | Guard / isolation ปัจจุบัน | สิ่งที่ยังอ้างไม่ได้ |
|---|---|---|
| [Simple verifier](../../../../apps/storefront/scripts/verify-security-integration.ts) (`verify`, `verify:stripe`) | โหลด root `.env`, opt-in `ALLOW_ISOLATED_SECURITY_TESTS=true`, reject production/live Stripe; dynamic imports หลัง guard, random schema/search_path/journal, fixtures ของ run, ปิด external email | ไม่วัด native HTTP หรือ email delivery; flag/schema ไม่ตรวจ independent test-only DB role |
| [Native runtime](../../../../packages/security-harness/src/integration/native-runtime.ts) (`native --all`/กลุ่มย่อย) | opt-in, reject production parent, Stripe/Clerk test keys, random schema + copied apps, run-owned provider fixtures, loopback Resend sink และ cleanup; child production HTTPS ใช้ staging/test providers | ไม่ใช่ live deployment/external email/OAuth/media validation ทั้งหมด; ไม่มี exact DB endpoint/role allowlist จาก guard อีกไฟล์โดยอัตโนมัติ |
| [Stateful E2E launcher](../../../../scripts/run-stateful-e2e.mjs) / [test guard](../../../../apps/storefront/scripts/test-guard.ts) | disposable `TEST_DATABASE_URL`, `TEST_DATABASE_DISPOSABLE=true`, ไม่ใช้ production/live Stripe/Resend; ตรวจ launcher ที่ตั้ง target และ port 3005 | fixture lifecycle คนละชุดกับ native; ห้ามแทนด้วย DB ที่ใช้งานร่วมกับผู้ใช้ |
| [Offline/contract isolation guard](../../../../packages/security-harness/src/isolation-guard.ts) | ใช้ exact endpoint/role allowlist เมื่อขอ DB และ fail closed หากยังไม่มี verified sink | ไม่ใช่ guard ที่ native-runtime เรียกโดยอัตโนมัติ ห้ามนำชื่อ env ของ guard นี้มาอ้างว่าป้องกัน native แล้ว |

`verify_loop.ts` และ `verify_stripe_loop.ts` เป็น retired stubs ที่ throw; ไม่คืน implementation เดิมหรือใช้ `ALLOW_TEST_MUTATIONS` เป็นทางลัด

## Preflight ที่ต้องยืนยันก่อน side effects

1. ตรวจ effective env และ imports ก่อนเปิด DB/provider clients แม้ไฟล์จะชื่อ test/verify
   static imports ถูก evaluate ก่อน top-level call; ใช้ bootstrap/dynamic imports หรือ explicit clients ตาม runner
2. Target ต้องเป็น development/test project ที่ผู้ใช้อนุญาต และ credentials แยกจาก production
   random schema จำกัด fixture scope แต่ใช้ connection เดิมสร้าง schema จึงไม่ทดแทน credential isolation
   หากยืนยันไม่ได้หยุดเฉพาะ integration และรายงานข้อจำกัด ไม่แก้ flag/ชื่อ DB เพื่อให้ผ่าน
3. ตรวจ search_path ของทุก pool/app copy ก่อน migration/fixtures และใช้ journal entries ตามลำดับ
   ห้าม fallback ไป default `db`/public schema หรือ glob รัน SQL ทั้ง directory
4. Stripe/Clerk ใช้ test accounts; identities/payment metadata มี run ID/nonce ไม่ชนหลายกลุ่มใน run เดียว
   cleanup/refund ต้องยืนยัน ownership จาก record/metadata ไม่ enumerate ลบทุก object ใน test account
5. Native email ใช้ loopback transport ที่วัดผลได้จริง; fake-looking Resend key ไม่ใช่ sink
   simple verifier ปิด email ต้องรายงานว่าไม่ได้วัด delivery ห้ามส่ง receipt/campaign ถึงลูกค้าระหว่าง test
6. Read-only/offline checks ที่ทำได้อย่างปลอดภัยดำเนินต่อได้แม้ integration ยังไม่พร้อม
   missing/unknown/live configuration ต้องถูก reject ก่อน side effects และไม่พิมพ์ raw provider/SQL errors ที่มี secrets

## Cleanup และ evidence

- Cleanup ใน `finally` เฉพาะ schema, child processes, assets, Clerk identities และ Stripe intents ของ run
  ห้าม restore stock snapshot ทับ concurrent writes หรือหยุด process ทั้งเครื่อง
- ตรวจ cleanup flags/observations จริง ไม่ใช้ exit 0 เป็นหลักฐานอย่างเดียว
  interrupted/failed run ต้องอ่าน private ownership record และ reconcile ที่ค้างก่อน retry โดยไม่เผยแพร่ record นั้น
- Production HTTPS check ใช้ loopback certificate ชั่วคราวและ exception เฉพาะ test browser context
  ห้ามเปลี่ยน OS trust store หรือ global TLS settings; media transport ที่ disabled ไม่ถือว่า media ผ่าน
- เก็บ artifacts แบบ redact: source digests, selected/completed targets, actual observations และ cleanup
  ตรวจ configured-secret leaks ก่อนเผยแพร่ พร้อมบอก scope ของ scan; zero matches ไม่ใช่ full history secret scan
- เมื่อเปลี่ยน runner ให้ทดสอบ rejection ด้วย env จำลองที่ไม่มี credentials จริง
  instrument client factories/transports ว่ายังไม่ถูกเรียกก่อน guard; ไม่ทดสอบ fail-closed โดยลองยิง production
