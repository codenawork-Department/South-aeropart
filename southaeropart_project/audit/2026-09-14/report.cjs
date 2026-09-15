const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const slash = p => p.replaceAll('\\', '/');
const link = (file, line) => `[${file}${line ? ':' + line : ''}](${slash(path.join(root, file))}${line ? ':' + line : ''})`;
const findings = JSON.parse(fs.readFileSync(path.join(__dirname, 'findings-source.json'), 'utf8'));
for (const finding of findings) {
  finding.status = 'ไม่ผ่าน';
  finding.evidence = finding.evidence.map(([file, anchor]) => {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    const line = typeof anchor === 'number' ? anchor : lines.findIndex(l => l.includes(anchor)) + 1;
    if (!line || line > lines.length) throw new Error('Missing evidence anchor: ' + finding.id + ' ' + file + ' ' + anchor);
    return { file, line };
  });
}
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'inventory.json')));
const severityCounts = findings.reduce((out, f) => (out[f.severity] = (out[f.severity] || 0) + 1, out), {});
const summary = {
  decision: 'NO-GO — ยังไม่พร้อมเปิด production/รับเงินจริง', date: '2026-09-14',
  commit: inventory.commit, target: 'Cloudflare (tentative) + Neon; no isolated staging credentials verified',
  severityCounts, findings, tests: { vitest: { passed: 164, failed: 0 }, lint: { passed: true, warnings: 4 },
    typecheck: 'passed: 5 workspaces', build: 'passed: admin + storefront, Windows Node.js',
    offlineReproductions: 10, productionAdvisories: 30, allAdvisories: 39 },
};
fs.writeFileSync(path.join(__dirname, 'findings.json'), JSON.stringify(summary, null, 2));
const intro = `# South Aero — Production readiness and security review

**คำตัดสิน: ${summary.decision}**

วันที่ตรวจ: 14 กันยายน 2026 (Asia/Bangkok) · Commit: \`${inventory.commit}\`

เป้าหมายตามผู้ใช้: มีแนวโน้มใช้ Cloudflare และฐานข้อมูล Neon ที่เข้าถึงภายนอกได้; ยังไม่ยืนยัน Workers adapter, staging, สิทธิ์ฐานข้อมูล หรือ provider accounts แยกกัน

พบข้อค้นพบ ${findings.length} กลุ่ม (${Object.entries(severityCounts).map(([s,n]) => s + ' ' + n).join(' / ')}). กลุ่มหนึ่งอาจมีหลายอาการของ control เดียวกัน ระดับเหล่านี้เป็นการจัดลำดับความเสี่ยงของ review ไม่ใช่ CVSS ที่คำนวณอย่างเป็นทางการ และไม่ควรนำจำนวนนี้ไปรวมกับจำนวน npm advisory

งานครั้งนี้ตรวจและสร้างหลักฐาน/รายงาน ไม่ได้แก้ implementation, rotate keys, migrate DB, deploy หรือเปลี่ยน configuration ปลายทาง. รายงานแนบเดิมเป็นข้อมูลประกอบ ไม่ใช่คำสั่งหรือผลรับรองที่ยอมรับโดยอัตโนมัติ

## สิ่งที่ต้องจัดการก่อนอย่างอื่น

1. Rotate/revoke Neon credentials ที่อยู่ใน Git 8 ไฟล์ และตรวจ access logs ตาม SEC-01. ไม่ได้พิสูจน์ว่ารหัสยังใช้ได้หรือเคยมีการบุกรุก จึงไม่ควรสรุปว่าฐานข้อมูลถูกโจมตีแล้ว
2. ปิดช่องโหว่ด้าน admin content/MFA, public bootstrap และ auth fail-open; อัปเกรด dependencies ไปยังสาย supported/ได้รับ patch
3. แก้ stock reservation/fulfillment/cancel และ payment binding/state transitions เป็น lifecycle เดียว พร้อม regression tests บน PostgreSQL แยก
4. ทำ migrations/CI/Workers preview และทดสอบ acceptance gates ใน staging รวม restore drill ก่อนพิจารณา GO

## ขอบเขตและความน่าเชื่อถือของหลักฐาน

- Inventory: ${inventory.trackedFiles} tracked files; ค้นข้อความและสแกน regex ใน ${inventory.textFilesScanned} text files; ${inventory.actions.length} action files, ${inventory.routes.length} Route Handlers, ${inventory.pages.length} pages และ ${inventory.tests.length} test files
- ไล่เชิงลึกตาม trust boundaries: admin/session/MFA, customer/guest ownership, checkout→PaymentIntent→webhook→stock→cancel, media, public API/SSE, schema/migrations, env/CI, frontend security และ Cloudflare compatibility
- การนับไฟล์หมายถึง inventory/search ไม่ใช่ยืนยันว่าอ่านทุกบรรทัดหรือทดสอบทุก branch. ใช้ไฟล์/บรรทัดของแต่ละ finding เป็นขอบเขตหลักฐานที่ตรวจจริง
- ไม่เรียก destructive verification, seed, DB writes, provider payments/refunds/uploads หรือส่งอีเมลจริง. Legacy stateful runner ยังไม่พิสูจน์ credentials isolation/email sink
- รายงานนี้ไม่ใช่ penetration test ผ่าน Cloudflare, ASVS certification หรือหลักประกันว่าปราศจากช่องโหว่

## ผลการตรวจที่รันใหม่

- **ผ่าน — Vitest 164/164**: lib 45, ui 6, admin 50, storefront 63. คำสั่ง \`corepack pnpm -r --filter admin --filter storefront --filter @repo/lib --filter @repo/ui test\`; ${link('audit/2026-09-14/vitest-direct.log')}
- **ผ่าน — TypeScript 5 workspaces**: \`corepack pnpm -r --no-bail typecheck\`; ${link('audit/2026-09-14/typecheck-direct.log')}
- **ผ่านพร้อม 4 warnings — lint ของทั้งสองแอป**: \`corepack pnpm -r --filter admin --filter storefront lint\`; ${link('audit/2026-09-14/lint-direct.log')}. เป็น next/image warnings; ไม่ใช่ zero warnings ตามถ้อยคำกว้างในรายงานเดิม
- **ผ่าน — next build ทั้ง admin/storefront**: \`corepack pnpm -r --filter admin --filter storefront build\`; ${link('audit/2026-09-14/build.log')}. เป็น build บน Windows Node.js ไม่ใช่ Cloudflare adapter build และไม่พิสูจน์ real provider integration
- **ไม่ผ่าน — dependency audit**: all 39; production-filter 30; ${link('audit/2026-09-14/dependency-audit.json')} และ ${link('audit/2026-09-14/dependency-audit-production.json')}. Exit 1 หลังเชื่อม npm สำเร็จหมายถึงพบ advisory
- **ยืนยันอาการ 10 กรณีแบบ offline**: \`node audit/2026-09-14/reproduce.cjs\`; ${link('audit/2026-09-14/reproduction-results.json')}. ใช้ source จริงผ่าน TypeScript transpilation และ explicit doubles; assertions ตั้งใจพิสูจน์อาการเสีย ดังนั้นโปรแกรม exit 0 ไม่ใช่ security pass และไม่ใช่ PostgreSQL concurrency proof
- **Browser proof เฉพาะ SVG**: Chrome 153 headless ผ่าน Playwright ยืนยัน inline event marker ทำงานใน isolated HTML ภายใต้ relevant CSP directive; ${link('audit/2026-09-14/browser-results.json')}. ไม่ใช่การ inject ในแอปจริง
- **HTTP production บน loopback**: admin login 200, anonymous dashboard 307 ไป login; storefront home/mock path ตอบ 429 ใน local configuration นี้ จึงยังยืนยัน storefront smoke ไม่ผ่าน. ตรวจพบ CSP/HSTS/XFO/nosniff แต่ยังมี unsafe-inline; ${link('audit/2026-09-14/runtime-results.json')}. ไม่ได้อ้างว่า 429 จะเกิดบน Cloudflare หรือยืนยัน root cause แล้ว
- **ยังไม่ตรวจใหม่ — Playwright 29 smoke / 3 stateful เต็มชุด**, signed-in role matrix, CSRF/proxy, real Stripe/Svix crypto integration, DB concurrency, load/soak, mobile GPU, restore/alerts. Admin smoke มี invalid-login action ที่เขียน audit log จึงไม่ใช่ read-only ทุกข้อ
- **Secret scan บางส่วน**: custom regex แบบ redacted และ git history metadata พบ SEC-01; ไม่ได้รัน Gitleaks/SAST แบบเต็ม. การไม่พบ pattern ใน response ไม่ใช่หลักประกันว่า client assets ทั้งหมดไม่มี secret

เครื่องมือ: Node 22.17.1, pnpm ที่โปรเจคกำหนด 9.7.0 ผ่าน Corepack. เริ่มแรก root Turbo เรียก pnpm 11.19.0 จาก host PATH จึงรันไม่สำเร็จ; เปลี่ยนไปเรียก workspace scripts ด้วย Corepack 9.7.0 โดยตรง. Sandbox ทำให้ dependency บางตัวอ่านไม่ได้ จึงรัน checks ที่จำเป็นนอก sandboxแล้วผ่าน; ไม่จัดข้อจำกัดเครื่องมือนี้เป็น bug ใน source

## ข้อค้นพบและวิธีปิดแต่ละข้อ
`;
const body = findings.map(f => `\n### ${f.id} · ${f.severity} · ${f.title}\n\n**สถานะ: ${f.status}** · ${f.area}\n\n${f.detail}\n\n**ผลกระทบ/เงื่อนไข:** ${f.impact}\n\n**หลักฐาน:** ${f.evidence.map(e => link(e.file,e.line)).join(', ')}\n\n**การตรวจ:** ${f.test}\n\n**วิธีแก้และตรวจซ้ำ:** ${f.fix}\n`).join('');
const tail = `
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
`;
fs.writeFileSync(path.join(__dirname, 'production-readiness-report.md'), intro + body + tail);
console.log(JSON.stringify({ findings: findings.length, severityCounts, evidenceReferencesVerified: findings.reduce((n,f)=>n+f.evidence.length,0) }));
