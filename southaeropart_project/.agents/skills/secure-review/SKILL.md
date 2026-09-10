---
name: secure-review
description: >-
  ตรวจความปลอดภัยก่อนและหลังแก้โค้ด South Aero ที่แตะ Server Actions, Route Handlers,
  auth/session, RBAC, payment/Stripe/webhook, Drizzle schema/migrations, DB CRUD,
  stock/financial transactions, Cloudinary uploads หรือ security/deployment configuration
  และใช้เมื่อประเมิน production readiness โดยต้องแสดงหลักฐานและสิ่งที่ยังไม่ตรวจ
  ไม่ต้องตรวจทั้งระบบสำหรับงาน CSS/copywriting/pure UI ที่ไม่กระทบ data หรือ security boundary
---

# Secure Review — South Aero

ใช้ [CLAUDE.md](../../../CLAUDE.md) §5 เป็นข้อกำหนด security หลัก และ §6 เป็น production release gates
อ่านหมวดที่เกี่ยวข้องก่อนลงมือและกลับมาตรวจหลังแก้เสร็จ ไม่คัดลอก checklist ทั้งฉบับไว้ที่นี่เพื่อหลีกเลี่ยงข้อกำหนดไม่ตรงกัน
ข้อกำหนดในเอกสารไม่ใช่หลักฐานว่าระบบ implement แล้ว และ baseline นี้ไม่ใช่การรับรอง OWASP ASVS

## 1. กำหนดขอบเขตและความเสี่ยงก่อนลงมือ

- งาน feature/fix: ตรวจส่วนที่เปลี่ยน พร้อม callers, shared guards, schema และ side effects ที่เกี่ยวข้อง ไม่ขยายเป็นแก้ทั้งระบบโดยอัตโนมัติ
- งาน audit/readiness: ตรวจตามขอบเขตที่ผู้ใช้ขอ; หากประเมิน production ให้ครอบคลุม CLAUDE.md §5–§6 และระบุส่วนที่เข้าถึง/ทดสอบไม่ได้ รายงานข้อค้นพบก่อน ไม่เปลี่ยน production หรือข้อมูลจริงโดยอนุมานจากคำขอ review
- งานเอกสารอย่างเดียว: ตรวจความถูกต้อง ความสอดคล้อง ลิงก์ และ frontmatter ไม่ต้องรัน DB/payment verification หรืออ้างว่าช่องโหว่ runtime ถูกแก้แล้ว

สำหรับ flow ที่แตะ ให้ระบุสั้นๆ ว่าใครเรียกได้ ข้อมูลมาจากไหน และ invariant ที่ต้องคงอยู่:

- ผู้ใช้ anonymous/customer/เจ้าของข้อมูล/staff/admin เรียก endpoint ตรงๆ ได้ผลต่างกันอย่างไร
- เมื่อ request มาซ้ำ มาพร้อมกัน หรือ event สลับลำดับ จะกันผลซ้ำและ oversell ตรงไหน
- เมื่อ DB/provider/email สำเร็จเพียงบางส่วน จะ retry/reconcile/compensate อย่างไร
- ข้อมูลใดกลับไป client/cache/log และมี secrets/PII ที่ไม่ควรออกไปหรือไม่

หากยังตอบไม่ได้ ให้ตรวจโค้ด/เอกสารต่อก่อนเลือกวิธีแก้ ระบุสมมติฐานที่สำคัญและดำเนินงานส่วนที่ไม่ติดข้อสงสัยต่อได้

## 2. ตรวจ control ตามชนิดงาน

ใช้ routing ต่อไปนี้เพื่อเปิดข้อกำหนดฉบับเต็มใน CLAUDE.md; ตรวจ implementation จริง ไม่ตัดสินจากชื่อ helper หรือการมี API call

### Auth / CRUD / Server Actions / Route Handlers — §5.1, §5.2, §5.4

- Protected flow ต้อง reject เมื่อ session ไม่ถูกต้อง และตรวจ permission/ownership ก่อน protected read/write; `auth()` โดยไม่ตรวจผลไม่พอ ตรวจ query scope, DTO และ private cache ด้วย
- Guard ไม่จำเป็นต้องเป็นบรรทัดแรก แต่ต้องมาก่อน protected side effects; public login/catalog/newsletter และ guest flow ที่ออกแบบไว้ต้องมีเหตุผลและ abuse controls ไม่ใส่ session guard จน public flow ใช้งานไม่ได้
- ตรวจ direct invocation, cross-user IDOR, role escalation, expired/revoked session และการเปลี่ยนสิทธิ์ โดยอาศัย guard ฝั่ง server ไม่ใช่ UI/middleware อย่างเดียว
- งาน session/admin auth ตรวจ MFA/recovery, cookie flags, expiry/revocation, JWT/session verification และ audit durability ตาม §5.1; งาน cookie-authenticated mutation ตรวจ CSRF/Origin หลัง proxy ตาม §5.2
- Input validation ต้องทำก่อนใช้ข้อมูลนั้นใน business query/mutation; session lookup ของ guard ทำก่อนได้ TypeScript/Zod ไม่ทดแทน authorization หรือ SQL parameterization

### Stripe / Webhooks / Stock / Schema — §5.3, §5.4

- ไล่ราคาและ ownership ตั้งแต่ input ถึง order snapshot, PaymentIntent และ webhook; ตรวจ amount/currency/ID/account/live mode ก่อน fulfill และคง decimal-safe arithmetic ตลอดทาง
- ตรวจ raw-body signature ตาม provider ก่อนใช้ payload; การ parse แล้ว serialize ใหม่อาจทำให้ verification ล้มเหลว อย่าสรุปว่าปลอม event ผ่านเพราะพบ JSON parsing เพียงอย่างเดียว
- ชี้ unique constraints, conditional state update/row locks และ transaction boundary ที่กัน concurrent duplicates ได้จริง การเช็ค `paymentStatus` หรือ event ID ก่อนเขียนเฉยๆ ไม่ถือว่าผ่าน
- ทดสอบ retry operation เดิม, events ต่าง ID สำหรับ payment เดียว, out-of-order events และ concurrent bundle parts; มี `db.transaction()` ไม่ได้แปลว่า isolation/locking เพียงพอ
- ตรวจกรณีจ่ายสำเร็จแต่ DB ล้มเหลว, stock ไม่พอ, reservation หมดอายุ หรือ order canceled; DB transaction ไม่สามารถ rollback Stripe/email ต้องมี recovery และ durable delivery
- Schema/migration ตรวจ constraints, driver transaction support, data backfill/locks, migration permissions และ rollout/rollback ตาม §6.3 โดยไม่รัน migration กับ production จากคำขอ review

### Upload / Browser / Public API / Secrets — §5.2, §5.4–§5.6

- ตรวจชนิด/ขนาดไฟล์จริง, quota/ownership, signature scope, provider callback และ unauthorized delete/overwrite; image moderation ไม่ครอบคลุม 3D และไม่ใช่ XSS protection
- ตรวจ CSP values และ behavior ของ production build รวม third-party integrations; การมี header ไม่พอ และ `bodySizeLimit` ของ Server Actions ไม่ครอบคลุมทุก upload/API
- ตรวจ rate limit ข้าม instance, trusted origins/proxy, SSRF หากรับ URL, error redaction, secret boundary และข้อมูลส่วนตัวใน logs/cache

### Production Readiness — §5–§6 ทั้งหมด

- ตรวจ dependency/runtime support และ advisories ปัจจุบันเทียบ resolved lockfile, required CI checks, production flags, runtime headers/session และ provider mode
- ขอหรืออ่านหลักฐานที่จำเป็นของ monitoring, restore drill, migration/recovery plan และผู้รับผิดชอบ ไม่ถือว่ามีแล้วเพราะใช้ managed provider
- ใช้ release blockers/exception policy ตาม §6.3; ถ้าขาดหลักฐาน critical control ให้สถานะ **ยังไม่ตรวจ** และห้ามสรุปพร้อม deploy

## 3. รันทดสอบโดยแยกจากข้อมูลจริง

ก่อนรัน script อ่าน code/import-time side effects และ effective env โดยไม่พิมพ์ secret values
`pnpm verify` และ `pnpm verify:stripe` ใน baseline โหลด root `.env` และมีการเขียน DB/เรียก provider จึงไม่ใช่คำสั่งตรวจแบบ read-only

- ทำตาม CLAUDE.md §6.2: ต้องมี automated guard ก่อน side effects, test DB/project แยกที่ credentials เข้า production ไม่ได้, fixtures ของ run, Stripe test account และ email sink พร้อม cleanup
- ชื่อ `NODE_ENV=test` หรือชื่อ DB ที่มีคำว่า test อย่างเดียวไม่ใช่หลักฐาน isolation; config ไม่รู้จัก/ไม่ครบ/live ต้อง fail closed ห้ามรัน legacy verify scripts จน guard และ isolation พร้อม
- หากยืนยันไม่ได้ ให้หยุดเฉพาะการทดสอบที่มี side effects รายงานสาเหตุและ **ยังไม่ตรวจ** แล้วทำ static review/unit checks ที่ปลอดภัยต่อ ห้ามแก้ shared stock เพื่อให้ test ผ่าน
- เลือก tests ตาม behavior ที่เปลี่ยน: auth/IDOR, payment duplicates/order, concurrency/rollback, upload/abuse และ production flags ตาม §6.2; เรียก helper ตรงๆ ไม่ถือว่าได้ทดสอบ HTTP auth boundary แล้ว
- Code changes รัน lint/typecheck ที่เกี่ยวข้อง; integration/config changes รัน build ด้วยเมื่อทำได้อย่างปลอดภัย; order/stock ใช้ `pnpm verify` และ Stripe ใช้ `pnpm verify:stripe` เฉพาะเมื่อผ่าน preconditions ด้านบน เอกสารล้วนตรวจ diff/references/frontmatter ก็เพียงพอ
- ตรวจว่า test assertions ทดสอบการปฏิเสธและผลใน DB/provider จริง ไม่ถือว่า console success หรือ script จบโดยไม่ error พิสูจน์ invariants ครบแล้ว

## 4. Self-review และรายงานผลตามหลักฐาน

หลังแก้ ให้อ่าน diff และ control ที่เกี่ยวข้องอีกครั้ง ตรวจว่า callers/guards/constraints ยังทำงานร่วมกันและไม่ได้เพิ่ม public bypass
ใช้สถานะต่อ control ดังนี้:

- **ผ่าน:** มีหลักฐานตรงกับข้อที่อ้าง ระบุไฟล์+ฟังก์ชัน/บรรทัด และแยก static inspection จาก test command/result/environment ที่รันจริง ข้อที่ต้องใช้ runtime evidence จะผ่านด้วยการอ่านโค้ดอย่างเดียวไม่ได้
- **ไม่ผ่าน:** พบ violation ระบุเงื่อนไขที่กระตุ้น ผลกระทบ ตำแหน่งและวิธีแก้ แยกข้อกำหนดที่ขาดออกจากช่องโหว่ที่พิสูจน์แล้ว
- **ยังไม่ตรวจ:** หลักฐานไม่พอหรือรันไม่ได้ ระบุสิ่งที่ขาด/ข้อจำกัด ห้ามสมมติว่าผ่าน
- **ไม่เกี่ยวข้อง:** ระบุเหตุผลตามขอบเขต; การยังไม่ได้ implement control ที่จำเป็นไม่ใช่เหตุผลให้เป็น N/A

รายงานเฉพาะ control สำคัญที่เกี่ยวข้อง พร้อมผล tests และความเสี่ยงคงเหลือ ไม่คัดลอก checklist ยาวทั้งฉบับ
สำหรับ readiness เพิ่ม commit/build, environment, วันที่, release blockers และหลักฐานที่ยังต้องได้ตาม §6.3
สำหรับงานเอกสารระบุว่าแก้กฎแล้ว แต่อย่าอ้างว่าแก้ implementation หรือผ่าน production gates

รูปแบบรายการหลักฐาน (เป็นโครงรายงาน ไม่ใช่ผลตรวจจริง):

```text
Control: ชื่อข้อกำหนดและ CLAUDE.md section
Status: ผ่าน / ไม่ผ่าน / ยังไม่ตรวจ / ไม่เกี่ยวข้อง
Static evidence: path + function/line และสิ่งที่ตรวจพบ
Runtime evidence: command/test case + result + environment หรือเหตุผลที่ยังไม่รัน
Remaining action: งานที่ยังต้องทำหรือเหตุผล N/A
```

ถ้าพบปัญหาในขอบเขตงานแก้ ให้แก้และตรวจซ้ำ; ถ้าอยู่นอกขอบเขตให้รายงานผลกระทบและงานติดตาม ห้ามทำ production mutation, ยอมรับความเสี่ยงแทนเจ้าของระบบ หรือประกาศ deploy-ready จากเอกสาร/ผล lint อย่างเดียว
