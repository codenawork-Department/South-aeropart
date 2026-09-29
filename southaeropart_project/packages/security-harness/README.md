# Security harness: execution scope and replay

**Latest verified combined gate (2026-09-29): 477 PASS / 0 FAIL / 0 BLOCKED / 0 UNIMPLEMENTED, exit 0.** Run `security_test_88f9013e9fdf487da10381de05ce2697` completed all targets; all 74 recorded source hashes matched, 94/94 owned Stripe test payments were refunded, and runtime/Clerk cleanup passed. See [customer notes, website builds and final evidence](../../docs/security/handoff/2026-09-29/customer-notes-and-build.md). This result applies to the recorded corpus and evidence layers.

**Current continuation (2026-09-29):** use `native --all` for all implemented bindings: Inventory, Cart, Guest (including real production HTTPS cookie issuance), both Admin product actions, Checkout with barrier-controlled races, isolated API resource checks, customer order notes, and all 94 real HTTP Stripe webhook variants. See [the previous verified milestone](../../docs/security/handoff/2026-09-29/full-security-continuation.md) and the new per-run artifacts for actual results. Standalone `--guest`, `--product`, `--checkout`, `--webhook`, `--api` select groups; `--notes` runs only the three T-16 native note variants and supplemental rejection checks. `--api` includes both the 11 isolated parser-contract cases and these three real application note cases. `--case=<ID>` filters Product/Checkout/Webhook diagnostics. Default remains Cart/Inventory. The owner authorized the order-note feature; its adapter checks persistence, customer/admin DOM, both real email templates through the local sink, owner isolation and byte limits. Denominator stays 477 and strict gate stays nonzero while any case is blocked/failed. The owner approved the three oversized action variants' 413 expectations. Historical offline-adapter limitations below do not describe the current native bindings.

`tsx src/cli/site-check.ts` separately enumerates all application pages, visits them with owned fixtures under Turbopack, runs both full production builds, checks key production routes and captures Thai/mobile and English/desktop checkout note layouts. The paid fixture checks the payment-to-order redirect; this is not a test of every payment UI interaction or external OAuth flow. All runs use the native runtime's random schema and local email sink. `--focus` restricts to the two payment routes and `--turbopack-only` skips production builds for diagnosis.

ชุดนี้ตรวจความถูกต้องของตัว runner และบันทึกหลักฐานเท่าที่วัดได้ ไม่ใช่ใบรับรองความปลอดภัยของระบบ production
Corpus 102 กลุ่มใน `docs/security/fuzz-matrix-2026-09-24/` เป็น desired contracts; บางข้อมีเพียง isolated contract adapter
จำนวน variants คำนวณจาก target × value/recipe ไม่ hardcode จำนวนเดิมจากรายงาน Gemini

## Commands

รันจาก repository root โดยใช้ dependencies ตาม lockfile ที่ติดตั้งไว้:

```bash
pnpm --filter @repo/security-harness validate
pnpm --filter @repo/security-harness typecheck
pnpm --filter @repo/security-harness test
pnpm --filter @repo/security-harness manifest
pnpm --filter @repo/security-harness gate
pnpm --filter @repo/security-harness test:diagnostics
pnpm --filter @repo/security-harness replay --case N-23
pnpm --filter @repo/security-harness replay --seed <seed-from-manifest>
```

- `test` ตรวจตัว harness: schema/parser, payload recipes, result classification, isolation guard, direct cart invocation, object operations ใน child process และ Stripe SDK signature verification แบบ offline ไม่มีการเขียน artifacts
- `manifest` สร้าง `coverage-manifest.json` และ `gaps-and-failures-report.md`; exit 0 หมายถึงสร้างรายงานสำเร็จ แม้มี FAIL/BLOCKED
- `gate` สร้างรายงานแล้ว exit 1 เมื่อมี FAIL, BLOCKED, UNIMPLEMENTED หรือ run ว่าง เป็น corpus gate เท่านั้น
- `test:diagnostics` ตรวจ application email templates ผ่าน DB/email mocks แยกจาก runner self-tests; violation เป็น test failure จริง ไม่มี `it.fails` ทั้ง gate และ diagnostics ต้องผ่านก่อนนำผลไปประกอบ release review
- `replay` เลือกด้วย case ID หรือ seed ที่ระบุ variant ใน corpus ปัจจุบัน; exit 1 เมื่อมีผลไม่ใช่ PASS ไม่เขียนทับ full manifest ใช้ corpus/lockfile revision เดียวกันเพื่อ replay

หาก pnpm wrapper พยายามติดตั้ง runtime ใหม่ สามารถเรียก CLI ที่ติดตั้งแล้วจาก `packages/security-harness` ได้:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
node node_modules/vitest/vitest.mjs run --config vitest.diagnostics.config.ts
node node_modules/tsx/dist/cli.mjs src/cli/validate-corpus.ts
node node_modules/tsx/dist/cli.mjs src/cli/generate-manifest.ts --strict
node node_modules/tsx/dist/cli.mjs src/cli/replay.ts --case N-23
```

## Meaning of results

- PASS: assertions ที่ร้องขอผ่านใน layer ที่ระบุเท่านั้น
- FAIL: มี observed mismatch หรือ invariant ที่วัดแล้วผิด ไม่แปลว่าเป็น production exploit ทุกกรณี โดยเฉพาะ proposed contracts
- BLOCKED: ยัง execute ไม่ได้ หรือข้อมูลที่จำเป็นต่อข้อสรุปยังไม่ถูกวัด
- UNIMPLEMENTED: ยังไม่มี implementation/adapter สำหรับ contract นั้น ปัจจุบันไม่เหลือสถานะนี้ใน active corpus หลังเพิ่ม inventory delta และถอด coupon ตามคำขอของลูกค้า

`invariantsNotMeasured` แยกจาก `invariantsFailed` เสมอ ค่า `dbDiff: null` หรือ `providerCalls: null` หมายถึงไม่ทราบ ไม่ใช่ไม่มี side effect
`layer` ของ BLOCKED/UNIMPLEMENTED เป็น boundary ที่ต้องการตรวจ อาจยังไม่ได้ execute เลย จำนวน `byLayer` จึงไม่ใช่จำนวน integration executions

`action_unit` เรียก cart function ตรงและไม่มี HTTP status; exception ตรงๆ ไม่บอกว่าฝั่ง Next.js ส่ง HTTP 500 หรือ leak อะไร
`service_unit` เรียก production inventory command กับ transactional memory fixture: ตรวจผล stock/audit ใน fixture ได้ แต่ไม่พิสูจน์ session verification, PostgreSQL locks/rollback/concurrency หรือ native HTTP; ค่าผล DB/provider จริงยังเป็น null
`parser_only`/`isolated_validator` เป็น offline implementation ของ proposed contract และรายงาน HTTP-equivalent semantic status พร้อม `actualWireStatus: null`
`pure_unit` ของเงินเทียบ application helper กับ decimal oracle ที่ใช้ BigInt โดยไม่ trim/truncate input

## Isolation and missing integrations

Checkout, admin product, guest tracking และ webhook adapters คืน BLOCKED **ก่อน import application modules** รวมถึงการเรียก adapter โดยตรง
การตั้ง env ให้ดูเป็น test ไม่ปลดล็อก adapter เหล่านี้ ปัจจุบันยังไม่มี native transport + fixtures + side-effect instrumentation ครบชุด

Configuration preflight ตรวจ exact DB endpoint/port/database/role ใน `SECURITY_TEST_DB_ALLOWLIST` (JSON array), disposable authorization และ `DATABASE_URL` ที่ตรงกับ `TEST_DATABASE_URL`
ชื่อ localhost หรือ `.test` ไม่เป็นหลักฐาน credentials isolation ต้อง provision role/project ที่เข้าถึง production ไม่ได้จากภายนอก runner
`re_mock_sink_*` เป็นเพียงข้อความ API key ไม่ใช่ email sink; ต้องมี transport interception ที่ตรวจสอบได้จริง
Offline signer ใช้ fixture secret และเวลาคงที่ ไม่ใช้ guest secret จาก environment จริง

สิ่งที่ต้องทำต่อก่อนอ้าง integration coverage:

1. ใช้ DB development ที่เจ้าของอนุญาต (ยืนยัน 2026-09-25 ว่ายังไม่มี production) พร้อม schema/fixtures/readback/cleanup ต่อ run และ Clerk/admin sessions สำหรับแต่ละ actor; เมื่อมี production ต้องแยก DB/credentials สำหรับทดสอบ
2. ผูก native Server Actions กับ build ปัจจุบันโดยจับ action ID/envelope จริง และ webhook กับ raw HTTP bytes ห้ามสมมติ URL หรือ fake status
3. ใส่ DB before/after snapshots, Stripe test transport และ Resend sink counters; readback ต้องแยกแต่ละ run
4. Replay/concurrency ต้องวัด fulfillment, stock, outbox/provider effects หลังทุก request; หลาย HTTP 200 อาจเป็น idempotent ACK ปกติ
5. Inject clock ใน application process จริงสำหรับ guest expiry และ webhook tolerance; metadata `isExpired` หรือ ClockController helper ไม่พิสูจน์ server enforcement
6. วัด byte stream, missing Content-Length/chunked delivery, hard timeout และ peak RSS ใน worker ที่มี watchdog; current parser byte/depth checks ยังไม่พิสูจน์ RESOURCE_BOUNDED
7. Native Server Action body-size recipe เป็น deferred serializer request ต้องวัด multipart/RSC overhead จริง ไม่ใช้ JSON size ประมาณ

Prototype child-process tests ตรวจ JavaScript object operations เท่านั้น ไม่ได้เรียก application handlers และไม่ให้ NO_POLLUTION ผ่านใน manifest โดยอัตโนมัติ

## Browser and email evidence

`e2e/tests/security/xss-dom-neutralization.spec.ts` ตรวจเฉพาะ reflected search input `/products?q=...`:
ต้องเห็น payload ใน `#product-search` จริง, DOM ภายใน form ต้องไม่มี executable nodes/attributes และไม่มี marker execution/beacon
Missing server/404 เป็น failure ไม่ใช่ silently skipped PASS ช่อง input ที่เก็บ payload ใน `value` อย่างปลอดภัยไม่ใช่ XSS finding
Spec นี้ไม่พิสูจน์ stored XSS, guest ownership หรือ email-client execution และไม่รวมใน manifest
รัน browser เฉพาะเมื่อ isolated server พร้อมตาม CLAUDE.md §6.2; runner ไม่ start server อัตโนมัติ

Email diagnostics เรียก template จริงโดย mock DB และ `sendEmail` ไม่มีการส่งอีเมลออกจริง
การพบ unescaped HTML พิสูจน์ HTML injection ใน generated template; ยังไม่พิสูจน์ว่า mail client ใดรัน script ได้

## Application fixes — 2026-09-25

- `money.convert` N-23: application helper ตรวจ decimal grammar, ไม่ trim/truncate, คำนวณด้วย BigInt, ตรวจ safe-integer bounds และ throw `INVALID_INPUT` / `Invalid request` สำหรับค่าผิดรูปแบบ
- `cart.add` S-06: strict schema ปฏิเสธฟิลด์ส่วนเกิน และคืน generic validation error โดยไม่ expose Zod details
- Admin shipment email: escape recipient/address, product/bundle names, order number, carrier/tracking และ quoted href attributes ผ่าน shared HTML helper
- ค่าเงิน signed/zero ที่ถูกต้องยังแปลงได้เหมือนเดิม ขอบเขตยอดที่อนุญาตเรียกเก็บเงินจริงยังเป็นหน้าที่ checkout/provider validation
- `inventory.delta` N-17..N-19: เพิ่ม `apps/admin/actions/inventory.actions.ts#adjustInventoryAction` ใช้ session จริงและอนุญาตเฉพาะ admin/super_admin; shared command อยู่ใน `packages/lib/src/inventory-adjustment.ts` ส่วน Drizzle repository อยู่ใน `apps/admin/lib/inventory-repository.ts`
- Input คือ `{productId: UUID, delta: number}` แบบ strict; delta เป็น integer ไม่เป็น 0 และอยู่ใน ±2147483647; stock หลังปรับต้องอยู่ใน 0..2147483647; ปฏิเสธการปรับ bundle โดยตรง ใช้อะไหล่ย่อยแทน
- Repository ใช้ `FOR UPDATE`, conditional stock write และ audit ใน transaction เดียวกัน; cache/realtime ทำหลัง commit และความล้มเหลวของสองส่วนนี้ไม่เปลี่ยนผล mutation ที่ commit แล้วเป็น failure
- คำสั่ง delta แต่ละครั้งถือเป็นการปรับใหม่ ไม่มี idempotency key; ห้าม client retry อัตโนมัติเมื่อผล network ไม่แน่นอน ต้อง readback/reconcile ก่อน คำสั่งนี้ยังไม่มี production UI caller; native transport ทดสอบแล้วผ่าน caller ที่เพิ่มเฉพาะสำเนาแอปทดสอบ (ดูผล 2026-09-26 ด้านล่าง)
- Coupon N-26/N-27 รวม 13 variants ถูกถอดจาก active corpus, schemas, fixtures, dispatcher และ adapter ตามคำขอลูกค้า ไม่ได้เปลี่ยนเป็น PASS และไม่สร้างระบบ coupon ขึ้นมา ข้อความแนะนำ coupon ใน Admin Dashboard ถูกเอาออกด้วย

เงินมีหลักฐาน pure-unit error code/message; Cart มีทั้ง structured action results และ native HTTP observation ในชุดทดสอบแยกด้านล่าง ส่วน offline manifest ยังคง BLOCKED สำหรับ HTTP ตามเดิม
ดู [ขั้นตอนทำให้ integration ทดสอบได้](INTEGRATION-SETUP.md) สำหรับโค้ดและ environment ที่ยังต้องเตรียม

## Verification record — 2026-09-25 (Asia/Bangkok)

- Monetary helper regression: 39 tests passed, including malformed/type-confused input, exact upper/lower satang bounds and no rounding/truncation.
- Cart regression: 9 tests passed, including all 7 former unknown-field failures and generic rejection results.
- Email diagnostics: 3 passed, with actual templates and mocked DB/email transport; no email was delivered externally.
- Harness regression: 9 files, 68 tests passed, including 17 inventory tests (all 10 active inventory variants, 6 auth/shape/boundary/rollback scenarios, and an independent-oracle regression that detects a wrong applied delta).
- Inventory Server Action regression: 5 tests passed with mocked session/repository/cache/realtime; the shared production command is real.
- Corpus after scope update: 477 variants — 73 PASS, 0 FAIL, 404 BLOCKED, 0 UNIMPLEMENTED. Strict gate still exits 1 for missing coverage. Inventory's 10 variants now execute at service_unit and remain BLOCKED for native HTTP evidence; they are no longer UNIMPLEMENTED. Coupon's 13 variants are removed from the denominator.
- ESLint on changed Storefront Cart/receipt, Admin shipment, new inventory action/repository/tests and the 5 dashboard copy edits: passed.
- Typecheck: shared lib, harness, Storefront and Admin passed.
- Initial offline verification did not run application build, browser, native HTTP or DB/provider calls. The subsequently authorized DB/Stripe test run is recorded separately below; neither run certifies production readiness.

### Authorized development DB/Stripe integration — 2026-09-25

The owner confirmed the project has no production deployment, the current DB contains disposable test data, and Stripe is in test mode. `apps/storefront/scripts/verify-security-integration.ts --stripe` ran successfully against Neon with a fresh run-owned schema and real Stripe test API calls: **25 checks passed**, schema cleanup and test-payment refund both succeeded.

The suite now invokes the actual inventory command and Drizzle repository for all 10 N-17..N-19 variants, exact stock boundaries, a real audit FK failure/rollback, concurrent transactions with a barrier, and bundle rejection. It also verifies reservations, release, rate limiting and payment binding/idempotency/fulfillment. Typecheck and lint on the integration changes passed.

[Result JSON](../../audit/2026-09-25/security_test_c8ae663fbd8745afbbbbaf6b950306d4.json) records `nativeHttpMeasured: false` and `emailDeliveryMeasured: false`: inventory auth is injected, webhook is invoked as a handler, and Resend is disabled rather than observed through a delivery sink. This separate evidence does not change the offline corpus's 404 BLOCKED entries. Native Action/HTTP sessions, email observers, controlled clocks, resource limits and browser probes still need wiring into the corpus runner. See [run commands and remaining work](INTEGRATION-SETUP.md).

Offline-only corpus counts are in `docs/security/fuzz-matrix-2026-09-24/artifacts/coverage-manifest.json`. Native runs have separate manifests so an offline rerun cannot overwrite integration evidence.

### Native localhost integration — 2026-09-26 (Asia/Bangkok)

[Verified native manifest](../../docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/coverage-manifest.json): **477 variants — 153 PASS, 0 FAIL, 324 BLOCKED, 0 UNIMPLEMENTED**. This single run combines the 73 offline passes with **70 Cart and 10 Inventory native HTTP passes**; it does not merge stale results from different native runs. The strict gate correctly exits 1 because 324 variants remain blocked.

The runner copies the actual Next.js apps into ignored `.security-runs/<runId>` directories, adds test callers only inside those copies, and preserves the application's actions, middleware, layouts and session verification. Both the server listener and browser URL use `localhost`; mixing `127.0.0.1` with Clerk's localhost rewrite caused an internal loop during bootstrap. Readiness requests do not follow the Clerk development handshake; the real browser completes it.

The browser generates the current Next Action ID and request envelope. The runner forwards that captured request to the actual server with `route.fetch`, observes the real response, and supplies those response bytes to React. Raw integer tokens retain their original digits, including `9007199254740993` and `18446744073709551615`; they are never rounded through a JavaScript Number before transmission. Only observed single-argument JSON envelopes support raw replacement. Other encodings fail closed. Request byte counts and SHA-256 digests are recorded without cookies or credentials.

Inventory assertions read actual stock and audit rows from PostgreSQL and compare the request delta using BigInt, actor identity, before/after values and response DTO. Cart assertions compare business-table row fingerprints before and after every request and count local email deliveries. Cart currently validates and returns an item; it does not persist a cart or check catalog availability. Stripe call counts remain unmeasured; the Cart action has no provider dependency.

Supplemental evidence, **not added to the 477-variant denominator**:

- [11 session checks passed](../../docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/inventory-sessions.json): anonymous, staff, expired/revoked session, inactive account, idle timeout, wrong session hash, invalid JWT signature, role downgrade after a successful session lookup, admin and super_admin. These use run-owned signed JWTs and real DB session rows; password login and production MFA are not covered.
- [Email sink check passed](../../docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/email-sink.json): stored malicious product/address text is read by the actual shipment template, sent through the actual Resend SDK to a loopback HTTP sink, and inspected in Chromium. One sink request arrived; no executable script/event attribute or payload beacon was observed. No external email was delivered. This helper probe is not proof of every production order/email flow or email-client behavior.
- [Cleanup verified](../../docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/cleanup.json): temporary schema dropped and owned servers stopped. Ignored app copies/logs remain for debugging.
- Harness regression: 68/68 passed; harness typecheck and changed-file ESLint passed. A production-mode invocation was refused before runtime initialization (`Production is forbidden`). Next.js development compilation and browser execution were exercised; a production build/CSP/MFA release test was not run.

Remaining native corpus work: Admin Product 102, Checkout 70, Guest Tracking 41, Stripe Webhook 94, proposed Amount/API contracts 17. These need bindings, fixtures and the relevant clock/fault/resource/provider observers; they do not become PASS because a separate smoke test passed. No customer/admin passwords were needed for this run.

Replay instructions and limits are in [INTEGRATION-SETUP.md](INTEGRATION-SETUP.md).
