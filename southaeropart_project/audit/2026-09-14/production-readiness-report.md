# South Aero — Production readiness and security review

**คำตัดสิน: NO-GO — ยังไม่พร้อมเปิด production/รับเงินจริง**

วันที่ตรวจ: 14 กันยายน 2026 (Asia/Bangkok) · Commit: `3b05acf8ddd30cc139c38974506a2ac4bdae8edb`

เป้าหมายตามผู้ใช้: มีแนวโน้มใช้ Cloudflare และฐานข้อมูล Neon ที่เข้าถึงภายนอกได้; ยังไม่ยืนยัน Workers adapter, staging, สิทธิ์ฐานข้อมูล หรือ provider accounts แยกกัน

พบข้อค้นพบ 25 กลุ่ม (Critical 1 / High 19 / Medium 5). กลุ่มหนึ่งอาจมีหลายอาการของ control เดียวกัน ระดับเหล่านี้เป็นการจัดลำดับความเสี่ยงของ review ไม่ใช่ CVSS ที่คำนวณอย่างเป็นทางการ และไม่ควรนำจำนวนนี้ไปรวมกับจำนวน npm advisory

งานครั้งนี้ตรวจและสร้างหลักฐาน/รายงาน ไม่ได้แก้ implementation, rotate keys, migrate DB, deploy หรือเปลี่ยน configuration ปลายทาง. รายงานแนบเดิมเป็นข้อมูลประกอบ ไม่ใช่คำสั่งหรือผลรับรองที่ยอมรับโดยอัตโนมัติ

## สิ่งที่ต้องจัดการก่อนอย่างอื่น

1. Rotate/revoke Neon credentials ที่อยู่ใน Git 8 ไฟล์ และตรวจ access logs ตาม SEC-01. ไม่ได้พิสูจน์ว่ารหัสยังใช้ได้หรือเคยมีการบุกรุก จึงไม่ควรสรุปว่าฐานข้อมูลถูกโจมตีแล้ว
2. ปิดช่องโหว่ด้าน admin content/MFA, public bootstrap และ auth fail-open; อัปเกรด dependencies ไปยังสาย supported/ได้รับ patch
3. แก้ stock reservation/fulfillment/cancel และ payment binding/state transitions เป็น lifecycle เดียว พร้อม regression tests บน PostgreSQL แยก
4. ทำ migrations/CI/Workers preview และทดสอบ acceptance gates ใน staging รวม restore drill ก่อนพิจารณา GO

## ขอบเขตและความน่าเชื่อถือของหลักฐาน

- Inventory: 637 tracked files; ค้นข้อความและสแกน regex ใน 357 text files; 24 action files, 6 Route Handlers, 36 pages และ 28 test files
- ไล่เชิงลึกตาม trust boundaries: admin/session/MFA, customer/guest ownership, checkout→PaymentIntent→webhook→stock→cancel, media, public API/SSE, schema/migrations, env/CI, frontend security และ Cloudflare compatibility
- การนับไฟล์หมายถึง inventory/search ไม่ใช่ยืนยันว่าอ่านทุกบรรทัดหรือทดสอบทุก branch. ใช้ไฟล์/บรรทัดของแต่ละ finding เป็นขอบเขตหลักฐานที่ตรวจจริง
- ไม่เรียก destructive verification, seed, DB writes, provider payments/refunds/uploads หรือส่งอีเมลจริง. Legacy stateful runner ยังไม่พิสูจน์ credentials isolation/email sink
- รายงานนี้ไม่ใช่ penetration test ผ่าน Cloudflare, ASVS certification หรือหลักประกันว่าปราศจากช่องโหว่

## ผลการตรวจที่รันใหม่

- **ผ่าน — Vitest 164/164**: lib 45, ui 6, admin 50, storefront 63. คำสั่ง `corepack pnpm -r --filter admin --filter storefront --filter @repo/lib --filter @repo/ui test`; [audit/2026-09-14/vitest-direct.log](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/vitest-direct.log)
- **ผ่าน — TypeScript 5 workspaces**: `corepack pnpm -r --no-bail typecheck`; [audit/2026-09-14/typecheck-direct.log](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/typecheck-direct.log)
- **ผ่านพร้อม 4 warnings — lint ของทั้งสองแอป**: `corepack pnpm -r --filter admin --filter storefront lint`; [audit/2026-09-14/lint-direct.log](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/lint-direct.log). เป็น next/image warnings; ไม่ใช่ zero warnings ตามถ้อยคำกว้างในรายงานเดิม
- **ผ่าน — next build ทั้ง admin/storefront**: `corepack pnpm -r --filter admin --filter storefront build`; [audit/2026-09-14/build.log](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/build.log). เป็น build บน Windows Node.js ไม่ใช่ Cloudflare adapter build และไม่พิสูจน์ real provider integration
- **ไม่ผ่าน — dependency audit**: all 39; production-filter 30; [audit/2026-09-14/dependency-audit.json](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/dependency-audit.json) และ [audit/2026-09-14/dependency-audit-production.json](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/dependency-audit-production.json). Exit 1 หลังเชื่อม npm สำเร็จหมายถึงพบ advisory
- **ยืนยันอาการ 10 กรณีแบบ offline**: `node audit/2026-09-14/reproduce.cjs`; [audit/2026-09-14/reproduction-results.json](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/reproduction-results.json). ใช้ source จริงผ่าน TypeScript transpilation และ explicit doubles; assertions ตั้งใจพิสูจน์อาการเสีย ดังนั้นโปรแกรม exit 0 ไม่ใช่ security pass และไม่ใช่ PostgreSQL concurrency proof
- **Browser proof เฉพาะ SVG**: Chrome 153 headless ผ่าน Playwright ยืนยัน inline event marker ทำงานใน isolated HTML ภายใต้ relevant CSP directive; [audit/2026-09-14/browser-results.json](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/browser-results.json). ไม่ใช่การ inject ในแอปจริง
- **HTTP production บน loopback**: admin login 200, anonymous dashboard 307 ไป login; storefront home/mock path ตอบ 429 ใน local configuration นี้ จึงยังยืนยัน storefront smoke ไม่ผ่าน. ตรวจพบ CSP/HSTS/XFO/nosniff แต่ยังมี unsafe-inline; [audit/2026-09-14/runtime-results.json](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/audit/2026-09-14/runtime-results.json). ไม่ได้อ้างว่า 429 จะเกิดบน Cloudflare หรือยืนยัน root cause แล้ว
- **ยังไม่ตรวจใหม่ — Playwright 29 smoke / 3 stateful เต็มชุด**, signed-in role matrix, CSRF/proxy, real Stripe/Svix crypto integration, DB concurrency, load/soak, mobile GPU, restore/alerts. Admin smoke มี invalid-login action ที่เขียน audit log จึงไม่ใช่ read-only ทุกข้อ
- **Secret scan บางส่วน**: custom regex แบบ redacted และ git history metadata พบ SEC-01; ไม่ได้รัน Gitleaks/SAST แบบเต็ม. การไม่พบ pattern ใน response ไม่ใช่หลักประกันว่า client assets ทั้งหมดไม่มี secret

เครื่องมือ: Node 22.17.1, pnpm ที่โปรเจคกำหนด 9.7.0 ผ่าน Corepack. เริ่มแรก root Turbo เรียก pnpm 11.19.0 จาก host PATH จึงรันไม่สำเร็จ; เปลี่ยนไปเรียก workspace scripts ด้วย Corepack 9.7.0 โดยตรง. Sandbox ทำให้ dependency บางตัวอ่านไม่ได้ จึงรัน checks ที่จำเป็นนอก sandboxแล้วผ่าน; ไม่จัดข้อจำกัดเครื่องมือนี้เป็น bug ใน source

## ข้อค้นพบและวิธีปิดแต่ละข้อ

### SEC-01 · Critical · รหัสผ่าน Neon อยู่ใน Git จำนวน 8 ไฟล์

**สถานะ: ไม่ผ่าน** · Secrets

พบ URI ของ Neon พร้อม username/password ที่ไม่ใช่ข้อความ placeholder ในไฟล์ tracked รวมไฟล์ MCP, scratch และ sync scripts; ประวัติของไฟล์บางส่วนย้อนถึง 1f18485, 6d5f865, b25dc32 และ 3c95bc9. ไม่ได้ทดลอง credential จึงยังไม่ยืนยันว่าใช้งานได้หรือเคยถูกนำไปใช้

**ผลกระทบ/เงื่อนไข:** ผู้ที่ได้สำเนา repository/history อาจเข้าถึงฐานข้อมูลตามสิทธิ์ของ credential โดยไม่ผ่านเว็บ หากรหัสยังใช้ได้

**หลักฐาน:** [.agents/plugins/south-aero-mcp/mcp_config.json:10](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/.agents/plugins/south-aero-mcp/mcp_config.json:10), [apps/admin/scratch_check_db.js:3](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/scratch_check_db.js:3), [packages/db/sync-schema.cjs:5](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/db/sync-schema.cjs:5)

**การตรวจ:** inventory.json ระบุตำแหน่งโดยไม่เก็บค่า secret; ตรวจรูปแบบ Neon URI และ git log แบบไม่แสดงเนื้อหา

**วิธีแก้และตรวจซ้ำ:** Rotate/revoke credential ที่ Neon, อัปเดต secret store ของผู้ใช้งานทั้งหมด, ตรวจ DB access logs, เอา literals/fallback credentials ออกจากโค้ดและ MCP config แล้วสแกนประวัติเต็ม; การ rewrite history ไม่ทดแทน rotation

### DEP-01 · High · Framework หมดระยะสนับสนุนและ dependency scan ไม่ผ่าน

**สถานะ: ไม่ผ่าน** · Dependencies

Next.js 14.2.35 อยู่ในสาย unsupported. npm audit พบ 39 รายการรวมทั้งหมด (Critical 3 / High 17 / Moderate 17 / Low 2), production filter 30 (Critical 2 / High 13 / Moderate 13 / Low 2). CI ใช้ Node 20 ที่ EOL แล้ว ขณะที่เครื่องตรวจใช้ Node 22.17.1

**ผลกระทบ/เงื่อนไข:** มีแพ็กเกจตรง affected ranges แต่จำนวน advisory ไม่ใช่จำนวนช่องโหว่ที่โจมตีเว็บนี้ได้จริง: Windows RCE กระทบ Windows hosting, AVIF RCE ต้องเข้าเส้นทาง optimizer/libheif, Happy DOM เป็นเครื่องมือทดสอบ, Drizzle advisory ต้องมี untrusted identifier ซึ่งยังไม่พบในเส้นทางที่อ่าน

**หลักฐาน:** [pnpm-lock.yaml:2251](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/pnpm-lock.yaml:2251), [.github/workflows/ci.yml:77](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/.github/workflows/ci.yml:77)

**การตรวจ:** dependency-audit.json และ dependency-audit-production.json; อ่าน advisory จาก maintainer โดยตรง

**วิธีแก้และตรวจซ้ำ:** อัปเกรด Next/Clerk/React/ORM/เครื่องมือให้เข้ากันบนสาย supported และ patched ตาม advisory ปัจจุบัน; อัปเดต lockfile แล้วทดสอบพฤติกรรมและ Workers runtime ใหม่ ห้ามใช้ audit fix แบบบังคับโดยไม่ประเมิน breaking changes

### STOCK-01 · High · สร้างออเดอร์หักสต็อกแล้ว การชำระเงินหักซ้ำ

**สถานะ: ไม่ผ่าน** · Commerce

createOrder หัก stockQuantity ภายใน transaction เมื่อสร้าง pending order; fulfillOrderPayment อ่านรายการเดิมและหักอีกครั้ง ตัวอย่างสต็อก 10 → checkout 9 → paid 8 สำหรับสินค้า 1 ชิ้น

**ผลกระทบ/เงื่อนไข:** สต็อกคลาดเคลื่อนทุกการซื้อและสินค้าหมดก่อนจริง; Math.max(0, ...) ซ่อนภาวะขาดสต็อก

**หลักฐาน:** [apps/storefront/actions/checkout.actions.ts:435](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:435), [apps/storefront/lib/order-fulfillment.ts:202](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-fulfillment.ts:202)

**การตรวจ:** reproduce.cjs STOCK-01 ใช้ fulfillment จริงกับสถานะหลัง checkout จำลอง; ไม่ใช่ real DB integration

**วิธีแก้และตรวจซ้ำ:** กำหนด lifecycle reservation/available/consumed ให้ชัด และ consume reservation เดิมเมื่อจ่ายแทนการหักซ้ำ พร้อม ledger/constraints และ test บน PostgreSQL

### STOCK-02 · High · ออเดอร์ค้างล็อกสินค้า และ bundle ไม่จองชิ้นส่วนร่วม

**สถานะ: ไม่ผ่าน** · Commerce

checkout จองเฉพาะ item.productId แต่ snapshot ชิ้นส่วน bundle ไว้โดยไม่หัก/จองชิ้นส่วน ณ จุดนี้; ไม่พบ reservation expiry/release worker; admin คืนเฉพาะออเดอร์ที่เคย paid. fulfillment ใช้ read-modify-write ของ products โดยไม่มี conditional stock decrement ทำให้ต่างออเดอร์แข่งกันเขียนค่าเดิมได้

**ผลกระทบ/เงื่อนไข:** guest สร้าง pending orders ทิ้งไว้ทำให้สินค้าหมดได้, bundle ที่แชร์อะไหล่อาจรับเงินเกิน stock จริง, การจ่ายต่างออเดอร์พร้อมกันอาจทำ stock update สูญหาย

**หลักฐาน:** [apps/storefront/actions/checkout.actions.ts:435](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:435), [apps/storefront/lib/order-fulfillment.ts:188](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-fulfillment.ts:188), [apps/admin/actions/order.actions.ts:419](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/order.actions.ts:419)

**การตรวจ:** Static flow review; ยังไม่มี concurrency/expiry test บน isolated PostgreSQL

**วิธีแก้และตรวจซ้ำ:** รวม demand ของสินค้าและอะไหล่ shared parts ก่อนจอง, ล็อกตามลำดับคงที่, จองแบบ atomic พร้อม TTL/release job และ late-payment compensation; ทดสอบ final-stock concurrency และ rollback จริง

### ORDER-01 · High · staff เปลี่ยนสถานะการเงินได้ และ cancel ซ้ำเพิ่ม stock ซ้ำ

**สถานะ: ไม่ผ่าน** · Commerce

updateOrderStatusAction ตรวจเพียง session ไม่ตรวจ role หรือ allowed transition; รับ paymentStatus จาก input และทำ paid/refunded ได้เอง. cancel โดยไม่ส่ง paymentStatus ทำให้ค่า paid เดิมค้าง จึงเรียก cancel ซ้ำแล้วเข้า restoreOrderStock ได้อีก; helper กลืน error ของการคืน stock

**ผลกระทบ/เงื่อนไข:** ผู้มีสิทธิ์ staff สามารถเปลี่ยนบันทึกการชำระเงิน/คืนสินค้าเกินจริง; สถานะ refunded ในเว็บไม่พิสูจน์ Stripe refund เพราะไม่พบ provider refund flow

**หลักฐาน:** [apps/admin/actions/order.actions.ts:370](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/order.actions.ts:370), [apps/admin/actions/order.actions.ts:405](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/order.actions.ts:405), [apps/admin/actions/order.actions.ts:479](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/order.actions.ts:479)

**การตรวจ:** reproduce.cjs STOCK-02: staff + paid order; cancel สองครั้ง stock 8 → 9 → 10 ใน persistence จำลอง

**วิธีแก้และตรวจซ้ำ:** แยก permission การเงินกับ fulfillment, บังคับ state machine และ re-auth, ทำ once-only restock ใน transaction พร้อม conditional transition; ใช้ Stripe refund idempotency และ reconcile ผลก่อนแสดงว่าคืนเงินจริง

### PAYMENT-01 · High · PaymentIntent ไม่ตรง binding แล้วยัง fulfill

**สถานะ: ไม่ผ่าน** · Payments

Stripe webhook พบ targetOrder.stripePaymentIntentId ต่างจาก event แล้ว console.warn แต่ดำเนิน fulfill ต่อ ซึ่งเขียน binding ใหม่. ไม่ใช่ช่องโหว่ปลอม signature: ต้องเป็น event ที่ผ่าน signature และยอด/สกุลเงินตรง

**ผลกระทบ/เงื่อนไข:** event ที่ผูกออเดอร์ผิดจาก metadata/ระบบภายในอาจนำ payment ของคนละ operation มายืนยันออเดอร์ได้

**หลักฐาน:** [apps/storefront/app/api/webhooks/stripe/route.ts:131](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/app/api/webhooks/stripe/route.ts:131), [apps/storefront/lib/order-fulfillment.ts:121](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-fulfillment.ts:121)

**การตรวจ:** reproduce.cjs PAYMENT-01: handler จริงตอบ 200 และเรียก fulfill เมื่อ bound ID ไม่ตรง; verifier ถูก mock

**วิธีแก้และตรวจซ้ำ:** Reject mismatch ก่อน side effect; ผูก order/intent/account/mode แบบ durable unique key รวม recovery ที่กำหนดชัดกรณี provider สำเร็จแต่ DB write ล้มเหลว

### PAYMENT-02 · High · Webhook failure แข่งกับ success แล้วอาจย้อน paid เป็น failed

**สถานะ: ไม่ผ่าน** · Payments

payment_failed อ่าน paymentStatus ก่อน update แยก query แล้ว update ด้วย order ID อย่างเดียว; success ที่ commit ระหว่างสองคำสั่งถูกทับได้. failure branch ไม่ทำ binding/live-mode checks แบบ succeeded. fulfillment ยอมรับ cancelled/refunded ตราบใด paymentStatus ไม่ใช่ paid

**ผลกระทบ/เงื่อนไข:** เงินเข้าจริงแต่ระบบกลับเป็น failed, late events เปิดออเดอร์ที่ปิดแล้ว และ retries อาจกลับเข้าหัก stock อีกรอบ

**หลักฐาน:** [apps/storefront/app/api/webhooks/stripe/route.ts:152](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/app/api/webhooks/stripe/route.ts:152), [apps/storefront/lib/order-fulfillment.ts:111](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-fulfillment.ts:111)

**การตรวจ:** Static interleaving analysis; ยังไม่จำลอง race บนฐานข้อมูลจริง

**วิธีแก้และตรวจซ้ำ:** ใช้ transition ที่ atomic และตรวจ binding/mode ทุก event ที่มีผล; durable event inbox + reconcile + ปฏิเสธ/ชดเชย late payment ตาม reservation policy

### AUTH-01 · High · Server Action ยอมผ่าน ownership เมื่อ auth() โยน exception

**สถานะ: ไม่ผ่าน** · Authorization

createOrGetStripePaymentIntent และ updateOrderReceiptEmail ตั้ง isOutsideRequestContext=true เมื่อ auth ล้มเหลว แล้วข้าม ownership ของ registered orders แม้ NODE_ENV=production; exception จึงถูกตีความเป็นสิทธิ์ทดสอบ

**ผลกระทบ/เงื่อนไข:** หาก request เข้าเส้นทางที่ Clerk context เสีย/ไม่ผ่าน middleware อาจแก้ receipt email หรือรับ client_secret ของออเดอร์อื่นได้ ต้องรู้ order UUID; ยังไม่ได้พิสูจน์ remote reachability ผ่าน Cloudflare

**หลักฐาน:** [apps/storefront/actions/checkout.actions.ts:838](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:838)

**การตรวจ:** reproduce.cjs AUTH-01: production action เปลี่ยน email ของ registered order เมื่อ mock auth โยน exception

**วิธีแก้และตรวจซ้ำ:** Fail closed ทุก exception ใน public action; แยก trusted internal/testing function ออกและใช้ dependency injection ห้ามใช้ auth failure เป็น bypass

### IDENTITY-01 · High · Guest ใช้ email เดิมผูกกับบัญชีจริง และการ merge อาศัย email ที่ไม่ยืนยัน

**สถานะ: ไม่ผ่าน** · Identity

guest checkout ค้น users.email แล้ว reuse existing id แม้ไม่ใช่ guest; ไม่มี guest token หาก reuse registered user จึงสร้าง order แล้วเจ้าตัว guest เข้า payment ไม่ได้. สำหรับ signed-in user ที่ยังไม่มี DB row ถ้า currentUser ล้มเหลว checkout ใช้ shipping email ที่กรอกเองส่งเข้า syncUserWithClerk ซึ่งย้าย orders/addresses ฯลฯ จาก ID เดิมโดยไม่จำกัด guest หรือ verified email

**ผลกระทบ/เงื่อนไข:** order spam เข้า account ผู้อื่น/guest checkout ล้มเหลว และมีเส้นทาง conditional account-data reassignment เมื่อ identity lookup ล้มเหลว; ไม่ได้ยืนยันการยึดบัญชีจากภายนอก

**หลักฐาน:** [apps/storefront/actions/checkout.actions.ts:189](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:189), [apps/storefront/actions/checkout.actions.ts:127](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:127), [apps/storefront/lib/user-sync.ts:55](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/user-sync.ts:55)

**การตรวจ:** Static end-to-end dataflow; ยังไม่ทดสอบ Clerk error path ผ่าน HTTP จริง

**วิธีแก้และตรวจซ้ำ:** แยก guest identity จาก verified account; ห้ามใช้ shipping email เป็น identity proof; merge เฉพาะ guest หลังพิสูจน์ email/claim token และตรวจ ownership ใน transaction

### BOOTSTRAP-01 · High · หน้า setup เปิดให้คนแรกสร้าง super_admin ได้

**สถานะ: ไม่ผ่าน** · Admin auth

/setup เป็น public และ setupSuperAdminAction ไม่ใช้ bootstrap secret/admin authorization. INSERT WHERE NOT EXISTS ไม่มี singleton constraint/lock จึงไม่ได้กัน concurrent first-admin creation แบบที่ comment กล่าวอ้าง

**ผลกระทบ/เงื่อนไข:** ถ้าเปิดเว็บกับฐานข้อมูลว่างก่อน owner setup ผู้เข้าถึงก่อนอาจยึดสิทธิ์ super_admin; race ของ distinct emails ต้องพิสูจน์ใน DB เพิ่ม

**หลักฐาน:** [apps/admin/middleware.ts:14](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/middleware.ts:14), [apps/admin/actions/auth.actions.ts:485](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:485), [apps/admin/actions/auth.actions.ts:516](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:516)

**การตรวจ:** Static; ไม่สร้าง admin จริง

**วิธีแก้และตรวจซ้ำ:** ทำ bootstrap ผ่าน one-off secured provisioning หรือ single-use secret และ unique singleton/lock; ปิด public setup ใน production แล้วทดสอบ direct action

### MFA-01 · High · ผู้ถือ session เปลี่ยน MFA factor และ recovery codes ได้โดยไม่ re-auth

**สถานะ: ไม่ผ่าน** · Admin auth

initiate/confirmMfaSetupAction ทำได้แม้ mfaEnabled=true; confirm รับ encryptedSecret และ recoveryCodesHash จาก browser ไม่ผูก pending setup กับ session ฝั่ง server ตรวจแค่ OTP ของ secret ใหม่

**ผลกระทบ/เงื่อนไข:** session ที่ถูกขโมยหรือ script ใน admin origin สามารถแทน MFA ของเจ้าของและตั้ง recovery ของตนได้ แม้ไม่ทราบรหัสผ่าน/OTP เดิม

**หลักฐาน:** [apps/admin/actions/auth.actions.ts:350](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:350), [apps/admin/actions/auth.actions.ts:382](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:382)

**การตรวจ:** reproduce.cjs MFA-01 ยืนยัน accepted client-chosen recovery hash และไม่มี password check

**วิธีแก้และตรวจซ้ำ:** เก็บ pending setup ฝั่ง server ผูกผู้ใช้+session+expiry; require recent password+existing MFA เพื่อ replace; generate recovery hashes ฝั่ง server, revoke/rotate sessions และ audit ใน transaction

### MFA-02 · High · MFA เป็น optional และ recovery/challenge ไม่ได้ consume แบบ atomic

**สถานะ: ไม่ผ่าน** · Admin auth

login สร้าง session ปกติเมื่อไม่เปิด MFA หรือเปิดแต่ secret หาย; disable MFA ใช้แค่ password. recovery read+update แยกกันทำให้ concurrent snapshots ใช้ code เดียวผ่านได้; challenge JWT ไม่มี durable one-time nonce และไม่มี last-used TOTP step

**ผลกระทบ/เงื่อนไข:** นโยบาย mandatory MFA ไม่เกิดจริง และ code/challenge replay ภายในอายุยังเป็นไปได้. ข้อพิสูจน์ helper ไม่เท่ากับ real DB race

**หลักฐาน:** [apps/admin/actions/auth.actions.ts:183](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:183), [apps/admin/actions/auth.actions.ts:293](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:293), [apps/admin/lib/mfa.ts:253](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/lib/mfa.ts:253)

**การตรวจ:** reproduce.cjs MFA-02 และ MFA-03; real HTTP replay/concurrency ยังไม่ตรวจ

**วิธีแก้และตรวจซ้ำ:** บังคับ enrollment ก่อนให้ privileged session, reject inconsistent MFA state, consume challenge/recovery/TOTP step ใน transaction, ยืนยันตัวตนซ้ำก่อน disable

### AUTH-02 · Medium · Lockout มี race; password limit เป็นอักขระ และ key/expiry ยังไม่ครบ

**สถานะ: ไม่ผ่าน** · Admin auth

recordFailedLogin อ่าน attempts แล้วเขียน attempts+1 จึงสูญจำนวนเมื่อพร้อมกัน; response เผยบัญชี disabled/locked และจำนวน attempts. bcrypt schema max(72) นับ UTF-16 characters แทน UTF-8 bytes. session มี absolute 8h แต่ไม่มี idle expiry; JWT ไม่กำหนด alg allowlist/issuer/audience; MFA มี fallback test secret และไม่ใช้ ADMIN_MFA_ENCRYPTION_KEY ที่ schema ประกาศ

**ผลกระทบ/เงื่อนไข:** lockout อ่อนลงภายใต้ concurrency; Unicode password อาจถูก truncate และการ rotate session secret กระทบการถอดรหัส MFA เดิม. ไม่ได้พิสูจน์ JWT forgery หรือ fallback exploit ใน production ที่มี key ถูกต้อง

**หลักฐาน:** [apps/admin/lib/auth.ts:217](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/lib/auth.ts:217), [apps/admin/actions/auth.actions.ts:42](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/auth.actions.ts:42), [apps/admin/lib/mfa.ts:64](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/lib/mfa.ts:64)

**การตรวจ:** Static; bcrypt positive/negative และ lockout helper tests เดิมผ่านแต่ไม่ครอบคลุม concurrent DB

**วิธีแก้และตรวจซ้ำ:** Atomic increment/account+IP shared limiter, generic responses, enforce bcrypt byte limit, domain-separated encryption/signing keys พร้อม rotation, idle expiry และ explicit JWT validation

### MEDIA-01 · High · update product ลบ/rename Cloudinary asset จาก publicId ที่ client ส่ง

**สถานะ: ไม่ผ่าน** · Media

currentDbImages ถูก query แต่ publicIdsToDelete มาจาก data.images โดยไม่ตรวจว่าตรงรายการของ product ก่อนเรียก provider; retained image path ใช้ publicId สำหรับ rename แบบเดียวกัน. DB delete มี productId guard แต่เกิดหลัง provider delete

**ผลกระทบ/เงื่อนไข:** บัญชี staff ที่แก้ product ได้อาจลบ/ย้าย asset อื่นใน Cloudinary account ที่รู้ publicId; validation failure หลังลบบางรายการทำให้ผลไม่ครบ

**หลักฐาน:** [apps/admin/actions/product.actions.ts:925](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/product.actions.ts:925), [apps/admin/actions/product.actions.ts:944](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/product.actions.ts:944), [apps/admin/actions/product.actions.ts:996](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/product.actions.ts:996)

**การตรวจ:** Static; ไม่เรียก delete/rename จริง

**วิธีแก้และตรวจซ้ำ:** รับเฉพาะ image row ID แล้ว resolve publicId/URL จาก DB ที่ผูก resource; ตรวจ permission ก่อน provider operation; durable cleanup/retry และ quota

### XSS-01 · High · SVG sanitizer แบบ regex ยังปล่อย event handler; CSP อนุญาต inline

**สถานะ: ไม่ผ่าน** · Browser

sanitizeAndFormatSvg ลบเฉพาะ on*= ที่ใส่ quote; unquoted handler คงอยู่และนำเข้า dangerouslySetInnerHTML. staff สร้าง/แก้ icon ได้. Email preview ยังมี srcDoc ไม่มี sandbox และ compile block.content เป็น HTML โดยไม่ escape

**ผลกระทบ/เงื่อนไข:** stored content ใน admin origin อาจรัน script เมื่อ admin อีกคนดู ทำรายการผ่าน session ของผู้ดูได้ แม้ cookie เป็น HttpOnly; โซ่ต่อไปยัง MFA replacement มีความเสี่ยงสูง

**หลักฐาน:** [apps/admin/components/icons/app-icon.tsx:94](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/components/icons/app-icon.tsx:94), [apps/admin/components/icons/app-icon.tsx:184](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/components/icons/app-icon.tsx:184), [apps/admin/components/newsletters/VisualEmailBuilder.tsx:1597](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/components/newsletters/VisualEmailBuilder.tsx:1597), [apps/admin/next.config.mjs:32](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/next.config.mjs:32)

**การตรวจ:** reproduce.cjs XSS-01 ยืนยัน sanitizer output; browser-results.json Chrome ยืนยัน event marker รันภายใต้ unsafe-inline ใน HTML แยก ไม่ได้ inject เข้าเว็บจริง

**วิธีแก้และตรวจซ้ำ:** SVG allowlist sanitizer ที่ parse DOM หรือยกเลิก raw SVG, sanitize/escape HTML, sandbox email iframe แบบไม่ให้ scripts/same-origin, CSP nonce/hash พร้อมทดสอบ integration

### ABUSE-01 · High · Rate limiter ข้าม instance ไม่ได้และเชื่อ forwarded IP

**สถานะ: ไม่ผ่าน** · Availability

Map เป็น process-local fixed window ไม่ใช่ shared sliding window; storefront เลือก leftmost x-forwarded-for ก่อน connection IP. maxBuckets แค่ prune expired แต่ไม่จำกัด active entries. guest-only sensitive limit, logged-in checkout/newsletter/upload/PaymentIntent ไม่มี operation limiter เทียบเท่า

**ผลกระทบ/เงื่อนไข:** หาก ingress ไม่ overwrite trusted headers ผู้ส่งเปลี่ยน IP key หลบ limit ได้; scaling/restart รีเซ็ต counters และ flood unique keys ทำให้ memory โต. ต้องไม่อ้างว่าเป็น DDoS protection ครบ

**หลักฐาน:** [apps/storefront/lib/rate-limiter.ts:149](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/rate-limiter.ts:149), [apps/storefront/lib/rate-limiter.ts:64](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/rate-limiter.ts:64), [apps/admin/middleware.ts:17](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/middleware.ts:17)

**การตรวจ:** reproduce.cjs ABUSE-01/02; edge deployment/WAF configuration ยังไม่ตรวจ

**วิธีแก้และตรวจซ้ำ:** กำหนด trusted proxy ของ target ให้ชัด ปิด origin bypass ใช้ edge/shared durable limiter ผูก account/IP/operation และมี hard bounds; load test เฉพาะ staging

### ENV-01 · High · env schema ไม่ถูก import ใน runtime และ provider mode ไม่ fail closed

**สถานะ: ไม่ผ่าน** · Configuration

ค้นไม่พบการ import lib/env ของทั้งสองแอป; modules ใช้ process.env โดยตรง. schema มีอยู่จึงไม่ใช่ startup gate. Stripe helper รับ test key ใน production; webhook success ปฏิเสธ test-mode แต่ recovery จาก retrievePaymentIntent ไม่ตรวจ livemode และไม่ตรวจผล fulfillment ก่อนรายงาน isAlreadyPaid

**ผลกระทบ/เงื่อนไข:** production เริ่มได้ทั้งที่ config สำคัญไม่ครบ; test key/ผิด account สร้าง payment flow ที่ webhook ไม่ยอมรับหรือ recovery รายงานจ่ายสำเร็จผิด

**หลักฐาน:** [apps/storefront/lib/env.ts:62](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/env.ts:62), [apps/admin/lib/env.ts:18](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/lib/env.ts:18), [packages/lib/src/stripe.ts:10](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/lib/src/stripe.ts:10), [apps/storefront/actions/checkout.actions.ts:881](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/checkout.actions.ts:881)

**การตรวจ:** Static import search; production build ผ่านไม่ได้ยืนยัน startup schema validation

**วิธีแก้และตรวจซ้ำ:** validate startup/build/runtime ผ่าน entrypoint จริง, แยก live/test environment ชัดเจน, ตรวจ account+mode ที่ทุก payment boundary และ propagate fulfillment failure

### DB-01 · High · Migration journal ไม่ครอบคลุม schema ปัจจุบัน

**สถานะ: ไม่ผ่าน** · Database

journal มีเพียง 0000/0001 แต่มี SQL 0002/0003 ที่ไม่ถูกลงทะเบียน; SQL migrations ที่ค้นไม่พบ stripe_payment_intent_id/order_item_bundle_parts/product_bundle_items/newsletter/homepage tables ตาม schema ปัจจุบัน. constraints stock>=0/quantity>0 และ unique payment intent ยังขาด

**ผลกระทบ/เงื่อนไข:** fresh deploy ผ่าน db:migrate อาจไม่มีตาราง/คอลัมน์ที่โค้ดเรียก; db:push ที่เคยใช้ทำให้เครื่องเดิมใช้งานได้แต่ไม่พิสูจน์ reproducible release

**หลักฐาน:** [packages/db/drizzle/meta/_journal.json:1](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/db/drizzle/meta/_journal.json:1), [packages/db/src/schema/orders.ts:36](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/db/src/schema/orders.ts:36), [packages/db/src/schema/orders.ts:73](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/db/src/schema/orders.ts:73)

**การตรวจ:** Static SQL/schema comparison; ไม่ migrate หรือ query catalog ของ Neon จริง

**วิธีแก้และตรวจซ้ำ:** สร้าง reviewed forward migration ครอบคลุม schema drift ห้ามแก้ migration เก่าเพื่อกลบประวัติ; fresh DB migrate+upgrade test, check constraints/indexes, จำกัด runtime role และแยก migration role

### CI-01 · High · CI ไม่ใช่ release gate ครบตามรายงาน

**สถานะ: ไม่ผ่าน** · Delivery

workflow build แค่ storefront และรัน test:security สองข้อ ไม่ได้รัน admin build หรือ smoke/stateful suite เต็ม; ไม่มี dependency scan/SAST job. mock Clerk publishable key ไม่ใช่หลักฐาน production config และ PostgreSQL service ต้องตรวจ transport ให้ตรง Neon websocket driver. Gitleaks allowlist ยกเว้น test/spec/verify ทั้งไฟล์

**ผลกระทบ/เงื่อนไข:** main อาจผ่าน job ที่จำกัดขอบเขตโดยยังมีช่องโหว่/สคริปต์ที่ secret scan ไม่ครอบคลุม; ยังไม่มีหลักฐาน required checks และ CI run ของ commit นี้

**หลักฐาน:** [.github/workflows/ci.yml:184](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/.github/workflows/ci.yml:184), [.github/workflows/ci.yml:164](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/.github/workflows/ci.yml:164), [.gitleaks.toml:6](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/.gitleaks.toml:6)

**การตรวจ:** Static workflow review; ไม่อ้างว่า CI ล้มเหลวแน่นอนเพราะไม่ได้รัน GitHub Actions

**วิธีแก้และตรวจซ้ำ:** CI ใช้ frozen lockfile, supported Node, build ทั้งแอป, dependency/Gitleaks/SAST, real isolated DB security tests และ adapter preview; required branch/deploy checks; allowlist เฉพาะ fixture ค่าแน่นอน

### TEST-01 · High · ชุดทดสอบเดิมไม่พิสูจน์ concurrency/IDOR/checkout ครบ และ isolation ไม่พอ

**สถานะ: ไม่ผ่าน** · Verification

concurrency-stock test ไม่มี orderItems/products fixture ใน concurrent case จึงไม่ตรวจ stock. Clerk/Stripe signatures ถูก mock. stateful จบที่ payment screen ไม่จ่าย/ตรวจ stock จริง; forged token ใช้ order ที่ไม่มีอยู่ ไม่ทดสอบ order ของ B. runner เปลี่ยนชื่อ DB ใน URL แต่ reuse credentials และ root provider env; guard ใช้ substring/override ไม่มี email sink หรือ run cleanup ที่ครบ

**ผลกระทบ/เงื่อนไข:** 164 tests ผ่านไม่เท่ากับ 100% coverage หรือ ASVS L2; รัน stateful โดยไม่แยก credentials อาจแก้ข้อมูล/เรียก provider ผิด environment

**หลักฐาน:** [apps/storefront/lib/concurrency-stock.test.ts:152](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/concurrency-stock.test.ts:152), [e2e/tests/storefront/checkout-flow.spec.ts:139](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/e2e/tests/storefront/checkout-flow.spec.ts:139), [scripts/run-stateful-e2e.mjs:40](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/scripts/run-stateful-e2e.mjs:40), [apps/storefront/scripts/test-guard.ts:31](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/scripts/test-guard.ts:31)

**การตรวจ:** 164 existing tests ผ่าน; 29 smoke/3 stateful ไม่ได้รันใหม่ทั้งชุดเพราะยังไม่ยืนยัน isolation

**วิธีแก้และตรวจซ้ำ:** Dedicated DB/project+restricted test role, verified test provider+email sink, fail-closed bootstrap ก่อน side effects, run-owned fixtures/cleanup; ทดสอบ 2 users/2 orders/shared parts และ HTTP boundary จริง

### REALTIME-01 · Medium · SSE สาธารณะ broadcast order metadata และจำสถานะใน instance เดียว

**สถานะ: ไม่ผ่าน** · Privacy and scaling

GET /api/realtime ไม่ตรวจ auth; POST ที่มี shared secret broadcast payload ไป clients ทั้งหมด. order notifier ส่ง orderId/orderNumber/status ให้ public subscribers; clients/version เก็บใน memory และ background fetch ไม่มี durable retry

**ผลกระทบ/เงื่อนไข:** ผู้ไม่เข้าสู่ระบบฟัง order metadata ได้โดยไม่ใช่การเปิดเผยที่อยู่ทั้งหมด; หลาย Workers instances จะไม่ได้ broadcast ถึงกัน และ event/notification หายได้เมื่อ process จบ

**หลักฐาน:** [apps/storefront/app/api/realtime/route.ts:92](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/app/api/realtime/route.ts:92), [apps/storefront/app/api/realtime/route.ts:214](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/app/api/realtime/route.ts:214), [apps/admin/actions/order.actions.ts:462](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/order.actions.ts:462)

**การตรวจ:** Static; ยังไม่เปิด SSE เก็บข้อมูลจริงหรือทดสอบหลาย instance

**วิธีแก้และตรวจซ้ำ:** public channel ส่งเฉพาะ catalog version; order event ต้อง per-user authorization; ใช้ shared coordinator/pubsub/durable retry และ backpressure

### DATA-01 · Medium · User merge หลายตารางไม่ atomic และ ban flag ไม่มี enforcement กลาง

**สถานะ: ไม่ผ่าน** · Database

syncUserWithClerk เปลี่ยนอีเมลเดิม/สร้าง row ใหม่/ย้ายหลาย child tables/ลบเดิมโดยไม่ transaction และ catch migration error แล้ว return success; isBanned ถูกตั้งจาก Clerk webhook แต่ไม่พบการตรวจใน protected customer actions ที่ไล่ดู

**ผลกระทบ/เงื่อนไข:** failure กลางทางทิ้งข้อมูลแยกสอง account และ retry อาจไม่ merge ต่อ; DB-ban อย่างเดียวไม่ปิดสิทธิ์ session ที่ยังใช้ได้ ทั้งนี้ Clerk deleted-user revocation เป็นคนละ control

**หลักฐาน:** [apps/storefront/lib/user-sync.ts:58](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/user-sync.ts:58), [apps/storefront/lib/user-sync.ts:93](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/user-sync.ts:93), [apps/storefront/app/api/webhooks/clerk/route.ts:133](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/app/api/webhooks/clerk/route.ts:133)

**การตรวจ:** Static; provider session revocation จริงยังไม่ตรวจ

**วิธีแก้และตรวจซ้ำ:** transaction+idempotent merge พร้อม verified identity, central customer active/ban guard และ reconciliation; ทดสอบ failure ทุกจุด

### EMAIL-01 · Medium · Email ไม่ durable, มี HTML interpolation และ guest link ใช้งานข้ามอุปกรณ์ไม่ได้

**สถานะ: ไม่ผ่าน** · Delivery and privacy

fulfillment email failure ถูกกลืน; retry order paid ออกก่อนส่งซ้ำ. order-email ต่อ shipping address/product snapshot ลง HTML โดยไม่ escape; tracking URL ใช้ NEXT_PUBLIC_SITE_URL default localhost และไม่แนบ guest access mechanism. newsletter broadcast ทำ provider sends ก่อน durable outcome และไม่มี operation idempotency

**ผลกระทบ/เงื่อนไข:** รับเงินแล้วลูกค้าไม่ได้ receipt, retry อาจส่ง campaign ซ้ำ, receipt content injection และ guest เปิดลิงก์บนอุปกรณ์ใหม่ถูกปฏิเสธ

**หลักฐาน:** [apps/storefront/lib/order-email.ts:33](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-email.ts:33), [apps/storefront/lib/order-email.ts:51](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-email.ts:51), [apps/storefront/lib/order-fulfillment.ts:238](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/lib/order-fulfillment.ts:238), [apps/admin/actions/newsletter.actions.ts:367](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/admin/actions/newsletter.actions.ts:367)

**การตรวจ:** Static; ไม่ส่งอีเมลจริง

**วิธีแก้และตรวจซ้ำ:** transactional outbox+retry/dedupe, escape HTML/validate URL, รวม canonical storefront URL และใช้ guest access link ที่มีอายุ/claim flow; audit outcome durable

### MEDIA-02 · Medium · Review uploads/URLs ไม่ enforce ownership, format และ moderation pending ครบ

**สถานะ: ไม่ผ่าน** · Validation

uploadReviewImageAction ตรวจเพียง data:image prefix/ความยาว; submitReview รับ imageUrls URL ใดก็ได้และไม่มี max array. shared uploader รับ pending/missing moderation result เป็น success. หลาย input เช่น checkout address/items และ MFA code/token ไม่มี maximum length/count ที่เจาะจง

**ผลกระทบ/เงื่อนไข:** ผู้ใช้ข้าม upload/moderation path ผ่าน arbitrary URLs, ใช้ storage/provider เกิน quota หรือเพิ่มงาน DB/memory; moderation ไม่ทดแทน XSS protection

**หลักฐาน:** [apps/storefront/actions/review.actions.ts:15](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/review.actions.ts:15), [apps/storefront/actions/review.actions.ts:266](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/actions/review.actions.ts:266), [packages/lib/src/cloudinary.ts:64](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/lib/src/cloudinary.ts:64)

**การตรวจ:** Static; upload-validator ของ admin มี magic bytes tests ผ่าน แต่ไม่ครอบคลุม customer upload

**วิธีแก้และตรวจซ้ำ:** validate decoded bytes/format/dimensions, ownership asset records และ count/byte budgets; quarantine pending/missing result จน approved, scoped rate limits และ orphan cleanup

### CF-01 · High · ยังไม่มี deployment integration หรือ Workers runtime evidence

**สถานะ: ไม่ผ่าน** · Cloudflare

ไม่พบ wrangler/open-next/vinext configuration หรือ Workers build ใน repository. Next build ที่ผ่านเป็น Node.js บน Windows. global Neon Pool, process-local SSE/rate limiter, timers และ provider SDK ต้องตรวจใน adapter runtime. โมเดลใน public มีขนาด 78.2 และ 54.3 MiB

**ผลกระทบ/เงื่อนไข:** ยังไม่ใช่ artifact ที่พิสูจน์ว่า deploy บน Cloudflare ได้; large static assets ต้องออกแบบ delivery และ mobile performance มีความเสี่ยง

**หลักฐาน:** [apps/storefront/package.json:1](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/package.json:1), [packages/db/src/client.ts:13](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/packages/db/src/client.ts:13), [apps/storefront/components/3d/CarScene.tsx:393](C:/Users/thana/south_aero_project/South-aeropart/southaeropart_project/apps/storefront/components/3d/CarScene.tsx:393)

**การตรวจ:** Static config/file sizes; ไม่ deploy หรือเปลี่ยน hosting; mobile GPU/load/Cloudflare limits ยังต้องทดสอบ

**วิธีแก้และตรวจซ้ำ:** เลือก Workers adapter ที่รองรับ framework เวอร์ชันหลัง upgrade; ทำสองแอป/โดเมน/secret bindings, preview/staging ใน workerd, runtime transaction/stream/cookie/cache tests; ย้าย/บีบอัดโมเดลให้เหมาะกับ asset limits

## แยกความหมายของ dependency advisory

Next 14.x อยู่ในรายการ unsupported; สาย supported ที่หน้า official ระบุคือ 15.x Maintenance LTS และ 16.x Active LTS. การเลือก upgrade ต้องพิจารณา adapter, Clerk และ React ร่วมกัน ไม่ใช่แก้เลขเวอร์ชันแล้วถือว่าพร้อม. [Next.js support policy](https://nextjs.org/support-policy)

Next advisories สองรายการ critical ที่ scan พบ: Windows filesystem RCE มีเงื่อนไข Windows-hosted server และจึงไม่ตรงกับ Workers runtime โดยตรง; AVIF image optimizer RCE มีเงื่อนไขการใช้ libheif/sharp ต้องประเมิน optimizer ใน target จริง. ไม่ได้ execute exploit ทั้งสอง. [Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)

Drizzle advisory เกี่ยวกับ identifier/alias ที่มาจาก untrusted input ไม่ใช่การกล่าวว่า parameterized SQL ทุก query ในโปรเจคฉีด SQL ได้. ต้อง patch และคง allowlist ของ dynamic identifiers. [Drizzle maintainer advisory](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9)

Node 20 ใน CI สิ้นสุดการสนับสนุนแล้ว ณ วันที่ตรวจ; อัปเดต supported runtime และทดสอบภายใต้ runtime ที่จะ deploy จริง. [Node.js EOL](https://nodejs.org/en/about/eol)

## Cloudflare + Neon: สิ่งที่ต้องออกแบบและยืนยัน

- **ยังไม่ตรวจ:** target เป็น Workers/adapter, container หรือใช้ Cloudflare proxy หน้า Node hosting. ถ้าเลือก full-stack Workers ต้องมี adapter/build/preview ของ target; Next build อย่างเดียวไม่เพียงพอ. เอกสาร Cloudflare ปัจจุบันอธิบาย vinext สำหรับ Next 16 และมี OpenNext route ด้วย จึงต้องประเมินความเข้ากันได้ก่อนเลือก ไม่เปลี่ยน framework จากรายงานนี้โดยอัตโนมัติ. [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [OpenNext preview/config](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- **ยังไม่ตรวจ:** Neon role privileges, TLS verification, connection limits/timeouts, runtime pooling lifecycle และ isolated test project. Neon public endpoint เป็นรูปแบบ connectivity; ความเสี่ยงที่พิสูจน์ได้ในงานนี้คือ secret ใน Git ไม่ใช่การที่ endpoint เป็น public เพียงอย่างเดียว. ตรวจ driver โดยตรงกับ Neon; ถ้าใช้ Hyperdrive ต้องเลือก driver ตามเอกสาร ไม่ซ้อน serverless driver โดยอนุมาน. [Cloudflare Neon](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/)
- **ไม่ผ่านด้านโค้ด:** shared rate limits และ SSE coordination ยังเป็น memory ของแต่ละ instance; ต้องออกแบบ edge abuse controls และ state coordination ที่ทำงานเมื่อ scale
- **ยังไม่ตรวจ:** route/private cache rules, authenticated RSC caching, Host/Origin หลัง proxy, secure cookies, CSRF, custom domains/TLS และ HSTS subdomains. กำหนด admin protection เพิ่มได้ แต่ต้องคง session/RBAC ในแอป
- **ยังไม่ตรวจ:** asset/upload/CPU/memory/SSE/subrequest budgets ของแผนจริง โดยเฉพาะ GLB 78.2/54.3 MiB. มี lazy loading, adaptive quality และ dispose ใน source เป็นข้อดี แต่ยังไม่มี p95/GPU/low-memory-device evidence. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

## หลักฐานที่ยังต้องได้ก่อน GO

1. **Auth:** user A/B และ guest A/B บน order ที่มีอยู่จริง; anonymous/expired/revoked session; role downgrade; staff restrictions; bootstrap disabled; MFA reset/replay/recovery concurrency; direct Server Action POST และ CSRF ภายใต้ proxy จริง
2. **Payment/inventory:** exact totals; simultaneous distinct orders แย่งสินค้าชิ้นสุดท้าย/shared bundle parts; same/different event IDs; out-of-order success/failure/cancel/refund; provider success→DB failure; expired reservation/late payment; single restock และ durable email retry. ตรวจ DB/provider state หลังแต่ละกรณี
3. **DB:** migrate fresh database + upgrade representative snapshot; constraints/indexes/lock duration; transactions rollback; least-privilege runtime role ที่เปลี่ยน schema ไม่ได้; restore ไป environment แยกพร้อมระบุเวลาและจำนวนข้อมูลที่สูญได้
4. **Delivery:** CI results ผูก exact release commit, required checks, full secret-history/SAST/dependency scans และ verified patched tree; build และ smoke ใน Workers staging ไม่ใช่ dev server
5. **Runtime/browser:** desktop/mobile/tablet, keyboard/focus/forms, i18n refresh/currency display, Clerk/Stripe/CSP, 3D WebGL unsupported/context loss/remount, error/loading/retry UX และ guest receipt links ข้ามอุปกรณ์
6. **Performance/reliability:** กำหนด traffic/concurrency และ SLO ก่อนวัด p50/p95/p99/5xx, cold starts, DB pool pressure, bundle assets, SSE fanout, queue backlog; soak/fault injection บน staging ที่ได้รับอนุญาต ไม่ยิง load ที่ Neon/shared production
7. **Operations:** owner/runbook สำหรับ incident/secret rotation/payment reconciliation/rollback, alert delivery ที่ทดสอบแล้ว, backup/PITR/restore drill และ RPO/RTO ที่เจ้าของยอมรับ. การใช้ managed Neon/Cloudflare ไม่ใช่หลักฐานว่า controls เหล่านี้พร้อม
8. **Privacy/content:** retention/deletion/export และ log redaction; หน้า terms/privacy/consent ต้องตรงระบบจริง (พบข้อความ Omise ค้างใน PdpaTermsModal และ terms footer ชี้ /about). เป็น content/technical consistency review ไม่ใช่ legal compliance certification

## ข้อดีที่ตรวจพบ แต่ต้องรักษาไว้ระหว่างแก้

- Server-authoritative product prices และ integer satang arithmetic ใน checkout; order snapshot เก็บ numeric/string
- getOrderDetails/checkPaymentStatus ตรวจ owner หรือ HMAC guest token; auth fail-open เป็นบาง action ไม่ใช่ทุก endpoint
- fulfillOrderPayment มี conditional paid transition กัน duplicate ของออเดอร์เดียว และ mock method ปิดใน production; ต้องเพิ่ม stock/late-event correctness
- Admin session ตรวจ DB row, active user, revoke/expiry และดึง role ปัจจุบัน; cookie HttpOnly/Secure-production/SameSite มีใน source
- Vehicle API ส่ง no-store สำหรับ garage data, catalog pagination มี bounds/allowlist, admin upload helper ตรวจ magic bytes
- Schema มี FK/indexes และหลาย financial writes ใช้ transaction+audit; ข้อที่ยังแยก transaction ต้องแก้ตาม finding

## เกณฑ์ตัดสิน

คง **NO-GO** จน Critical/High ในรายงานถูกแก้และมี regression evidence, credentials ที่หลุดถูก revoke, runtime/dependency อยู่ในช่วง support, tests ที่มี side effects แยกจากข้อมูลจริง และได้หลักฐาน critical controls/restore/monitoring บน target staging. ไม่มีการยอมรับความเสี่ยงแทนเจ้าของระบบหรือรับรองว่าไม่มีช่องโหว่

สคริปต์และข้อมูลประกอบอยู่ในโฟลเดอร์ audit นี้. ผลเดิม 193/196 tests และการอ้าง ASVS L2/100% production readiness ยังยืนยันไม่ได้จากหลักฐานที่มี ต้องทำ control-by-control mapping และ runtime evidence ก่อนใช้คำรับรองดังกล่าว
