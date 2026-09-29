# Prompt สำหรับ Gemini Flash

คุณเป็น Senior SDET ให้สร้าง automated security tests ของ South Aero จากไฟล์แนบ corpus.json, corpus.schema.json และ payload-contracts.schema.json โดยใช้ README.md เป็นคำอธิบาย contract

งานนี้คือการเขียน test harness และ tests ไม่ใช่ทำให้ assertions อ่อนลงเพื่อให้ code ปัจจุบันผ่าน และไม่แก้ production code โดยพลการ

## Input และ mapping

- corpus มี 102 active test groups หลาย variants เป้าหมาย/fixture/recipe/expected.httpStatus ระบุไว้ครบ; N-26/N-27 coupon ถูกถอดตามคำขอลูกค้าเมื่อ 2026-09-25 ห้ามนำกลับมาหรือสร้างระบบ coupon โดยพลการ
- อ่าน target.binding ก่อนสร้าง adapter: mutations ส่วนใหญ่เป็น Next.js 15 Server Actions; มี Stripe POST /api/webhooks/stripe เป็น HTTP จริง
- inventory.delta ผูกกับ `apps/admin/actions/inventory.actions.ts#adjustInventoryAction` แล้ว โดย adapter ปัจจุบันเรียก shared production command กับ memory fixture ใน layer `service_unit`; ห้ามนับเป็น DB/native HTTP integration หรือสร้าง wire status สมมติ ต้องต่อ isolated Admin/DB จริงเพื่อผ่าน full corpus
- amount.validate, api.json และ note ใช้ isolated validator/parser adapter ของ proposed contracts; ระบุ evidence layer ให้ตรง และไม่สร้าง public test endpoint ในแอป
- ตรง guest.track และ admin.product ให้ขยายครอบคลุมฟังก์ชันทั้งสองที่ระบุ เมื่อกรณีนั้นเกี่ยวข้อง
- อ่าน recipeDefinitions ทุกตัวและ implement ด้วย explicit dispatcher ห้าม eval/Function จาก data

## Implementation requirements

1. ตรวจ repo scripts/test framework ปัจจุบัน เลือก Vitest สำหรับ pure/unit/handler tests และ Playwright หรือ runner ที่ repo ใช้สำหรับ native boundary/browser tests ไม่ติดตั้งหลาย framework ซ้ำโดยไม่จำเป็น
2. Validate corpus ตาม schema ด้วย coercion=false, removeAdditional=false, useDefaults=false; ขยายหนึ่ง field/variant ต่อ fresh valid fixture และใส่ seed/case ID เพื่อ replay
3. ตัวเลขเกิน MAX_SAFE_INTEGER เก็บเป็น string lexeme แล้วสร้าง raw bytes ห้ามผ่าน Number ก่อนส่ง JSON NaN/Infinity invalid grammar ต้องส่ง raw; native NaN/Infinity ใช้ unit/protocol ที่รองรับ และแยกจาก null
4. HTTP route assert expected real status; handled Server Action assert wire200 และ structured success:false/error allowlist + semanticStatus เป้าหมาย ไม่มี HTTP422 ของ Server Action โดยสมมติ Framework throws/500 ที่ไม่ตรง contract ต้อง FAIL
5. ไม่สร้าง normalization layer ที่ซ่อน raw error leaks ตรวจ raw JSON/HTML/RSC/headers ก่อน normalize ตามชื่อ field และ allowlist ที่ review ได้ หาก implementation ไม่มี errorCode ให้รายงาน contract gap อย่าสร้าง fake code เพื่อผ่าน
6. Preserve __proto__/constructor.prototype keys ด้วย raw JSON หรือ safe own-property operations; ห้าม deep-merge payload ลง harness global state; prototype tests รัน process แยก
7. UTF8 byte limits, code-point limits, UTF16/native serializer, lone surrogates, body envelope และ Content-Length เป็นคนละแกน ต้องบันทึก representation ที่ server ได้จริง
8. Freeze server time สำหรับ guest/signature boundary; guest cookie7วันไม่ใช่ server token expiry และ event.created ไม่ใช่ header t
9. ใช้ Stripe test signature จริงจาก final raw body; schema tests ต้องมี valid signature; signature corruption tests ต้องไม่ re-sign หลัง corruption; webhook unknown additive fields ให้ accept/noop แต่ prototype keys reject ตาม policy
10. ตรวจ state/ledger และ Stripe/Resend side effects ตาม invariant ทุกครั้ง มี controlled two-request barrier สำหรับ race และ at-most-once business effect; assertions ต้องไม่ผูกกับจำนวน security-audit rows ที่อาจเปลี่ยนอย่างถูกต้อง
11. Positive controls ต้องมีเพื่อพิสูจน์ว่า harness ไม่ reject ทุก input เช่น negative delta ที่ stockพอ, amount boundary, valid Arabic/emoji, inert SQL/XSS prose และ valid multi-v1 signatures
12. XSS ตรวจ browser DOM/execution/network และ HTML ที่ render จาก email sink ทั้ง admin/storefront ห้ามนับว่าผ่านเพราะ CSP block เพียงอย่างเดียว ไม่ส่งข้อความไปยังผู้รับจริง
13. ก่อน import DB/provider modules มี automated isolation guard: explicit non-production allowlist/scoped credentials, Stripe test account, Clerk test fixtures, email sink; configไม่ครบต้อง fail closed ชื่อ NODE_ENV=test อย่างเดียวไม่พอ ห้ามโหลด root .env แล้วเรียก verify แบบไม่ตรวจ
14. Cleanup เฉพาะ fixture IDs ของ run ใน finally; ไม่ restore shared product stock ห้ามยิง production ไม่มี stress/load test ที่ไม่จำกัด
15. Proposed rules ไม่เท่ากับ current behavior: existing surface ที่ผิด contract => FAIL; unavailable surface => UNIMPLEMENTED; infrastructure unavailable => BLOCKED พร้อมเหตุผล ไม่ silently skip

## Output ที่ต้องส่ง

- adapters, recipe dispatcher, fixtures, pure/unit cases, native HTTP/Action tests, browser checks ตามความจำเป็น
- commands ที่ตรง package scripts จริงและคำสั่ง validate artifacts
- coverage manifest: caseId/target/variant/layer/actualWireStatus/semanticResult/dbDiff/providerCalls/result
- รายการ gaps และ expected failures ที่มีหลักฐาน แยกจาก runtime tests ที่ PASS
- README วิธี replay seed และตั้ง isolated environment โดยไม่ใส่ secrets
