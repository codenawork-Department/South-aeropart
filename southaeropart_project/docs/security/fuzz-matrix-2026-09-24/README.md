# Security fuzz matrix — South Aero

วันที่ 2026-09-24 · **102 ชุดกรณีใน scope ปัจจุบัน** ขยายเป็นหลาย test ด้วย variants · ฐานโค้ด working tree บน commit `8d4101a` ซึ่งมีงานแก้เดิมของผู้ใช้

เอกสารนี้เป็น **test design และ target contract** ไม่ใช่ผลทดสอบว่าระบบผ่านแล้ว อัปเดต 2026-09-25: เพิ่ม inventory delta implementation และถอด coupon ตามคำขอลูกค้า (N-26/N-27 รวม 13 variants; ไม่นับเป็น PASS) ผลรัน offline ล่าสุดและข้อจำกัดอยู่ใน [harness README](../../../packages/security-harness/README.md); ยังไม่ได้เรียก DB/provider จริง

## ไฟล์สำหรับส่งต่อ

- [corpus.json](corpus.json): cases, exact payloads/recipes, fixtures, limits, status, assertions
- [corpus.schema.json](corpus.schema.json): JSON Schema Draft-07 ตรวจโครง corpus
- [payload-contracts.schema.json](payload-contracts.schema.json): JSON Schema Draft-07 ของ normalized input projections
- [gemini-prompt.md](gemini-prompt.md): prompt ให้ Gemini Flash สร้างสคริปต์จากสามไฟล์ข้างต้น

**แนะนำส่งทั้ง corpus + schemas + prompt** ตารางนี้อ่านทบทวนได้ แต่ JSON เป็นแหล่ง test data หลัก ห้ามตีความ recipe เป็นโค้ดที่นำไป eval

## Contract กับสิ่งที่พบใน repo

| จุดรับข้อมูล | หลักฐานที่อ่าน | ผลต่อ test |
|---|---|---|
| Next.js | apps/storefront/package.json:32 และ apps/admin/package.json:25 ระบุ 15.5.24 | ใช้ native Server Actions ของ build ปัจจุบัน; บางข้อความใน CLAUDE.md ยังเก่ากว่า package |
| Cart | apps/storefront/actions/cart.actions.ts:9–24 | quantity 1..10; action นี้ยังไม่ persist cart |
| Checkout | apps/storefront/actions/checkout.actions.ts:79–93, 304 เป็นต้นไป | quantity 1..100, items 1..100; unitPrice เป็น string แต่ยอดจริงอ่าน DB |
| Checkout public fields | checkoutSchema ไม่มี amount/currency/note | amount/note เป็น isolated contract adapters; ไม่สร้าง endpoint สมมติหรืออ้าง deployed HTTP coverage |
| Guest tracking | apps/storefront/lib/guest-order-token.ts:15–41; checkout.actions.ts:522,665 | HMAC lowercase hex 64 ตัว ผูก orderId/userId/createdAt; **ไม่มี server expiry check ใน verifier** |
| Guest cookie | guest-order-token.ts:60 เป็นต้นไป | cookie 7 วัน ไม่ทำให้ bearer token หมดอายุฝั่ง server |
| Admin product | apps/admin/actions/product.actions.ts:77–98 | price decimal string, stockQuantity absolute; description ยังไม่มี max ใน schema ที่อ่าน |
| DB | packages/db/src/schema/products.ts:125–127,160 | numeric(12,2), int32 stock พร้อม nonnegative constraint |
| Money converter | packages/lib/src/stripe.ts | แก้เป็น strict decimal + BigInt พร้อม safe-integer bounds แล้วเมื่อ 2026-09-25; ดูหลักฐาน regression ใน packages/security-harness/README.md |
| Request limits | next.config.mjs ของทั้งสองแอป; Stripe route.ts:9–20 | Actions 4mb; webhook 1MiB แต่เช็ก rawBody.length เป็น UTF16 และอ่าน req.text ก่อนเช็กจริง จึงต้องทดสอบ UTF8/chunked/memory |
| Stripe | apps/storefront/app/api/webhooks/stripe/route.ts | HTTP route จริง POST /api/webhooks/stripe; signed malformed shape/binding ต้องไม่ทำให้ 500 |
| Stock delta | apps/admin/actions/inventory.actions.ts#adjustInventoryAction และ packages/lib/src/inventory-adjustment.ts | มี implementation แล้ว; service_unit ใช้ memory fixture, native HTTP/DB ยัง BLOCKED; bundle ต้องปรับผ่านอะไหล่ย่อย |

Static finding ไม่เท่ากับ exploit ที่ยืนยันแล้ว โดยเฉพาะ expiry, body limits และ strict validation ต้องรันทดสอบแยกเพื่อพิสูจน์ runtime

## HTTP และ generic error oracle

| สถานการณ์ | Route Handler HTTP | Server Action ที่จัดการ error แล้ว | Error code / message เป้าหมาย |
|---|---:|---|---|
| JSON syntax/encoding ผิด หรือ webhook signature/schema ผิด | 400 | native protocol แยกจาก JSON route; ห้าม POST JSON เข้า action โดยสมมติ | BAD_REQUEST / Invalid request |
| session ขาด/หมดอายุ | 401 | wire 200 + success:false; semantic 401 | UNAUTHENTICATED / Authentication required |
| session ถูกต้องแต่ไม่มีสิทธิ์ | 403 | wire 200 + success:false; semantic 403 | FORBIDDEN / Request not permitted |
| guest token ผิด/หมดอายุ/ไม่ใช่เจ้าของ/UUID ที่ไม่มีอยู่ | 404 | wire 200 + success:false; semantic 404 | NOT_FOUND / Resource not found |
| stock ไม่พอ/duplicate SKU | 409 | wire 200 + success:false; semantic 409 | CONFLICT / Request conflicts with current state |
| body เกินจำนวน **bytes** | 413 | transport 413 ก่อนเข้า action ภายใต้ controlled ingress | PAYLOAD_TOO_LARGE / Request too large |
| media type/encoding ไม่รองรับ | 415 | ทดสอบ JSON API adapter โดยเฉพาะ | UNSUPPORTED_MEDIA_TYPE / Unsupported content type |
| JSON ถูก syntax แต่ type/range/required field ผิด | 422 | wire 200 + success:false; semantic 422 | INVALID_INPUT / Invalid request |
| rate limit | 429 | wire 200 + failure เมื่อเป็น business limit | RATE_LIMITED / Too many requests |
| injected internal failure | 500 | handled wire 200 + failure; semantic 500 | INTERNAL_ERROR / Unable to process request |
| success/no-op ที่ commit หรือ durable enqueue แล้ว | 200 | wire 200 + success:true | ไม่ส่ง error |

ค่าข้างต้นเป็น recommended contract ไม่ใช่ status ที่ยืนยันจาก runtime ทุกฟังก์ชัน หาก Action ปัจจุบัน throw แล้ว framework ตอบ 500 ให้รายงาน contract failure และ raw response จริง ห้ามแก้ assertion ให้ผ่านตาม implementation

`expected.httpStatus` ใน JSON ระบุ wire ต่อ target; `semanticStatus` เป็นผลเชิงธุรกิจ; `null` หมายถึง unit ไม่มี HTTP ไม่ใช่ HTTP 0 สำหรับ parser/field-only adapter ค่า status เป็น HTTP-equivalent เท่านั้น ต้องติดป้าย evidence layer และห้ามอ้างว่าผ่านจริงผ่านเครือข่าย

ตัวอย่าง error ที่ออกสู่ client:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid request",
    "requestId": "opaque-correlation-id"
  }
}
```

Localization ใช้ allowlist ข้อความที่กำหนดล่วงหน้าได้ ห้ามสะท้อน input, DB error, table/constraint จริง, SQL/parameters, stack/path, provider body, secrets หรือ PII ลง client ทุกช่องทาง รวม RSC frames/HTML/headers ไม่ใช้ regex คำว่า "table" กว้างๆ จน block prose ที่ถูกต้อง ให้เช็ก error allowlist และ sentinel ที่ฉีดเข้า server

## Limits ที่ใช้ใน target contract

- ปัจจุบัน: cart 1..10; checkout 1..100/รายการ และไม่เกิน100รายการ; stock 0..2147483647; DB price สูงสุด 9999999999.99 หน่วยหลัก
- เสนอเพิ่ม: satang integer 1..99999999 เป็น **merchant cap ของ suite นี้**; ไม่ใช่ universal Stripe limit และไม่ได้แปลว่า 1 satang เรียกเก็บเงินจริงได้ ต้องมี account/payment-method minimum fixture แยก
- Implemented ใน inventory command: delta ต้องเป็น safe integer ไม่เป็น0, |delta|<=2147483647 และ stock+delta ต้องอยู่ในช่วง DB; ค่าติดลบถูกต้องเมื่อ stock พอ
- เสนอเพิ่ม: ASCII SKU 1..100; name 1..255 Unicode code points; description <=16384 UTF8 bytes, note <=2048 UTF8 bytes; reject NUL/lone surrogate/explicit bidi overrides แต่รับภาษาไทย/Arabic/emoji ปกติ
- เสนอเพิ่ม: JSON depth<=32; JSON API body<=1048576 bytes; guest server TTL604800 วินาที หมดอายุเมื่อ now>=createdAt+TTL
- Webhook: past signature tolerance300 วินาที; future skew30 เป็นนโยบายเสริมของแอป อย่าสรุปว่า SDK เช็กเวลาแบบสมมาตร
- Body size เป็นขนาด UTF8 ของ **ทั้ง envelope** ไม่ใช่ JS string.length; 10KiB=10240 และ 1MiB=1048576 bytes; 1MiB field อาจทำให้ JSON body เกิน1MiB เมื่อรวม overhead

ตัวเลข schema เป็น oracle ที่ต้องตรวจ finite/safe ด้วย ตัว JSON Schema อย่างเดียวตรวจ HMAC, expiry, authorization, side effects, UTF8 byte limit, duplicate keys และ arithmetic overflow ไม่ได้ และต้องปิด type coercion/removeAdditional/useDefaults ใน validator ที่ใช้ทดสอบ

## Assertion ที่ทุกชุดต้องอ้างอิง

- **NO_LEAK**: On all error surfaces (JSON/HTML/RSC/headers/redirects), only allowlisted generic code/message + opaque requestId; no payload reflection, SQLSTATE, SQL text/params, real table/constraint names, stack/path, provider error body, secret/key/token, PII, DB URL. Check keys recursively and scan rendered text plus error frames; seed recognizable sentinel errors. RequestId alone can vary.
- **REJECT_NO_EFFECT**: No order/payment/stock/privilege changes, no Stripe write, no Resend delivery. Security audit/rate-limit counter may change, with bounded redacted fields; explicitly check business-table diff rather than blanket no DB activity.
- **SAFE_ACCEPT**: Only intended fixture mutation; canonical validated value persisted; integer/decimal oracle exact; protected ownership unchanged; response DTO contains allowed fields only.
- **INTEGER_EXACT**: Use BigInt or decimal strings for expected arithmetic; reject non-finite, fractional, unsafe or out-of-policy amounts before provider call. No coercion, wrap, rounding/truncation, saturation or scientific-string parse fallback.
- **NO_POLLUTION**: Before/after process-isolated invocation, Object.prototype and fresh objects have no isAdmin/role/polluted properties; authorization unchanged. Parsing __proto__ alone is not proof of pollution.
- **PLAIN_TEXT**: SQL/XSS text is inert data. Check exact safe persistence/readback, parameterized queries where observable, no expanded result set, no script execution/event handler, JS URL or external request in storefront/admin/email rendering. Do not reject every apostrophe or all non-ASCII prose.
- **AT_MOST_ONCE**: One durable fulfillment/state transition and inventory-ledger effect for one business payment. Duplicate audit attempts allowed; one logical email/outbox delivery, external retries use idempotency. Do not claim exactly-once network delivery from DB transaction.
- **RESOURCE_BOUNDED**: Measure actual UTF8 request bytes (including JSON/Action envelope), max depth and memory/time; do not trust Content-Length alone; never assert body byte size using JS string.length.
- **GUEST_PRIVATE**: Same generic denial and same allowed DTO for wrong/expired/missing token, unauthorized owner and nonexistent well-formed order. No order/email/PII/token in denial or cache; do not demand nanosecond-identical latency.
- **AUTHORITATIVE**: Order/PaymentIntent amount/currency and owner derive from server DB/session, never client productName/unitPrice/total/currency/userId; shared bundle-part demand aggregated atomically.

## Matrix ฉบับเต็ม

คำย่อ transport: SA = Server Action (ปกติ wire200), RH = Route Handler, UNIT = ไม่มี HTTP, CONTRACT = endpoint/adapter ยังไม่ได้ผูกกับ implementation
`current_surface` หมายถึงมีจุดรับจริง ไม่ได้หมายถึง assertions ผ่านแล้ว; `proposed_contract` คือกฎใหม่บนจุดรับนั้น; `adapter_required` คือยังต้องมี interface จริง/isolated adapter

### N — Numerical & monetary

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| N-01 — quantity ศูนย์/ติดลบ<br>cart.add<br>current_surface | `{"mode":"values","operation":"set","path":"/quantity","values":[0,-1,-99999]}` | semantic **422**<br>wire cart.add=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-02 — cart: ขอบที่ผ่าน 1,9,10<br>cart.add<br>current_surface | `{"mode":"values","operation":"set","path":"/quantity","values":[1,9,10]}` | semantic **200**<br>wire cart.add=200<br>accept | SAFE_ACCEPT |
| N-03 — cart: เกินเพดาน 11<br>cart.add<br>current_surface | `{"mode":"values","operation":"set","path":"/quantity","values":[11]}` | semantic **422**<br>wire cart.add=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-04 — checkout: ขอบที่ผ่าน 1,99,100<br>checkout.create<br>current_surface | `{"mode":"values","operation":"set","path":"/items/0/quantity","values":[1,99,100]}` | semantic **200**<br>wire checkout.create=200<br>accept | SAFE_ACCEPT, AUTHORITATIVE |
| N-05 — checkout: ศูนย์/ติดลบ/เกิน 100<br>checkout.create<br>current_surface | `{"mode":"values","operation":"set","path":"/items/0/quantity","values":[0,-1,-99999,101]}` | semantic **422**<br>wire checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-06 — signed/unsigned 32-bit, safe integer, signed/unsigned 64-bit และ ±1<br>cart.add, checkout.create<br>current_surface | `{"mode":"recipe","name":"integerLexemes","args":{"paths":{"cart.add":"/quantity","checkout.create":"/items/0/quantity"},"lexemes":["2147483646","2147483647","2147483648","-2147483648","-2147483649","4294967295","4294967296","9007199254740990","9007199254740991","9007199254740992","9007199254740993","9223372036854775807","9223372036854775808","-9223372036854775808","-9223372036854775809","18446744073709551615","18446744073709551616","-4294967296"],"encodings":["numeric_token","numeric_string"]}}` | semantic **422**<br>wire cart.add=200; checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT<br>Keep lexemes as strings until raw JSON emission. For native Action number argument, record representability; unrepresentable lexemes also require api.json raw parser test, not a rounded imitation. |
| N-07 — fraction และ floating-point leak<br>cart.add, checkout.create<br>current_surface | `{"mode":"recipe","name":"fieldValuesByTarget","args":{"paths":{"cart.add":"/quantity","checkout.create":"/items/0/quantity"},"values":[0.30000000000000004,1e-8,1.5,-0.5]}}` | semantic **422**<br>wire cart.add=200; checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-08 — string encoded number/boolean/null<br>cart.add<br>current_surface | `{"mode":"values","operation":"set","path":"/quantity","values":["010"," 10 ","1e5","10","0x10","",true,false,null]}` | semantic **422**<br>wire cart.add=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-09 — satang: ศูนย์/ติดลบ/fraction/unsafe<br>amount.validate<br>proposed_contract | `{"mode":"values","operation":"set","path":"/amountSatang","values":[0,-1,-99999,0.30000000000000004,1e-8,100000000,2147483647,9007199254740991]}` | semantic **422**<br>wire amount.validate=N/A<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |
| N-10 — satang: 1, cap−1, cap<br>amount.validate<br>proposed_contract | `{"mode":"values","operation":"set","path":"/amountSatang","values":[1,99999998,99999999]}` | semantic **200**<br>wire amount.validate=N/A<br>accept | SAFE_ACCEPT<br>Integer validator only. Provider minimum/method/currency rules checked separately; 1 satang need not be chargeable. |
| N-11 — native non-finite values<br>amount.validate<br>proposed_contract | `{"mode":"recipe","name":"nativeValues","args":{"path":"/amountSatang","names":["NaN","Infinity","-Infinity"]}}` | semantic **422**<br>wire amount.validate=N/A<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Construct via switch; do not JSON.stringify (non-finite becomes null). Unit test has no HTTP. |
| N-12 — NaN/Infinity เป็น raw JSON token ที่ผิด grammar<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":NaN}","{\"quantity\":Infinity}","{\"quantity\":-Infinity}","{\"quantity\":010}"]}` | semantic **400**<br>wire api.json=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-13 — valid JSON exponent ล้น finite range<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":1e309,\"label\":\"QA\"}","{\"quantity\":-1e309,\"label\":\"QA\"}"]}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |
| N-14 — mathematically integral JSON lexical forms<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":1.0,\"label\":\"QA\"}","{\"quantity\":1e0,\"label\":\"QA\"}"]}` | semantic **200**<br>wire api.json=200<br>accept | SAFE_ACCEPT<br>JSON numeric 1.0/1e0 are integer value 1. Do not confuse with string '1e0'. |
| N-15 — stockQuantity: ศูนย์/int32 boundary ที่ผ่าน<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/stockQuantity","values":[0,1,2147483646,2147483647]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT<br>Schema-only or isolated fixture. No checkout/payment side effects. DB int32 stock cap may be lowered explicitly by merchant policy. |
| N-16 — stockQuantity: negative/fraction/เกิน int32<br>admin.product<br>proposed_contract | `{"mode":"values","operation":"set","path":"/stockQuantity","values":[-1,-99999,1.1,2147483648,4294967295,9007199254740991]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |
| N-17 — delta ติดลบที่ถูกต้องเมื่อ stock เพียงพอ<br>inventory.delta<br>current_surface | `{"mode":"values","operation":"set","path":"/delta","values":[-1,-99999,1]}` | semantic **200**<br>wire inventory.delta=200<br>accept | SAFE_ACCEPT<br>stockBefore=100000; reset per variant; stockAfter=stockBefore+delta exactly. Negative delta is valid. |
| N-18 — delta=0, fraction, string, out-of-range<br>inventory.delta<br>current_surface | `{"mode":"values","operation":"set","path":"/delta","values":[0,1.1,"-1",-2147483648,2147483648]}` | semantic **422**<br>wire inventory.delta=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| N-19 — stock underflow/overflow หลังบวก delta<br>inventory.delta<br>current_surface | `{"mode":"recipe","name":"stockArithmetic","args":{"variants":[{"stockBefore":0,"delta":-1},{"stockBefore":2147483647,"delta":1}]}}` | semantic **409**<br>wire inventory.delta=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |
| N-20 — price decimal major-unit: ขอบ DB numeric(12,2)<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/price","values":["0.00","0.01","9999999999.98","9999999999.99"]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT<br>Catalog draft pricing only. Zero/free item may be stored; do not create a zero-amount Stripe charge. Payment total cap is separate. |
| N-21 — price: fraction precision/negative/scientific/type/DB overflow<br>admin.product<br>proposed_contract | `{"mode":"values","operation":"set","path":"/price","values":["-1","-99999","0.001","10000000000.00","1e5"," 10 ","NaN","Infinity",0.1,{},[]]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |
| N-22 — decimal-safe conversion oracle<br>money.convert<br>current_surface | `{"mode":"recipe","name":"decimalConversion","args":{"variants":[{"input":"0.10","expectedSatang":"10"},{"input":"0.20","expectedSatang":"20"},{"input":"0.30","expectedSatang":"30"},{"input":"010","expectedSatang":"1000"},{"input":"9999999999.99","expectedSatang":"999999999999"}]}}` | semantic **200**<br>wire money.convert=N/A<br>accept | INTEGER_EXACT<br>Leading zero major-unit decimal accepted consistently with current price grammar. Expected results encoded as decimal strings, not monetary floats. |
| N-23 — ห้าม truncate/coerce malformed decimal<br>money.convert<br>proposed_contract | `{"mode":"values","operation":"set","path":"/amount","values":["0.001","0.00000001","0.30000000000000004","1e5","1foo","NaN","Infinity","-Infinity"," 10 "]}` | semantic **422**<br>wire money.convert=N/A<br>reject | NO_LEAK, INTEGER_EXACT<br>Strict converter regression contract; hardened implementation and current evidence are recorded in packages/security-harness/README.md. |
| N-24 — แก้ client unitPrice/productName ต้องยังคำนวณจาก DB<br>checkout.create<br>current_surface | `{"mode":"recipe","name":"clientPriceTamper","args":{"unitPrices":["0","0.01","9999999999999999","NaN"],"productNames":["Changed title"]}}` | semantic **200**<br>wire checkout.create=200<br>accept | SAFE_ACCEPT, AUTHORITATIVE<br>Known unitPrice is a string hint currently ignored by authoritative price calculation. Never assert tampered total is used. |
| N-25 — currency: wrong type/case/whitespace/confusables<br>amount.validate<br>proposed_contract | `{"mode":"values","operation":"set","path":"/currency","values":["THB"," thb ","TH฿","t\u200bhb","usd","",null,[],{}]}` | semantic **422**<br>wire amount.validate=N/A<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Adapter policy accepts only canonical lowercase thb. DB stores THB; display currency never changes payment currency. |
| N-28 — aggregate duplicate items เกิน stock<br>checkout.create<br>current_surface | `{"mode":"recipe","name":"duplicateLineDemand","args":{"stockBefore":100,"lines":[{"quantity":60},{"quantity":60}],"sameProduct":true}}` | semantic **409**<br>wire checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, AUTHORITATIVE |
| N-29 — sum/multiply overflow รวม shipping/tax/discount<br>amount.validate<br>proposed_contract | `{"mode":"recipe","name":"moneyArithmetic","args":{"variants":[{"unitSatang":"9007199254740991","quantity":"2"},{"subtotalSatang":"99999999","shippingSatang":"1","discountSatang":"0"},{"subtotalSatang":"100","shippingSatang":"0","discountSatang":"101"}]}}` | semantic **422**<br>wire amount.validate=N/A<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT<br>Compute with BigInt/checked intermediate arithmetic; reject invalid final payable; do not clamp negative total. |

### S — Malformed structure & type confusion

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| S-01 — Array/Object แทน SKU string<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/sku","values":[[],["QA"],{},10,true,null]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-02 — Object/Array แทน quantity number<br>cart.add<br>current_surface | `{"mode":"values","operation":"set","path":"/quantity","values":[{},{"value":1},{"$gt":0},[],[1]]}` | semantic **422**<br>wire cart.add=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-03 — items ผิดรูป/ว่าง/เกินขอบ<br>checkout.create<br>current_surface | `{"mode":"recipe","name":"checkoutItems","args":{"variants":["null","object","string","empty_array","101_valid_items","array_with_null","array_with_scalar"]}}` | semantic **422**<br>wire checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-04 — 100 distinct valid items เป็น positive boundary<br>checkout.create<br>current_surface | `{"mode":"recipe","name":"checkoutItems","args":{"variants":["100_valid_distinct_items"]}}` | semantic **200**<br>wire checkout.create=200<br>accept | SAFE_ACCEPT |
| S-05 — missing required key<br>cart.add, admin.product, checkout.create<br>current_surface | `{"mode":"recipe","name":"deleteRequired","args":{"fields":{"cart.add":["productId","quantity"],"admin.product":["sku","price"],"checkout.create":["shippingAddress","items"]}}}` | semantic **422**<br>wire cart.add=200; admin.product=200; checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-06 — unknown fields/mass assignment<br>cart.add, admin.product, checkout.create<br>proposed_contract | `{"mode":"recipe","name":"mergeUnknown","args":{"objects":[{"isAdmin":true},{"role":"super_admin"},{"userId":"customer_B"},{"paymentStatus":"paid"},{"total":1},{"currency":"usd"},{"unexpectedField":"untrusted"}]}}` | semantic **422**<br>wire cart.add=200; admin.product=200; checkout.create=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Strict client input allowlist proposed; current Zod may strip keys. Separately assert ignored fields never affect authorization/price. |
| S-07 — prototype pollution keys preserved as own JSON members<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":1,\"label\":\"QA\",\"__proto__\":{\"isAdmin\":true}}","{\"quantity\":1,\"label\":\"QA\",\"constructor\":{\"prototype\":{\"polluted\":true}}}","{\"quantity\":1,\"label\":\"QA\",\"prototype\":{\"role\":\"super_admin\"}}"]}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT, NO_POLLUTION<br>Use raw/JSON.parse. Object-literal __proto__ changes prototype; parsing this JSON alone is not proof of pollution. |
| S-08 — prototype payload nested ใน allowed field<br>admin.product<br>current_surface | `{"mode":"recipe","name":"prototypeNested","args":{"path":"/description","rawObjects":["{\"__proto__\":{\"isAdmin\":true}}","{\"constructor\":{\"prototype\":{\"isAdmin\":true}}}"]}}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, NO_POLLUTION |
| S-09 — malformed JSON/truncated/comma/comments/empty<br>api.json<br>adapter_required | `{"mode":"raw","values":["","{","{\"quantity\":1,}","{\"quantity\":","{\"quantity\":1 /*x*/}"]}` | semantic **400**<br>wire api.json=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-10 — valid JSON top-level ผิดชนิด<br>api.json<br>adapter_required | `{"mode":"raw","values":["null","[]","\"text\"","1","true"]}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-11 — duplicate keys: ห้าม first/last-wins เงียบๆ<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":1,\"quantity\":-1,\"label\":\"QA\"}","{\"quantity\":-1,\"quantity\":1,\"label\":\"QA\"}"]}` | semantic **400**<br>wire api.json=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Proposed duplicate-member rejection; after JSON.parse cannot detect duplicates. No regex-only parser. |
| S-12 — nested JSON 100 ชั้น และเกิน depth32<br>api.json<br>adapter_required | `{"mode":"recipe","name":"nestedJson","args":{"depths":[33,100],"rootDepth":1,"container":"object","terminal":1,"layer":"parser_only"}}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT, RESOURCE_BOUNDED<br>Use structural parser harness so rejection proves depth limit, not unknown-field policy. HTTP-equivalent 422. |
| S-13 — parser depth accepted boundary<br>api.json<br>adapter_required | `{"mode":"recipe","name":"nestedJson","args":{"depths":[31,32],"rootDepth":1,"container":"object","terminal":1,"layer":"parser_only"}}` | semantic **200**<br>wire api.json=200<br>accept | SAFE_ACCEPT<br>Parser harness only; HTTP-equivalent 200, not an accepted business request. |
| S-14 — over-limit raw body B+1 / chunked<br>api.json, stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"bodyBytes","args":{"offsets":[1],"relativeTo":"target_limit","encodings":["ascii","thai","emoji"],"delivery":["normal","chunked_no_content_length"],"validEnvelope":true}}` | semantic **413**<br>wire api.json=413; stripe.webhook=413<br>reject | NO_LEAK, REJECT_NO_EFFECT, RESOURCE_BOUNDED |
| S-15 — body B−1 และ B bytes<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"bodyBytes","args":{"offsets":[-1,0],"relativeTo":"target_limit","encodings":["ascii","thai","emoji"],"delivery":["normal"],"validEnvelope":true,"padding":"metadata.qa_padding","signFinalBytes":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, RESOURCE_BOUNDED<br>Distinct supported events/order per variant; provider extension metadata allowed. Exactly B is not oversized. |
| S-16 — Server Action envelope 4MiB+1<br>admin.product<br>current_surface | `{"mode":"recipe","name":"actionBodyBytes","args":{"bytes":4194305,"field":"description","includeRscOverhead":true}}` | semantic **413**<br>wire admin.product=413<br>reject | NO_LEAK, REJECT_NO_EFFECT, RESOURCE_BOUNDED<br>Actual native protocol under controlled ingress; client serialization failure is not server rejection. |
| S-17 — wrong Content-Type/unsupported encoding<br>api.json<br>adapter_required | `{"mode":"recipe","name":"headers","args":{"variants":[{"content-type":"text/plain"},{"content-type":"application/x-www-form-urlencoded"},{"content-type":"application/json","content-encoding":"gzip"}],"body":"{\"quantity\":1,\"label\":\"QA\"}"}}` | semantic **415**<br>wire api.json=415<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Proposed API policy rejects compression before inflation; no unbounded decompression. |
| S-18 — invalid UTF8 bytes<br>api.json<br>adapter_required | `{"mode":"recipe","name":"rawBytes","args":{"hex":["c328","eda080","ff"],"insideJsonString":true}}` | semantic **400**<br>wire api.json=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-19 — literal NUL inside JSON string<br>api.json<br>adapter_required | `{"mode":"recipe","name":"rawBytes","args":{"hex":["00"],"insideJsonString":true}}` | semantic **400**<br>wire api.json=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| S-20 — escaped NUL: JSON ถูกต้องแต่ field ไม่ผ่าน<br>admin.product<br>proposed_contract | `{"mode":"values","operation":"set","path":"/sku","values":["QA\u0000SKU"]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Wire contains escaped \u0000. Also expand into name/description/note contracts, before DB text error. |
| S-21 — raw 64-bit tokens ไม่สูญ precision ใน harness<br>api.json<br>adapter_required | `{"mode":"raw","values":["{\"quantity\":9007199254740993,\"label\":\"QA\"}","{\"quantity\":9223372036854775807,\"label\":\"QA\"}","{\"quantity\":18446744073709551615,\"label\":\"QA\"}"]}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT |

### T — Text, Unicode & injection

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| T-01 — SKU 0/101 และ whitespace after trim<br>admin.product<br>proposed_contract | `{"mode":"recipe","name":"stringLength","args":{"path":"/sku","lengths":[0,101],"fill":"A","extra":[" ","\t","\r\n"]}}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Trim before min-length validation; current .min(1).trim() ordering needs regression. |
| T-02 — SKU 1/99/100 ASCII ผ่าน<br>admin.product<br>current_surface | `{"mode":"recipe","name":"stringLength","args":{"path":"/sku","lengths":[1,99,100],"fill":"A"}}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT |
| T-03 — name 254/255 ASCII ผ่าน<br>admin.product<br>current_surface | `{"mode":"recipe","name":"stringLength","args":{"path":"/name","lengths":[254,255],"fill":"A"}}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT |
| T-04 — name 256/10KiB/1MiB ไม่ผ่าน field limit<br>admin.product<br>current_surface | `{"mode":"recipe","name":"stringLength","args":{"path":"/name","lengths":[256,10240,1048576],"fill":"A"}}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, RESOURCE_BOUNDED<br>1MiB field below 4MiB Action limit; handled field failure, not automatically 413. |
| T-05 — description 10KiB และ16KiB boundary ผ่าน<br>admin.product<br>proposed_contract | `{"mode":"recipe","name":"utf8FieldBytes","args":{"path":"/description","sizes":[10240,16383,16384],"fill":"A"}}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT |
| T-06 — description 16KiB+1/1MiB<br>admin.product<br>proposed_contract | `{"mode":"recipe","name":"utf8FieldBytes","args":{"path":"/description","sizes":[16385,1048576],"fill":"A"}}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, RESOURCE_BOUNDED |
| T-07 — SKU: RTL/ZWSP/ZWJ/homoglyph/control<br>admin.product<br>proposed_contract | `{"mode":"values","operation":"set","path":"/sku","values":["ABC\u202e123","\u2066ABC\u2069","AB\u200bC","AB\u200dC","АBC","ＡＢＣ","ABC\u0000","ABC\r\nX"]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>ASCII SKU policy; no aliasing Cyrillic/fullwidth to ASCII. Prose has different policy. |
| T-08 — ไทย/Arabic/valid surrogate pair/NFC-NFD ผ่าน<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/name","values":["ชุดแต่งรถ","قطعة سيارة","A🚗B","é","é"]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT, PLAIN_TEXT<br>Valid prose supported; compare using documented normalization. |
| T-09 — unpaired surrogate และ bidi override<br>admin.product<br>proposed_contract | `{"mode":"recipe","name":"escapedUnicode","args":{"path":"/name","jsonStringTokens":["\"\\ud800\"","\"\\udfff\"","\"ABC\\u202eDEF\""]}}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Proposed Unicode policy. Preserve escaped lone surrogate bytes; serializer replacement U+FFFD must not masquerade as server validation. |
| T-10 — emoji code-point boundary 255<br>admin.product<br>proposed_contract | `{"mode":"recipe","name":"stringLength","args":{"path":"/name","lengths":[255],"fill":"🚗","unit":"unicode_code_points"}}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT<br>JSON Schema maxLength counts code points; Zod may count UTF16 units. Define one policy and flag mismatch. |
| T-11 — SQLi ใน description ต้องเป็น inert text<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/description","values":["' OR '1'='1' --","'); SELECT pg_sleep(2); --","O'Reilly","1 UNION SELECT NULL --"]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT, PLAIN_TEXT<br>Isolated DB/short statement timeout; no query expansion, execution or SQL-induced delay. Status alone cannot prove parameterization. |
| T-12 — NoSQL operator object แทน string<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/description","values":[{"$ne":null},{"$gt":""},{"$where":"return true"}]}` | semantic **422**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Postgres type-confusion probe; not a claim of MongoDB usage. |
| T-13 — Stored XSS ในชื่อสินค้าเป็น plain text<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/name","values":["<script>globalThis.__qaXss=1</script>","<img src=x onerror=\"globalThis.__qaXss=1\">","<svg onload=\"globalThis.__qaXss=1\">","javascript:globalThis.__qaXss=1","\"><img src=x onerror=globalThis.__qaXss=1>"]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT, PLAIN_TEXT<br>Check admin/storefront/error UI/email sink; no script, event handler or external request. CSP blocking alone not escaping. |
| T-14 — Stored HTML ใน description<br>admin.product<br>current_surface | `{"mode":"values","operation":"set","path":"/description","values":["<a href=\"javascript:globalThis.__qaXss=1\">click</a>","<iframe srcdoc=\"<script>parent.__qaXss=1</script>\"></iframe>"]}` | semantic **200**<br>wire admin.product=200<br>accept | SAFE_ACCEPT, PLAIN_TEXT<br>Plain-text policy. If rich HTML is explicit product behavior, define sanitizer allowlist/DOM assertions before adapting tests. |
| T-15 — note field validator: oversize/NUL<br>api.json<br>adapter_required | `{"mode":"recipe","name":"noteContract","args":{"variants":[{"kind":"length","bytes":2049},{"kind":"length","bytes":10240},{"kind":"length","bytes":1048576},{"kind":"value","value":"hello\u0000world"}],"layer":"field_validator"}}` | semantic **422**<br>wire api.json=422<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>No checkout note field; HTTP-equivalent for unit validator. Full 1MiB note body can exceed 1MiB including JSON overhead and get 413. |
| T-16 — note: HTML/SQL text และ2048-byte boundary ผ่าน<br>api.json<br>adapter_required | `{"mode":"recipe","name":"noteContract","args":{"variants":[{"kind":"value","value":"<img src=x onerror=globalThis.__qaXss=1>"},{"kind":"value","value":"' OR 1=1 --"},{"kind":"length","bytes":2048}],"layer":"note_adapter"}}` | semantic **200**<br>wire api.json=200<br>accept | SAFE_ACCEPT, PLAIN_TEXT |
| T-17 — duplicate SKU<br>admin.product<br>current_surface | `{"mode":"recipe","name":"duplicateSku","args":{"existing":"QA-SKU-001","candidate":"QA-SKU-001"}}` | semantic **409**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Generic conflict; no SQLSTATE/table/constraint. Case-fold equivalence requires explicit policy; exact DB uniqueness alone not case-insensitive. |

### G — Guest token, UUID & expiry

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| G-01 — orderId ผิด UUID/type<br>guest.track<br>current_surface | `{"mode":"values","operation":"set","path":"/orderId","values":["","not-a-uuid","20000000000040008000000000000002","20000000-0000-4000-8000-000000000002' OR 1=1 --",null,[],{}]}` | semantic **422**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| G-02 — token missing/null/type/length/charset/tamper<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"guestToken","args":{"variants":["missing","null","array","object","empty","length_63","length_65","non_hex_64","uppercase_valid","one_char_changed","leading_space","trailing_newline","embedded_nul","base64_instead_of_hex","jwt_instead_of_hmac"]}}` | semantic **404**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, GUEST_PRIVATE<br>Clear all guest cookies; missing explicit token must not accidentally authenticate via cookie. |
| G-03 — valid token/order pair<br>guest.track<br>current_surface | `{"mode":"recipe","name":"guestToken","args":{"variants":["valid_parameter","valid_cookie_only"]}}` | semantic **200**<br>wire guest.track=200<br>accept | SAFE_ACCEPT, GUEST_PRIVATE<br>Auth accepts only scoped DTO; no token reflection. Cookie attributes also asserted HttpOnly/Secure under production-like TLS/SameSite. |
| G-04 — token A + order B / nonexistent UUID / customer B<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"guestOwnership","args":{"variants":["token_A_order_B","valid_shape_nonexistent_order","customer_B_session_order_A","customer_session_guest_order_wrong_token"]}}` | semantic **404**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, GUEST_PRIVATE |
| G-05 — expiry ก่อนขอบ 1 วินาที<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"guestClock","args":{"ageSeconds":[604799],"signedCreationTime":true}}` | semantic **200**<br>wire guest.track=200<br>accept | SAFE_ACCEPT<br>TTL=604800 proposed server rule. Cookie age does not substitute for this check. |
| G-06 — expiry เท่าขอบ/เกินขอบ<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"guestClock","args":{"ageSeconds":[604800,604801],"signedCreationTime":true}}` | semantic **404**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, GUEST_PRIVATE<br>Expired iff now >= createdAt+TTL. Current verifier lacks expiry enforcement; expected gap until implemented. |
| G-07 — creation timestamp invalid/future/seconds-vs-ms<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"guestClock","args":{"creationValues":["invalid_date","now_plus_1_second","unix_seconds_as_milliseconds","out_of_date_range"],"mintForFixture":true}}` | semantic **404**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, GUEST_PRIVATE<br>Server fixture/validator seam only; attacker cannot submit createdAt through current track API. No unsigned expiry input should be trusted. |
| G-08 — token 10KiB/1MiB ใน Action argument<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"stringLength","args":{"path":"/guestToken","lengths":[10240,1048576],"fill":"a"}}` | semantic **404**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT, GUEST_PRIVATE, RESOURCE_BOUNDED<br>Body argument, not URL/cookie header. Header/URL limits tested separately (431/414 if configured), not conflated with 413. |
| G-09 — expiry bypass ด้วย body field<br>guest.track<br>adapter_required | `{"mode":"recipe","name":"mergeUnknown","args":{"objects":[{"expiresAt":"9999-12-31T23:59:59Z"},{"createdAt":"2026-09-24T00:00:00Z"},{"userId":"guest_other"}],"layer":"normalized_adapter"}}` | semantic **422**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Current actions are positional; applies only to proposed object adapter. Replaying valid token after real server expiry remains G-06. |

### W — Stripe webhook & recovery

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| W-01 — signature missing/empty/wrong secret/tampered<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeSignature","args":{"variants":["missing","empty","wrong_secret","wrong_signature","v0_only","missing_t","missing_v1"]}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| W-02 — valid signature over exact raw bytes<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeSignature","args":{"variants":["valid","multiple_v1_one_valid","v1_valid_plus_v0"]}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, AT_MOST_ONCE<br>Multiple v1 values may be legitimate during key rotation; don't reject solely because more than one signature. |
| W-03 — แก้ whitespace/key order/newline หลังเซ็น<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeSignature","args":{"variants":["space_after_sign","reorder_after_sign","newline_after_sign","unicode_escape_after_sign"]}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Sign first, then mutate bytes. Equivalent parsed JSON is insufficient. |
| W-04 — signature timestamp age 299/300 seconds<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeTime","args":{"headerOffsetsSeconds":[-299,-300],"eventCreatedOffsetSeconds":0,"freezeClock":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT<br>SDK past-age boundary, frozen integer-second clock. Verify installed version; at tolerance accepted. |
| W-05 — signature timestamp age 301 seconds<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeTime","args":{"headerOffsetsSeconds":[-301],"eventCreatedOffsetSeconds":0,"freezeClock":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| W-06 — future skew +30 ผ่านตาม policy<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeTime","args":{"headerOffsetsSeconds":[30],"freezeClock":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT |
| W-07 — future skew +31/+301 ไม่ผ่าน<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeTime","args":{"headerOffsetsSeconds":[31,301],"freezeClock":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Additional application policy, not a claim Stripe SDK enforces symmetric ±300 seconds. |
| W-08 — t header malformed/NaN/negative/overflow/ms<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeHeaderLexemes","args":{"timestamps":["NaN","Infinity","-1","1.5","1e5","1790208000junk","1790208000000","18446744073709551615"],"signLexemeExactly":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Tests strict timestamp grammar and range beyond signature digest. Avoid accidental parseInt acceptance. |
| W-09 — old event.created แต่ fresh signature<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeTime","args":{"headerOffsetsSeconds":[0],"eventCreatedOffsetSeconds":-86400,"freezeClock":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, AT_MOST_ONCE<br>Valid delayed event for still-applicable fixture; event.created is not delivery signature t. Evaluate order state separately. |
| W-10 — signed malformed JSON/top-level/type/data.object<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeMalformed","args":{"variants":["invalid_json","null_root","array_root","missing_data","data_null","object_array","missing_type","type_array","missing_id","id_object"],"signFinalBytes":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Correct signature over malformed body; expect generic 400 without TypeError/DB query/500. |
| W-11 — signed event.created wrong type/noninteger/range<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeEventCreated","args":{"values":[null,"1790208000",-1,1.5,1790208000000,9007199254740991],"signFinalBytes":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| W-12 — signed amount_received mismatch/fraction/type<br>stripe.webhook<br>current_surface | `{"mode":"values","operation":"set","path":"/data/object/amount_received","values":[0,-1,-99999,9999,10001,0.30000000000000004,"10000",null,{},2147483647,9007199254740991]}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT, INTEGER_EXACT<br>Re-sign each mutated final body. Server stored expected amount=10000; audit row may be inserted, no fulfillment. |
| W-13 — signed currency mismatch/type/Unicode<br>stripe.webhook<br>proposed_contract | `{"mode":"values","operation":"set","path":"/data/object/currency","values":["usd"," thb ","t\u200bhb","",null,[],{}]}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Re-sign; malformed currency must not trigger .toLowerCase TypeError/500. |
| W-14 — signed binding/account/livemode mismatch<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeBinding","args":{"variants":["other_payment_intent","other_order_metadata","event_livemode_true","intent_livemode_true","foreign_account","invalid_order_uuid"]}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>This deployment is direct-account-only; connected-account policy differs. Test account/PI/DB ownership, not just HMAC. |
| W-15 — sequential duplicate/same PI distinct event IDs<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeDuplicates","args":{"variants":["same_event_twice","different_event_ids_same_pi"],"concurrency":1}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, AT_MOST_ONCE<br>Assert all deliveries HTTP200 after durable success; inventory/state/email logical effects once. |
| W-16 — concurrent duplicates<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeDuplicates","args":{"variants":["same_event","different_event_ids_same_pi"],"concurrency":2,"barrier":"before_state_transition"}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, AT_MOST_ONCE<br>Real overlap/barrier, not Promise.all on instant mocks. Retries in runner must not conceal unexpected 500. |
| W-17 — out-of-order success แล้ว failed<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeSequence","args":{"events":["payment_intent.succeeded","payment_intent.payment_failed"],"freshSignatureEach":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | SAFE_ACCEPT, AT_MOST_ONCE<br>Final order stays paid/fulfilled; no stock restoration, no duplicate receipt. |
| W-18 — valid unknown event/additive provider fields<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"stripeExtensions","args":{"variants":["unhandled_type","additional_event_field","additional_payment_intent_field"]}}` | semantic **200**<br>wire stripe.webhook=200<br>accept_or_noop_by_variant | SAFE_ACCEPT<br>Unhandled valid event ACK with zero fulfillment; additive fields on handled event accepted. Do not apply client strict-unknown policy to whole Stripe event. |
| W-19 — signed event มี prototype key<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripePrototype","args":{"rawExtension":"\"__proto__\":{\"isAdmin\":true}","signFinalBytes":true}}` | semantic **400**<br>wire stripe.webhook=400<br>reject | NO_LEAK, REJECT_NO_EFFECT, NO_POLLUTION<br>Dangerous prototype keys specifically forbidden despite normal provider extensions being allowed. |
| W-20 — DB commit failure หลัง valid signature<br>stripe.webhook<br>current_surface | `{"mode":"recipe","name":"fault","args":{"at":"fulfillment_transaction_commit","sentinel":"QA_DB_SENTINEL_SQLSTATE_23505_products_unique","recoverThenRetry":true}}` | semantic **500**<br>wire stripe.webhook=500<br>retry | NO_LEAK, REJECT_NO_EFFECT, AT_MOST_ONCE<br>First HTTP500 generic; retry after recovery HTTP200 exactly one committed fulfillment. No 2xx ACK before commit/durable enqueue. |
| W-21 — Resend failure หลัง DB commit<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"fault","args":{"at":"email_delivery","sentinel":"QA_RESEND_SENTINEL_SECRET","recoverThenRetry":true}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | NO_LEAK, AT_MOST_ONCE<br>Requires durable outbox/retry. Fulfillment remains committed once; one pending logical message eventually sent via sink. If durable work not recorded, cannot ACK 200. |
| W-22 — paid after canceled/reservation-expired<br>stripe.webhook<br>proposed_contract | `{"mode":"recipe","name":"stripeLatePayment","args":{"states":["canceled","reservation_expired"],"resolution":"durable_reconciliation"}}` | semantic **200**<br>wire stripe.webhook=200<br>accept | NO_LEAK, AT_MOST_ONCE<br>200 only after durable reconciliation/refund job recorded. No blind fulfillment or new stock decrement; failure to persist recovery job ->500 in W-20-style fault test. |

### A — Auth, errors & concurrency

| ID / เป้าหมาย | Payload / recipe | Expected | Assertions / เงื่อนไข |
|---|---|---|---|
| A-01 — anonymous/expired/revoked session<br>admin.product<br>current_surface | `{"mode":"recipe","name":"auth","args":{"identities":["anonymous","expired_admin","revoked_admin","clerk_customer_without_admin_session"]}}` | semantic **401**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT |
| A-02 — authenticated admin role ไม่มี product-write permission<br>admin.product<br>current_surface | `{"mode":"recipe","name":"auth","args":{"identities":["staff_without_product_write"],"overrides":[{"role":"super_admin","isAdmin":true}]}}` | semantic **403**<br>wire admin.product=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Server session permission is authoritative; use a fixture role that really lacks this permission. Mere label 'staff' is not proof of denial. |
| A-03 — cross-origin cookie-auth mutation<br>admin.product<br>current_surface | `{"mode":"recipe","name":"origin","args":{"variants":["untrusted_origin","forged_forwarded_host"]}}` | semantic **403**<br>wire admin.product=403<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Native Action boundary; no mutation. Missing Origin is a separate documented proxy policy, not automatically equivalent. |
| A-04 — rate limit exceeded<br>guest.track<br>proposed_contract | `{"mode":"recipe","name":"rateLimit","args":{"limitFixture":"configured_guest_tracking_limit","extraRequests":1}}` | semantic **429**<br>wire guest.track=200<br>reject | NO_LEAK, REJECT_NO_EFFECT<br>Isolated rate-limit backend/key; bounded sequential requests; Retry-After present, no identity leak. Existing limit not assumed. |
| A-05 — unexpected Drizzle/Neon error injection<br>admin.product<br>current_surface | `{"mode":"recipe","name":"fault","args":{"at":"product_write","sentinel":"QA_DB_SENTINEL_SQLSTATE_23505_products_unique_stack_secret"}}` | semantic **500**<br>wire admin.product=200<br>retry | NO_LEAK, REJECT_NO_EFFECT<br>Handled Action wire200 + failure; semantic500. No raw error.message/cause/stack in client response. |
| A-06 — สอง checkout แย่งชิ้นสุดท้าย<br>checkout.create<br>current_surface | `{"mode":"recipe","name":"checkoutRace","args":{"stockBefore":1,"quantityEach":1,"requests":2,"barrier":"before_stock_reservation","expectedStatuses":[200,409]}}` | semantic **409**<br>wire checkout.create=200<br>one_accept_one_conflict | NO_LEAK, AUTHORITATIVE, AT_MOST_ONCE<br>One semantic200 and one409, both handled Action wire200. One order/reservation, stock0; rejecter no Stripe/Resend. Verify bundle shared-parts variant too. |

## Payload generators ที่ต้องรักษา representation

```ts
// Raw numeric lexemes: ห้าม Number("18446744073709551615") ก่อนส่ง
const uint64Raw = '{"quantity":18446744073709551615,"label":"QA"}';
const nonfiniteRaw = '{"quantity":NaN}'; // invalid JSON -> 400
const nativeNonfinite = [NaN, Infinity, -Infinity]; // validator unit -> reject
// JSON.stringify({quantity:NaN}) ได้ null ซึ่งเป็นคนละกรณี

// __proto__ ต้องเป็น own JSON member; ไม่สร้างด้วย object literal
const pollutionRaw =
  '{"quantity":1,"label":"QA","__proto__":{"isAdmin":true}}';

// valid JSON escape -> NUL หลัง parse: field validation -> 422
const escapedNulRaw = '{"sku":"A\\u0000B"}';
// literal 00 byte ใน JSON string -> syntax/encoding -> 400
const literalNulBytes = Buffer.concat([
  Buffer.from('{"label":"A'), Buffer.from([0]), Buffer.from('B"}')
]);

// depth รวม root container = 1
let nestedRaw = '1';
for (let i = 0; i < 100; i++) nestedRaw = '{"x":' + nestedRaw + '}';

const tenKiB = "A".repeat(10 * 1024);
const oneMiB = "A".repeat(1024 * 1024);
const bytes = Buffer.byteLength(JSON.stringify({ description: oneMiB }), "utf8");
// bytes > 1MiB เพราะ JSON envelope; เทียบ limit ของ target ให้ถูกตัว

// Fake clock must control server time. Sign final body, not reserialized data.
// Only use an isolated fixture secret; do not mock signature verification.
const signature = stripe.webhooks.generateTestHeaderString({
  payload: rawBody,
  secret: isolatedWebhookSecret,
  timestamp: frozenNowSeconds
});
await fetch(isolatedWebhookUrl, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": signature },
  body: rawBody
});
```

Raw JSON syntax cases ต้องใช้ JSON Route Handler หรือ parser harness ที่ระบุ ไม่ใช้ serializer ของ HTTP library ที่เปลี่ยน payload ให้เอง Native Server Action ต้องใช้ protocol จริงและ decode result ให้ถูกชนิด

## Test expansion และ evidence

1. โหลด valid fixture ใหม่ต่อ variant; ใช้ isolated DB/project ที่ allowlist และ credentials เข้า production ไม่ได้, Stripe test account, Clerk test users, Resend sink ตาม CLAUDE.md §6.2 ก่อน provider import/side effects
2. ขยาย values/recipe เป็น test ชื่อ `ID:target:variant:layer`; แก้ครั้งละหนึ่ง field; auth valid สำหรับ malformed input, body valid สำหรับ auth test, signature valid สำหรับ webhook schema test
3. อ่าน exact raw response ก่อน normalize; assert generic error บน raw response แล้วค่อย normalize ชื่อ field แบบ documented ห้าม normalizer แปลง raw DB error ให้ดูปลอดภัย
4. เปรียบเทียบ DB snapshots, stock ledger, order/payment state, Stripe writes และ logical email/outbox count โดยรอ eventual worker ในเวลาที่กำหนด; security audit/rate-limit counter ไม่จำเป็นต้องเป็นศูนย์
5. ชุด race ใช้ barrier ให้ transaction ซ้อนทับจริง และตรวจฐานข้อมูลภายหลัง; unit/mock ที่ไม่รัน concurrency จริงต้องไม่รายงานเป็น integration pass
6. resource probes รัน serial, bounded worker/time budgets; ห้ามขยายเป็น load test ขนาดใหญ่ ชุด errors/faults ต้องทดสอบ generic responses ทั้ง dev test build และ production-like isolated build โดยไม่เรียก production
7. ผลที่ไม่มี implementation ให้เป็น UNIMPLEMENTED พร้อมเหตุผล ผลที่เรียกไม่ได้ให้เป็น BLOCKED พร้อม evidence; ห้าม silently skip หรือแก้ threshold เพื่อให้ผ่าน
8. จด seed/case ID, actual byte length, serializer, server clock, status/body, DB diff, side-effect counts, duration/RSS และ cleanup เฉพาะ fixtures ของ run

ตัวอย่าง case ที่ใช้ส่งต่อได้ตรง schema:

```json
{
  "id": "S-07",
  "targets": [
    "api.json"
  ],
  "summary": "prototype pollution keys preserved as own JSON members",
  "category": "S",
  "applicability": "adapter_required",
  "actor": "target_default",
  "fixture": "target_default",
  "input": {
    "mode": "raw",
    "values": [
      "{\"quantity\":1,\"label\":\"QA\",\"__proto__\":{\"isAdmin\":true}}",
      "{\"quantity\":1,\"label\":\"QA\",\"constructor\":{\"prototype\":{\"polluted\":true}}}",
      "{\"quantity\":1,\"label\":\"QA\",\"prototype\":{\"role\":\"super_admin\"}}"
    ]
  },
  "expected": {
    "semanticStatus": 422,
    "httpStatus": {
      "api.json": 422
    },
    "outcome": "reject",
    "errorCode": "INVALID_INPUT",
    "invariants": [
      "NO_LEAK",
      "REJECT_NO_EFFECT",
      "NO_POLLUTION"
    ],
    "detail": "Use raw/JSON.parse. Object-literal __proto__ changes prototype; parsing this JSON alone is not proof of pollution."
  }
}
```

## หลักอ้างอิง

- JSON ไม่รองรับ NaN/Infinity เป็น number token และการแลก integer ที่แม่นยำทั่วไปมีขอบเขตตาม implementation: [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)
- Raw body ต้องคง bytes สำหรับ signature: [Stripe signature verification](https://docs.stripe.com/webhooks/signature)
- Webhook delivery อาจซ้ำและไม่เรียงลำดับ: [Stripe webhooks](https://docs.stripe.com/webhooks)
- SDK มี default past-age tolerance300; future policy ต้องตรวจตามเวอร์ชันที่ติดตั้ง: [stripe-node Webhooks.ts](https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts)
- Body-size setting เป็นของ Server Actions: [Next.js serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
- PostgreSQL integer และ numeric bounds: [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)

Reference ของ provider เป็นเอกสารปัจจุบันที่ตรวจเพื่อออกแบบ; version-specific tests ต้อง pin ตาม lockfile ในงานสร้าง runner

---

## ## คู่มือ Test Harness ฉบับแก้ไข

ดู [คู่มือคำสั่งและข้อจำกัดของ harness](../../../packages/security-harness/README.md) สำหรับ validation, runner tests, report generation, strict corpus gate, diagnostics และ replay ด้วย case/seed

รายงาน Gemini เดิมที่อ้าง 488 variants ถูกแทนด้วย [manifest ที่สร้างจาก runner](artifacts/coverage-manifest.json) และ [รายงานหลักฐานและช่องว่าง](artifacts/gaps-and-failures-report.md) จำนวน variants คำนวณใหม่จาก corpus ไม่ใช่ค่าคงที่

PASS ใช้ได้เฉพาะ evidence layer ที่ระบุ; parser/schema tests ไม่ใช่หลักฐาน application endpoint, function call ไม่ใช่ HTTP, และข้อมูลที่ไม่ได้วัดเป็น BLOCKED/UNIMPLEMENTED ไม่ใช่ PASS หรือ product failure โดยอัตโนมัติ

Native integration, guest expiry, DB/provider side effects, concurrency, resource watchdog และ stored-XSS browser evidence ยังต้องเชื่อม fixtures/transport ที่แยกจากข้อมูลจริงก่อนตรวจ ห้ามตั้ง fake API key หรือ localhost URL แล้วถือว่า isolation พร้อม
