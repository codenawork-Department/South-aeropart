---
name: south-aero-release
description: >-
  เตรียมหรือตรวจ release, dependency upgrades, CI และ deployment configuration ของ South Aero
  ใช้เมื่อแก้ build/env/security headers, migration rollout, monitoring หรือประเมินความพร้อม production
  ไม่ deploy หรือย้าย hosting จากคำขอ review/readiness เพียงอย่างเดียว
---

# South Aero Release Engineering

อ่าน [CLAUDE.md](../../../CLAUDE.md) §5–6 และ
[secure-review](../secure-review/SKILL.md) ตามขอบเขตงาน
Release readiness ต้องใช้หลักฐาน runtime/operations; รายการ skills หรือเอกสารที่ครบไม่ใช่ผลรับรองระบบ

## ระบุ release target

- ตรวจ branch/commit/diff และ deployment provider/environment ที่ repo ใช้จริง
  อย่าสมมติว่าใช้ Vercel/Sites เพียงเพราะเป็น Next.js และไม่เปลี่ยน hosting โดยไม่มีขอบเขตงานรองรับ
- อ่าน [root manifest](../../../package.json), [workspace](../../../pnpm-workspace.yaml),
  [Turbo tasks](../../../turbo.json), [lockfile](../../../pnpm-lock.yaml),
  [Storefront config](../../../apps/storefront/next.config.mjs) และ
  [Admin config](../../../apps/admin/next.config.mjs)
- อ่าน env schemas ทั้ง [Storefront](../../../apps/storefront/lib/env.ts) และ
  [Admin](../../../apps/admin/lib/env.ts) โดยไม่เปิดเผย values/secrets
- แยกงาน upgrade/config fix จาก readiness audit และจากการ deploy ที่ผู้ใช้อนุญาตจริง
  ทำ artifact/diff/checks ให้ตรวจทานได้ก่อนขั้นตอนที่เปลี่ยนระบบปลายทาง

## Dependencies และ CI

1. ตรวจ resolved versions/runtime ปัจจุบันกับ official support policies/advisories
   ใช้เอกสาร primary sources ที่ตรง versions; ข้อความ baseline ใน CLAUDE.md อาจเก่าแล้ว
2. เปลี่ยน dependency พร้อม lockfile ด้วย pnpm ที่โครงการกำหนด ไม่เพิ่ม package manager/lockfile คู่ขนาน
   framework upgrade ตรวจ peer dependencies, middleware/auth APIs, React/Three และ config ของทั้งสองแอป
3. ตรวจ CI ที่มีจริง ใช้ frozen lockfile และ checks ตาม §6.1
   lint/typecheck/build, relevant behavior tests, dependency/secret/static security scans ต้องมีผลที่ผูกกับ release commit
   scanner ที่ unavailable/skipped ต้องแสดงเป็นยังไม่ตรวจ
4. ใช้ [south-aero-testing](../south-aero-testing/SKILL.md) เลือก checks และ test isolation
   ไม่ใช้ unsafe verify scripts หรือ dummy/bypass production config เพื่อเปลี่ยนผลให้เขียว

## Runtime และ operations

- ตรวจ mock/auth bypass flags ฝั่ง server รวม direct invocation; provider mode และ env schema ต้อง fail closed
- ตรวจ production headers/cookies/origin/proxy/cache ที่ runtime จริง
  CSP ที่แก้ต้องทดสอบ Clerk/Stripe/Cloudinary/3D ร่วมด้วย ไม่แก้ด้วย wildcard/unsafe policy เพื่อกลบ failure
- ถ้ามี schema change ใช้ [south-aero-database](../south-aero-database/SKILL.md)
  ตรวจ staging, lock/backfill/compatibility, migration role และ rollback/roll-forward plan
- ขอหรืออ่านหลักฐาน backup/restore ตาม RPO/RTO ที่เจ้าของกำหนด และ monitoring สำหรับ webhook backlog,
  paid-but-unfulfilled, stock anomalies, auth abuse และ privileged changes ตาม §6.3
  ไม่อนุมานว่ามี alert/restore drill แล้วจากการใช้ managed service
- การ deploy ต้องอยู่ใน authorization และ target ที่ผู้ใช้ระบุ
  ถ้ายังไม่ชัด ให้เตรียม diff/build/recovery plan ก่อนขอข้อมูลเฉพาะที่ขาด
  หากอนุญาตไว้แล้วให้ดำเนินการในขอบเขตนั้นโดยไม่ขอซ้ำ

## รายงานและตัดสิน release

ระบุ commit/build, environment/date, checks ที่รันจริงและหลักฐานที่ยังขาด
ใช้สถานะ **ผ่าน / ไม่ผ่าน / ยังไม่ตรวจ / ไม่เกี่ยวข้อง** ตาม §6.3 พร้อมเหตุผลที่ตรวจสอบได้
บังคับ release blockers ตาม CLAUDE.md; ไม่ยอมรับความเสี่ยงแทนเจ้าของหรือสรุปพร้อม production จาก build ผ่านอย่างเดียว
สำหรับงาน config/upgrade ที่ไม่ได้ขอ deploy ให้ส่งผลแก้และข้อจำกัดตามขอบเขต ไม่ขยายไปเปลี่ยน production

