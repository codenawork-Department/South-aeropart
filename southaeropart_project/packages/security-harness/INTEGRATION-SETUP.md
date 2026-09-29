# ทำให้ BLOCKED และ UNIMPLEMENTED ทดสอบได้

**สถานะปัจจุบัน 29 กันยายน 2026:** native bindings ของ Guest/Admin/Checkout/Webhook และ API resource adapter ทำแล้ว อ่าน [ผลจริงและขั้นตอนล่าสุด](../../docs/security/handoff/2026-09-29/full-security-continuation.md) ใช้ `node node_modules/tsx/dist/cli.mjs src/cli/native.ts --all` จาก workspace นี้ พร้อม `ALLOW_ISOLATED_SECURITY_TESTS=true` เพื่อรันทุกกลุ่มใน schema สุ่มและ local email sink โดย Webhook ใช้ Stripe test charges พร้อม owned refunds อย่าเรียก production หรือ migration บน shared schema เพื่อให้ผลเป็นสีเขียว ข้อความว่า adapters ยังเป็น stub ด้านล่างหมายถึง offline adapters/สถานะเดิมเท่านั้น

**อัปเดต 27–28 กันยายน 2026:** เพิ่ม native Guest binding แล้ว เรียก `native --guest` หรือ `native --with-guest` ตาม [รายงานเครื่องใหม่](../../docs/security/handoff/2026-09-27/new-machine-and-guest.md) ใช้ Clerk test users/sessions ของแต่ละ run พร้อม cleanup, secret ต่อ run และ clock เฉพาะสำเนาแอป พร้อม watchdog วัด RSS/เวลาใน process ที่รับคำขอจริง ไม่มี production bypass ผล offline adapter และข้อจำกัดของกลุ่มอื่นด้านล่างยังแยกจากหลักฐาน native เช่นเดิม

สถานะเหล่านี้เป็นงานด้าน test infrastructure และ application binding ที่ยังขาด ไม่ใช่การขออนุญาตจากตัว runner
ตั้ง environment variables อย่างเดียวไม่ปลดล็อก adapters: checkout/admin/guest/webhook adapters ปัจจุบันยังเป็น stub ที่คืน BLOCKED

## สถานะ environment ที่เจ้าของโปรเจคยืนยัน — 2026-09-25

ยังไม่มี deployment/production, แอปรันบน localhost, DB ที่เชื่อมปัจจุบันมีเฉพาะข้อมูลทดสอบและเจ้าของอนุญาตให้แก้ไขได้ ส่วน Stripe เป็น test mode จึงใช้ DB ปัจจุบันรัน integration ได้ตามคำอนุญาตนี้ ไม่ต้องรอ deploy หรือขออนุญาตใช้ DB ซ้ำ

ตรวจ config แล้วพบ Neon, Stripe test key, Clerk test key และ webhook secret; มี Resend key อยู่ด้วย จึงต้องปิดหรือ intercept email transport ใน process ทดสอบก่อนส่งคำขอที่อาจสร้างอีเมล ห้ามถือว่า Stripe test mode ทำให้ Resend ไม่ส่งอีเมลจริงด้วย

Runner ที่มีจริงคือ `apps/storefront/scripts/verify-security-integration.ts` (ทั้ง `pnpm verify` และ `pnpm verify:stripe` ชี้มาที่นี่แล้ว) สร้าง schema `security_test_<random UUID>` ใน DB ที่อนุญาต, apply migration journal เฉพาะ schema นี้, ยืนยัน `current_schema()`, รัน fixtures แล้ว drop เฉพาะ schema ของ run ใน `finally` นี่คือการแยกข้อมูลภายใน DB ที่ได้รับอนุญาต ไม่ใช่การแยก credentials ออกจาก DB

รันซ้ำจาก repo root:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
pnpm verify:stripe
```

หาก pnpm wrapper ใช้งานไม่ได้ ให้รันจาก `apps/storefront` ด้วย dependency ที่ติดตั้งแล้ว:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
node node_modules/tsx/dist/cli.mjs scripts/verify-security-integration.ts --stripe
```

เอา `--stripe` ออกเมื่อต้องการเฉพาะ DB/inventory checks Runner ปฏิเสธ production mode และ Stripe live key; ปิด Resend key เฉพาะ process ของตนเอง ไม่แก้ root `.env` และบันทึกผลคนละไฟล์ต่อ run ใน `audit/YYYY-MM-DD/security_test_*.json` ก่อนใช้ DB นี้รับข้อมูลจริง ต้องย้าย tests ไป DB/branch สำหรับทดสอบโดยเฉพาะ

ผลจริงรอบล่าสุด: **25 checks ผ่าน**, schema cleanup และ Stripe test refund สำเร็จ ดู [integration result](../../audit/2026-09-25/security_test_c8ae663fbd8745afbbbbaf6b950306d4.json) ครอบคลุม inventory N-17..N-19 ทั้ง 10 variants กับ PostgreSQL จริง, row-lock concurrency ที่มี barrier, audit FK failure rollback, reservation/release และ Stripe idempotency/payment binding/fulfillment

นี่เป็น DB/service/handler integration: auth actor ของ inventory ถูก inject, webhook เรียก handler ตรง, อีเมลถูกปิด ไม่ใช่ email sink ที่ตรวจ delivery ได้ และไม่มี native HTTP/Next.js envelope จึง **ไม่เปลี่ยน 404 BLOCKED เป็น PASS อัตโนมัติ** ต้องต่อ transport และ observers เข้ากับ corpus runner ต่อ

## งานที่ต้องทำในโค้ด

1. เพิ่ม integration bootstrap ที่รับเฉพาะ environment ทดสอบชัดเจน ตรวจ allowlist/credentials/transport ก่อน dynamic import ของ DB หรือ provider ห้าม fallback ไป root `.env` ที่ใช้กับแอปจริง
2. สร้าง fixtures ต่อ run: customer A/B, admin/staff/expired session, products, parts, orders และ payments โดยใช้ run ID และ cleanup ใน `finally` เฉพาะ IDs ของ run
3. ผูก native transport: จับ Server Action request/action ID จาก build ปัจจุบันผ่าน browser แล้ว replay โดยรักษา cookies/origin/envelope; webhook ส่ง raw bytes ไป HTTP server ที่แยกไว้ ไม่สมมติ REST URL ของ Server Action
4. เพิ่ม observers: snapshot DB ก่อน/หลัง, stock/order/email-job counts, Stripe request recording และ email sink ต้องแยกตาม run วัดผลหลัง concurrent/retry requests จบทั้งหมด
5. เพิ่ม fault injection และ clock seam ใน process ของแอปสำหรับ token expiry, SDK timestamps, DB failure, provider-success/DB-failure และ email failure โดยไม่ใช้ public bypass flag ใน production
6. Resource tests ต้องมี worker watchdog: hard timeout, RSS budget, byte counters และ transport ที่ส่ง chunked/missing Content-Length ได้จริง Parser ที่รับ Buffer ทั้งก้อนไม่พิสูจน์ขอบเขต ingress/stream
7. เชื่อม observations เข้ากับ manifest โดยให้ missing observations เป็น BLOCKED ต่อไป อย่า hardcode HTTP status, zero side effects หรือ invariant=true

Cart และ Inventory ผูก native transport และ DB observers แล้วใน runner ด้านล่าง; รายการข้างต้นยังใช้กับ targets ที่เหลือ ส่วน offline manifest ไม่รวม native observations

## สิ่งที่ต้องเตรียมนอกโค้ด

- สำหรับสถานะปัจจุบันใช้ DB development ที่เจ้าของอนุญาตพร้อม schema/fixtures ต่อ run ได้ เมื่อเริ่มมี production ต้องมี DB/project สำหรับทดสอบแยก พร้อม credentials ที่เข้า production ไม่ได้
- Storefront และ Admin instances สำหรับทดสอบเท่านั้น ผูกกับ DB นี้และ build revision ที่ทดสอบ
- Stripe test account/sandbox และ webhook secret สำหรับชุดทดสอบ พร้อม record และ cleanup payment objects
- Clerk development/test users และ Admin sessions ตาม roles ที่ corpus ระบุ
- Email sink ที่บันทึก messages โดยไม่ส่งออก เช่น injected in-memory transport สำหรับ integration process; key ที่ขึ้นต้นว่า `re_mock_sink_` ไม่ทำหน้าที่นี้
- CI secret store สำหรับ credentials เหล่านี้ ไม่ commit และไม่ส่ง secret values ในแชตหรือ artifacts

ชื่อค่าที่ guard ปัจจุบันอ่าน: `TEST_DATABASE_URL`, `DATABASE_URL`, `TEST_DATABASE_DISPOSABLE`, `SECURITY_TEST_DB_ALLOWLIST`, `STRIPE_SECRET_KEY`
DB URL ทั้งสองต้องตรงกัน Allowlist เป็น JSON array ของ exact identity ในรูป `postgresql://hostname:port/database#username` ตาม scheme ที่ใช้จริง โดยไม่ใส่ password
นี่เป็นเพียง configuration preflight ไม่ใช่หลักฐานว่า provision credentials แยกแล้ว และยังไม่มี verified email sink registration ใน guard

## ปิดงาน UNIMPLEMENTED — 2026-09-25

- **inventory.delta — 10 variants (N-17..N-19):** มี `adjustInventoryAction` แล้ว รับ `{productId, delta}` ตรวจ verified session/role, strict input, stock bounds, single-product type และบันทึก audit ใน transaction เดียวกันกับ stock โดยใช้ row lock และ conditional update ของ Drizzle
- Adapter เรียก shared production command ผ่าน transactional memory fixture; 10 variants ผ่าน service assertions แต่ full corpus ยังให้ BLOCKED เพราะยังไม่มี native HTTP observation และ DB จริง จึงไม่ใช่หลักฐาน PostgreSQL concurrency/rollback
- PostgreSQL stock/audit readback, zero/MAX boundaries, audit failure rollback และ concurrent adjustments ทดสอบแล้วใน suite แยกข้างต้น งานต่อไปคือ test Admin build ที่มี action caller/envelope จริง, sessions ของ admin/super_admin/staff/expired/revoked และผูก observations เหล่านี้เข้ากับ corpus โดยตรง
- Contract ของ handled Server Action ใช้ wire 200 กับ structured error (semantic 401/403/404/409/422/500); service adapter ไม่สร้าง wire status สมมติ
- **coupon.apply — 13 variants (N-26..N-27):** ลูกค้าขอถอด scope เพราะยังไม่มีแผนใช้งาน จึงเอา target/fixtures/schema/recipes/tests ออกจาก active corpus แล้ว ไม่ใช่ PASS และไม่ต้อง provision coupon fixtures

ไม่มี schema migration เพิ่มสำหรับ delta action นี้; ใช้ products และ admin audit ที่มีอยู่ และรันเขียน/อ่านจริงใน schema ชั่วคราวแล้ว คำขอ delta ที่ส่งซ้ำเป็นการปรับครั้งใหม่ จึงต้อง readback/reconcile เมื่อ network outcome ไม่แน่นอนก่อน retry

## ลำดับที่แนะนำ

เริ่มจาก native Cart transport ซึ่งไม่เขียน DB → guest ownership/expiry → checkout/admin กับ disposable DB → webhook concurrency/recovery กับ DB/provider observers → resource/browser tests
ทดสอบ inventory delta ร่วมกับ Admin/disposable DB เพื่อพิสูจน์ row lock, audit rollback และผลกระทบต่อ checkout; coupon อยู่นอก scope ตามคำขอลูกค้า

ปัจจุบันยังไม่มีคำสั่งเดียวที่รัน BLOCKED ที่เหลือได้ครบ: offline manifest มี 404 BLOCKED ส่วน native run ล่าสุดเหลือ 324 BLOCKED `pnpm --filter @repo/security-harness gate` เป็น offline-only และยัง exit 1 จนกว่าหลักฐานเหล่านี้จะครบ (0 UNIMPLEMENTED ใน active scope)
`pnpm verify`/`pnpm verify:stripe` เป็น integration suite แยกที่รันได้ตามคำสั่งข้างต้น ยังไม่ใช่ตัวแทนการรัน full corpus ส่วน `verify_loop.ts` และ `verify_stripe_loop.ts` เดิมหยุดทำงานและแนะนำให้ใช้ suite ใหม่นี้
ข้อกำหนด isolation: [CLAUDE.md §6.2](../../CLAUDE.md) และ [test isolation guide](../../.agents/skills/south-aero-testing/references/isolation.md)

## Native runner ที่รันได้แล้ว — 2026-09-26

จาก repository root ใน PowerShell:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
pnpm --filter @repo/security-harness native
```

ถ้า environment เรียก pnpm wrapper ไม่ได้ ใช้ installed CLI โดยไม่ติดตั้ง dependency เพิ่ม:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
Set-Location packages/security-harness
node node_modules/tsx/dist/cli.mjs src/cli/native.ts
```

เลือกเฉพาะกลุ่มด้วย `--cart` หรือ `--inventory`; ไม่ใส่ option จะรันสองกลุ่มใน schema เดียวกันพร้อม session/email supplemental checks รายงานแต่ละ run อยู่ `docs/security/fuzz-matrix-2026-09-24/artifacts/native/<runId>/` ไม่เขียนทับ offline manifest คำสั่งยังคืน exit 1 เมื่อ full corpus มี BLOCKED แม้ native cases ที่เลือกผ่านทั้งหมด

Runner นี้เป็น workflow เฉพาะ development ที่เจ้าของอนุญาตแล้ว: โหลด root `.env`, ปฏิเสธ production flags และ Stripe/Clerk live keys ก่อนสร้าง clients, สร้าง PostgreSQL schema ชั่วคราวและย้าย migration definitions เข้า schema นั้น ไม่ใช้ stock หรือ orders ใน public schema บัญชี Admin และ sessions สร้างเฉพาะ run และถูกลบพร้อม schema ไม่ต้องใช้รหัสผ่านผู้ใช้

ใช้ Playwright ที่ติดตั้งใน `e2e` และ Microsoft Edge แบบ headless (`PLAYWRIGHT_CHANNEL` เปลี่ยน channel ได้ถ้ามี browser ติดตั้งอยู่) แอปทดสอบฟังบน localhost port ที่สุ่มและใช้ hostname เดียวกับ browser URL เพื่อให้ Clerk middleware rewrite ถูกต้อง หน้าทดสอบอยู่เฉพาะสำเนาแอปใน `.security-runs/`; ไม่มี test endpoint เพิ่มลง production app

Child processes ใช้ session/order/webhook secrets ที่สุ่มต่อ run และแทน Resend configuration ด้วย local HTTP sink จริง ค่า API key ปลอมเพียงอย่างเดียวไม่ใช่ sink: runner ตั้ง `RESEND_BASE_URL` เป็น loopback และตรวจว่า actual SDK ส่งมาถึง sink ใช้ test recipients เท่านั้น ปิด realtime mutation token และ Cloudinary write credentials ใน child process ไม่ส่ง email ภายนอก

ผลที่ตรวจแล้ว: Cart 70 + Inventory 10 native variants ผ่าน, session lifecycle/roles 11 checks ผ่าน และ actual shipment HTML/Resend sink ผ่าน 1 check รายงานรวมกับ offline evidence เป็น **153 PASS / 0 FAIL / 324 BLOCKED / 0 UNIMPLEMENTED** ดู [หลักฐานและข้อจำกัด](README.md#native-localhost-integration--2026-09-26-asiabangkok)

สิ่งที่ยังต้องทำเป็นโค้ดของ harness: bind Guest/Checkout/Admin Product/Webhook corpus, Clerk customer A/B ownership sessions, clocks/faults, provider side-effect records และ resource budgets ส่วน Amount/API cases ต้องระบุ application route ที่จะนำ proposed contract ไปใช้ จึงยังไม่ใช่งานที่ปลดบล็อกได้ด้วยรหัสผ่านเพียงอย่างเดียว
