---
name: south-aero-database
description: >-
  ออกแบบหรือแก้ Drizzle schema, queries, transactions, indexes และ migrations ของ South Aero บน Neon Postgres
  ใช้กับ DB CRUD, data backfill และปัญหา query performance ไม่ใช้กับการแก้ UI ที่ไม่เปลี่ยน data access
---

# South Aero Database

อ่าน [CLAUDE.md](../../../CLAUDE.md) §4, §5.4, §6.2–6.3 และใช้
[secure-review](../secure-review/SKILL.md) ก่อนและหลังแก้ส่วนที่เกี่ยวข้อง

## เข้าใจ connection และ schema

- [client.ts](../../../packages/db/src/client.ts) มีทั้ง factory `createDbClient(databaseUrl)` และ module-level clients
  ใช้ explicit connection สำหรับงาน isolated; ตรวจ imports ไม่ให้ fallback ไป global `db`
- [schema index](../../../packages/db/src/schema/index.ts) และ [package exports](../../../packages/db/src/index.ts)
  เป็นจุดส่งออก schema/types; ใช้ Drizzle inferred types ไม่สำเนา row types ด้วย `any`
- [Drizzle config](../../../packages/db/drizzle.config.ts) โหลด root/app environment
  ก่อนใช้ CLI ต้องทราบ effective target โดยไม่พิมพ์ connection string/secrets
- [migrations](../../../packages/db/drizzle) และ [journal](../../../packages/db/drizzle/meta/_journal.json)
  ต้องสอดคล้องกัน ตรวจ SQL, snapshots และ journal จริง ไม่ถือว่าไฟล์ SQL ที่มีในโฟลเดอร์ถูก apply แล้ว

## Queries และ data integrity

1. Scope protected queries ด้วย identity/ownership ที่ได้จาก server; select DTO fields ตามความจำเป็น
   parameterize values และ allowlist identifiers สำหรับ sorting/filtering
2. เก็บเงินเป็น Postgres `numeric` และ TypeScript decimal string ตาม §4
   ตรวจ null/default/enum/FK/unique/check constraints ให้คุม invariant ที่ต้องการจริง
3. ใช้ transaction กับ multi-table writes และ stock mutations ส่ง `tx` ตลอด call chain
   ห้าม helper ใช้ global `db` เมื่อ caller คาดว่าจะ rollback ทั้งชุด
4. ตรวจ driver transaction support จาก adapter ที่ใช้จริง; atomicity ไม่แทน locking/isolation
   concurrent writes ต้องมี conditional update/affected-row checks หรือ row locks ตาม flow
5. จัดการ external provider/email หลัง commit ด้วย recovery ที่เหมาะสม ไม่ถือว่า transaction ครอบ network side effect
6. สำหรับ performance ตรวจ join cardinality, count/query filters และ N+1
   เพิ่ม index ตาม query ที่มีหลักฐาน ไม่สร้าง index ทุกคอลัมน์
   `EXPLAIN ANALYZE` รัน query จริง จึงห้ามใช้กับ mutation/live workload โดยคิดว่าเป็น read-only

## เปลี่ยน schema และ migration

- อ่าน generated SQL ก่อนและหลัง `pnpm db:generate`; ตรวจ rename เทียบ drop/recreate,
  precision changes, nullable→required และ existing rows ที่ผิด constraint
- ถ้ามี backfill ให้เตรียม batch/restart semantics และแผน expand→backfill→contract ตามความจำเป็น
  ระบุ locking, compatibility ระหว่างแอปเก่า/ใหม่ และ recovery เมื่อสำเร็จบางส่วน
- ไม่แก้ historical migration ที่ถูก apply แล้วโดยไม่ตรวจประวัติ;
  ไม่ใช้ `sync-*.cjs` หรือ seed scripts แทน reviewed migration เพียงเพราะรันง่าย
- การ generate/review SQL เป็นงานเตรียมไฟล์; การ apply ต้องตรง environment และ authorization ที่มี
  `db:push` ใช้กับ development ที่ยืนยันแล้วเท่านั้น และไม่ใช้แทน production migrations
- ก่อน production apply ต้องมีหลักฐาน staging, backup/restore และ rollout/recovery ตาม §6.3
  ไม่อนุมานว่าการเพิ่มไฟล์ migration คือคำสั่งแก้ production DB

ตรวจ constraints/rollback/concurrency เฉพาะที่เปลี่ยนใน DB แยกตาม
[south-aero-testing](../south-aero-testing/SKILL.md) และ typecheck ทั้งสองแอปเมื่อ shared schema เปลี่ยน
รายงานชัดเจนว่า generate แล้ว, apply ที่ใดแล้ว หรือยังไม่ได้ apply

