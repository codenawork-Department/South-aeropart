# Verification commands

รันจาก **application root `southaeropart_project`** เว้นแต่ระบุไว้; Git root อาจอยู่ชั้นบน
ตรวจ `package.json` กับ toolchain จริงก่อนใช้ คำสั่งด้านล่างใช้ pnpm **9.7.0** ตาม `packageManager`
หาก default launcher ไม่ตรง ใช้ pinned toolchain หรือ `corepack pnpm@9.7.0 <command>` เมื่อมี Corepack
ไม่แก้ global installation/lockfile เพื่อหลบ version mismatch

## Documentation and skills

- `git diff --check`, `git status --short` และอ่าน diff/ไฟล์ใหม่ที่ untracked
- ตรวจ YAML frontmatter: `name`/`description`, name ตรง folder และ trigger เหมาะกับงาน
  ใช้ skill-creator `quick_validate.py` ถ้ามีใน environment ไม่ hardcode path เครื่องลง repo
- Resolve relative links จากไฟล์ที่อ้าง ตรวจคำสั่งกับ manifests/source และหลักฐานกับ run จริง
  เอกสารล้วนไม่ต้องรัน build, DB หรือ provider verification

## Local code checks

```powershell
pnpm test
pnpm lint
pnpm typecheck
# หรือจำกัด package ที่เปลี่ยน:
pnpm --filter storefront test
pnpm --filter admin test
pnpm --filter @repo/lib test
pnpm --filter @repo/security-harness test
pnpm --filter storefront typecheck
pnpm --filter admin typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/lib typecheck
```

อ่าน imports/setup/fixtures ก่อนรัน; unit runner อาจมี provider/DB side effects ได้
เมื่อ shared exports/schema เปลี่ยนให้ตรวจ consumers ทั้งสองแอป
แยก missing generated Next types/dependencies จาก code errors ไม่ลบ generated files/เปลี่ยน tsconfig เพื่อซ่อน failure

## Build and browser

```powershell
pnpm --filter storefront build
pnpm --filter admin build
pnpm typecheck
pnpm test:security       # Playwright project security ไม่ใช่ corpus --all
pnpm test:e2e            # projects storefront/admin/security ตาม e2e manifest
```

Build อาจ validate env/query DB ระหว่าง rendering ตรวจ target ก่อน ใช้ production build ใน staging
ด้วย `NODE_ENV=production`, `APP_ENV=staging`, test providers และ HTTPS ตาม flow ที่ต้องพิสูจน์
ไม่ใช้ bypass หรือ production secrets เพื่อให้ build ผ่าน และ **ไม่รัน Next build พร้อม typecheck ของแอปเดียวกัน**
อ่าน Playwright config/fixtures ก่อนรัน; stateful suite มีเงื่อนไขแยกใน [isolation guide](isolation.md)

Dev commands: `pnpm dev:storefront` (3000), `pnpm dev:admin` (3001),
หรือ `pnpm --filter storefront dev:webpack` / `pnpm --filter admin dev:webpack`
ตรวจเจ้าของ port/PID ก่อนเริ่มหรือหยุด process ไม่ปิด Node ทั้งเครื่อง และไม่ใช้ `pnpm clean` เป็นขั้นตอนแรก
เมื่อแก้ action exports/hydration ตรวจ Turbopack dev กับ production build แยกกัน
Page load/paid-order redirect ไม่พิสูจน์ unpaid checkout, external OAuth หรือ provider delivery

## Offline corpus checks

```powershell
pnpm validate:corpus
pnpm test:security:corpus
pnpm generate:manifest
pnpm --filter @repo/security-harness gate
```

`generate:manifest` เขียน artifacts จาก offline adapters; `gate` ใช้ strict manifest decision
native targets ที่ยังไม่รันอาจ BLOCKED ทำให้ exit 1 ห้าม relabel เพื่อให้ผ่าน
คำสั่งเหล่านี้ไม่ได้เรียก native HTTP/browser targets ทั้งหมด ดู [harness manifest](../../../../packages/security-harness/package.json)

## Isolated integration — มี DB/provider side effects

อ่าน [isolation guide](isolation.md) และ CLAUDE.md §6.2 ก่อน; flag ด้านล่างใช้ได้เฉพาะเมื่อยืนยัน test target/authorization แล้ว

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
pnpm verify
pnpm verify:stripe
# เลือก native เมื่อต้องพิสูจน์ actual actions/routes/DB/provider observations:
pnpm --filter @repo/security-harness native --all
```

- `verify`/`verify:stripe` ใช้ [verify-security-integration.ts](../../../../apps/storefront/scripts/verify-security-integration.ts)
  random schema + journal, ปิด external email; report ระบุ `nativeHttpMeasured=false`, `emailDeliveryMeasured=false`
  อ่าน `audit/<date>/<run>.json` และยืนยัน `cleanup`/`stripeCleanup` ทั้งคู่
- Native ใช้ [native.ts](../../../../packages/security-harness/src/cli/native.ts) +
  [native-runtime.ts](../../../../packages/security-harness/src/integration/native-runtime.ts)
  default คือ Inventory+Cart; `--guest`, `--product`, `--checkout`, `--webhook`, `--api`, `--notes` เลือกกลุ่ม
  `--case=<ID>` รองรับเฉพาะ adapters ที่ implement filter อย่าอนุมานว่า filter ทุก target
  ใช้ `--all` เพียง flag เลือกกลุ่มเดียวเมื่อต้องการ full gate เพราะ CLI มี precedence ระหว่าง flags
- อ่าน output path ของ run ใน `docs/security/fuzz-matrix-2026-09-24/artifacts/native/<run>/`
  ตรวจ manifest, execution/source digests, observations และ runtime/Stripe/Clerk cleanup
  ไม่รวม diagnostic runs หรือ supplemental cases เข้าจำนวน combined corpus
- เมื่อเสร็จให้ restore/unset opt-in flag ของ session ไม่ persist ลง shared `.env`
  `verify_loop.ts`/`verify_stripe_loop.ts` retired แล้ว ไม่ใช้เป็น fallback

## Local 3D regression

หลังอ่าน imports/fixtures แล้ว:

```powershell
pnpm --filter storefront exec tsx --test components/3d/adaptiveQuality.test.ts
pnpm --filter storefront exec tsx scripts/verify-car-model.ts
```

ต้องมี asset ที่ script อ้างถึง; headless texture substitute ไม่พิสูจน์ browser texture/lighting

## CI

อ่าน [.github/workflows/ci.yml](../../../../.github/workflows/ci.yml) และตรวจว่าอยู่ใต้ `.github/workflows`
ของ **Git root ที่ใช้ deploy จริง** ไม่ใช่เพียง nested directory ใน checkout นี้
ผล required checks/scans ต้องผูก release commit; frozen lockfile/config ที่มีไม่ใช่หลักฐานว่ารันแล้ว
ใช้ [south-aero-release](../../south-aero-release/SKILL.md) สำหรับ readiness ไม่สร้าง deployment จากคำขอทดสอบอย่างเดียว
