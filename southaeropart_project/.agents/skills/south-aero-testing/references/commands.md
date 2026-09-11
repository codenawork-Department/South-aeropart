# Verification commands

รันจาก repository root เว้นแต่ระบุไว้ ตรวจ manifest ปัจจุบันก่อนใช้ เพราะ scripts อาจเปลี่ยน
เลือกคำสั่งเฉพาะ package/flow ที่ได้รับผล

## Documentation and skills

- `git diff --check` และอ่าน diff/references
- สำหรับ untracked skills ใช้ `git status --short` และอ่านไฟล์ใหม่ด้วย
  `git diff` อย่างเดียวไม่แสดงเนื้อหา untracked files
- Validate YAML frontmatter: ต้องมี `name`/`description`, name ตรง folder, lowercase/hyphens,
  description มี trigger ที่ชัด และ relative links resolve จากไฟล์นั้น
- ถ้ามี skill-creator validator ใน environment ให้ใช้ `quick_validate.py`
  ไม่ hardcode path ของเครื่องหนึ่งลง repository และไม่ถือว่าไม่มี validator แปลว่า YAML ผ่าน

## Lint and typecheck

```powershell
pnpm --filter storefront lint
pnpm --filter storefront exec tsc --noEmit
pnpm --filter admin lint
pnpm --filter admin exec tsc --noEmit
```

Shared package ที่แก้ตรวจเพิ่มตามจริง:

```powershell
pnpm --filter @repo/db exec tsc --noEmit
pnpm --filter @repo/lib exec tsc --noEmit
pnpm --filter @repo/ui exec tsc --noEmit
```

เมื่อ shared exports/schema เปลี่ยนให้ตรวจ consumers ทั้ง Storefront และ Admin
แยก missing generated Next types/dependencies จาก type error ใน code;
อย่าลบ generated files หรือเปลี่ยน tsconfig เพื่อซ่อน failure

## Build and browser

```powershell
pnpm --filter storefront build
pnpm --filter admin build
```

Build อาจ validate env หรือ query data ระหว่าง rendering; อ่าน initialization และยืนยัน environment ก่อน
ไม่ใส่ production credentials หรือเปิด mock/auth bypass เพื่อทำ build ผ่าน
หาก build ต้องใช้ config ที่ยังไม่มี ให้รายงาน missing variable names โดยไม่แสดง values

Dev commands ที่มี: `pnpm dev:storefront` (3000), `pnpm dev:admin` (3001),
หรือ `pnpm --filter storefront dev:webpack` / `pnpm --filter admin dev:webpack`
ตรวจ server ที่รันอยู่ก่อนเริ่มซ้ำ; ใน Windows ให้ระบุ PID เจ้าของ port ก่อนหยุด process
อย่าปิด Node ทั้งเครื่องเพื่อแก้ port ของแอปเดียว และอย่าใช้ `pnpm clean` เป็นขั้นตอนแรกโดยไม่มีหลักฐาน cache เสีย

## Local 3D regression

หลังอ่าน imports/fixtures แล้ว:

```powershell
pnpm --filter storefront exec tsx --test components/3d/adaptiveQuality.test.ts
pnpm --filter storefront exec tsx scripts/verify-car-model.ts
```

Model check ต้องมี asset ที่ script อ้างถึง; ผ่าน headless test ไม่พิสูจน์การ decode texture หรือ visual output ใน browser

## Order and Stripe integration — conditional

`pnpm verify` และ `pnpm verify:stripe` เป็น scripts ที่อาจเขียน DB/เปลี่ยน stock/เรียก Stripe/ส่ง email
อ่าน [isolation guide](isolation.md) และ [CLAUDE.md](../../../../CLAUDE.md) §6.2 ก่อน
ห้ามรันจากรายการคำสั่งนี้อย่างเดียว

## CI

ตรวจ pipeline ที่ repository ใช้จริงก่อนอ้างว่ามี CI/required checks
สำหรับ release ใช้ frozen lockfile กับ CI checks และ security evidence ตาม
[south-aero-release](../../south-aero-release/SKILL.md)
ไม่สร้าง deployment workflow หรือเผยแพร่ build จากคำขอทดสอบเพียงอย่างเดียว

