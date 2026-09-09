---
name: secure-review
description: >
  บังคับให้ Claude คิดรอบคอบและตรวจสอบความปลอดภัยแบบเป็นระบบ ก่อนและหลังเขียน/แก้โค้ดใน
  South Aero monorepo นี้ ต้องใช้ skill นี้เสมอเมื่องานแตะ: Server Actions ("use server"),
  Route Handlers (app/api/**/route.ts), Stripe/payment/webhook code, auth หรือ session logic
  (Clerk หรือ admin self-hosted auth), RBAC/permission checks, การเขียน/แก้ Drizzle schema หรือ
  migration, transaction ที่ตัดสต็อกหรือยอดเงิน, การอัปโหลดไฟล์/รูปผ่าน Cloudinary, หรือแม้แต่
  งาน CRUD ทั่วไปที่แตะฐานข้อมูล — ใช้แม้ผู้ใช้จะไม่ได้พูดคำว่า "security", "review" หรือ "ตรวจสอบ"
  ตรงๆ เพราะพฤติกรรม default ของ agent คือรีบเขียนโค้ดให้ผ่าน happy path แล้วข้าม edge case
  และ security guard ไป ให้ใช้ skill นี้ทั้งตอนวางแผนงานและตอนจะสรุปว่า "เสร็จแล้ว"
---

# Secure & Careful Code Review — South Aero

## ทำไม skill นี้ถึงมีอยู่

`CLAUDE.md` ของโปรเจกต์นี้มี Security Checklist ที่ครบถ้วนอยู่แล้ว (ส่วนที่ 5) แต่ปัญหาจริงไม่ใช่ว่า
"ไม่มี checklist" — ปัญหาคือ agent อ่านมันครั้งเดียวตอนต้น conversation แล้วลืมไปเมื่อโฟกัสอยู่กับ
การทำ feature ให้ทำงานได้ (happy path) จนลืมกลับมาเช็คว่า guard ต่างๆ ยังอยู่ครบไหม

Skill นี้ไม่ได้มาแทน checklist เดิม แต่ทำหน้าที่เป็น **จุดหยุดคิด** สองจุด: (1) ก่อนเขียนโค้ด ให้
ประเมินความเสี่ยงและ edge case ก่อนลงมือ และ (2) ก่อนบอกว่างานเสร็จ ให้ตรวจโค้ดที่เพิ่งเขียน
กับ checklist จริงๆ ทีละบรรทัด ไม่ใช่ตอบว่า "ปลอดภัยแล้ว" แบบเดา

ระบบอย่าง e-commerce ที่มีเงินจริง (Stripe), สต็อกจริง, และ auth สอง flow (customer/admin)
ความเสียหายจากโค้ดที่ "รันผ่านแต่ไม่รอบคอบ" มักไม่โผล่ตอน dev แต่โผล่ตอน concurrent request,
retry, webhook ซ้ำ หรือ user พยายามเรียก endpoint ตรงๆ โดยข้าม UI — ซึ่งเป็นสิ่งที่ agent ที่โฟกัส
แค่ "ทำให้ feature ทำงาน" มักไม่ได้คิดถึง

---

## ขั้นตอนที่ 1 — ก่อนเขียนโค้ด: คิดถึง edge case ไม่ใช่แค่ happy path

ก่อนเริ่มเขียน ให้ตอบคำถามพวกนี้ในใจ (หรือเขียนสั้นๆ ให้ผู้ใช้เห็นถ้างานมีความเสี่ยงสูง):

- **ใครเรียกฟังก์ชันนี้ได้บ้าง** — ถ้าเป็น Server Action หรือ Route Handler นี้ถูกเรียกตรงจาก client
  ได้เสมอ ไม่ว่า UI จะซ่อนปุ่มไว้แค่ไหน ต้องเช็ค auth/role ในโค้ดฝั่ง server เท่านั้น
- **เกิดอะไรขึ้นถ้ามันถูกเรียกซ้ำ** (double click, webhook retry, refresh ระหว่างจ่ายเงิน) —
  operation นี้ idempotent หรือยัง
- **เกิดอะไรขึ้นถ้ามันถูกเรียกพร้อมกัน 2 request** (เช่น สินค้าชิ้นสุดท้ายถูกซื้อพร้อมกัน 2 คน) —
  ต้องใช้ transaction/lock ระดับไหน
- **ถ้า mutation ทำสำเร็จครึ่งเดียว** (ตัดสต็อก parts แล้วแต่ order ยังไม่ถูกสร้าง) จะเกิดอะไรขึ้น —
  ทุกอย่างต้องอยู่ใน `db.transaction()` เดียวกันหรือไม่
- **ข้อมูลอะไรจะไหลกลับไป client** — มี field ไหนที่ไม่ควรหลุดออกไป (password hash, session
  token, secret key, internal error/stack trace) ปนอยู่ใน object ที่ return ไหม

ถ้าคำตอบข้อไหนคือ "ไม่รู้" หรือ "คงไม่เป็นไร" นั่นคือสัญญาณว่าต้องหยุดแล้วออกแบบใหม่ ไม่ใช่เขียนต่อ

---

## ขั้นตอนที่ 2 — Checklist ตามหมวด (อ้างอิง CLAUDE.md §5 แบบ actionable)

ใช้เฉพาะหมวดที่เกี่ยวกับไฟล์ที่กำลังแก้ ไม่ต้องไล่ทุกข้อถ้างานไม่เกี่ยวข้อง

### Auth & Session
- Server Action ทุกตัวต้องเรียก `validateSession()` (ฝั่ง Admin) หรือ `auth()` (ฝั่ง Storefront/Clerk)
  **เป็นบรรทัดแรกของฟังก์ชัน** ก่อน logic อื่นใดทั้งสิ้น — ไม่ใช่แค่เช็คตอนต้น component ที่ render UI
- ห้ามให้ตาราง `users` (Clerk) กับ `admin_users` (self-hosted) ใช้ role column ร่วมกันหรือ query ปนกัน
- ถ้าเป็น action ที่ควรจำกัดเฉพาะ role (`staff`/`admin`/`super_admin`) ต้องเช็ค role หลัง validate
  session แล้ว ไม่ใช่แค่ซ่อนปุ่มใน UI
- ทุก mutating Server Action ฝั่ง Admin ต้องเรียก `logAuditEvent()` หลัง mutation สำเร็จ

### RSC Data Leakage
- ก่อน return object จาก Server Action หรือ Server Component ไปยัง Client ให้ไล่ดู field ทุกตัว
  ว่ามี secret/hash/token หลุดไปไหม — การ `select *` จาก Drizzle แล้ว pass ทั้ง object ตรงๆ คือจุดที่
  พลาดบ่อยที่สุด

### Stripe & Financial
- ยอดเงินใน DB ต้องเป็น `numeric` และ TypeScript type เป็น `string` เสมอ
- แปลงยอดเงินเข้า Stripe ด้วย `toSmallestCurrencyUnit()` เท่านั้น **ห้าม** `parseFloat(x) * 100`
  (floating point จะเพี้ยนกับบางจำนวน)
- Webhook handler ต้อง verify signature ด้วย `constructStripeWebhookEvent(rawBody, signature, secret)`
  โดยใช้ **raw body ก่อน parse JSON** และต้องอยู่ใน Route Handler เท่านั้น (Server Action เรียก
  webhook ไม่ได้อยู่แล้ว แต่ระวังอย่าไปแตะ body ก่อน verify)
- ก่อน fulfill order ให้เช็ค `orders.paymentStatus` หรือ Stripe event ID ซ้ำก่อนเสมอ — กัน
  double fulfillment / ตัดสต็อกซ้ำตอน webhook ยิงซ้ำ (Stripe ยิงซ้ำได้จริงในโปรดักชัน)
- `payment_intent.succeeded` ต้องตัดสต็อกและ update order ใน `db.transaction()` เดียวกัน
- `payment_intent.payment_failed` ต้อง log error message และ update order status ให้ตรงสถานะจริง

### Database & Transaction Atomicity
- multi-table write ใดๆ (order + order items + bundle parts + status history) ต้องอยู่ใน
  `db.transaction()` — ถ้าเขียนแยกหลาย query โดยไม่ห่อ transaction คือบั๊กที่ทำให้ข้อมูลไม่ตรงกันได้
- การตัดสต็อกของ Bundle ต้องตรวจ**และตัด**สต็อกของอะไหล่ย่อย**ทุกชิ้น**แบบ atomic ไม่ใช่แค่ตัด SKU
  ของ bundle เอง — ถ้าอะไหล่ย่อยตัวใดตัวหนึ่งสต็อกไม่พอ ทั้ง transaction ต้อง rollback
- raw SQL ใช้ได้เฉพาะ tagged template (`` sqlClient`SELECT ...` ``) ห้าม string concatenation
  เด็ดขาด (SQL injection)

### Validation & Types
- Input ของทุก Server Action / Route Handler ต้อง validate ด้วย **Zod ก่อนแตะ DB** ไม่ใช่ validate
  แค่ฝั่ง client form
- ห้ามใช้ `any` — ถ้า type ยังไม่ชัด ใช้ inferred type จาก Drizzle (`$inferSelect`/`$inferInsert`)
  แทนการ cast ทิ้งๆ ขว้างๆ

### Secrets & Error Handling
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` และ secret อื่นๆ ต้องไม่มี prefix `NEXT_PUBLIC_`
  และต้องถูกอ่านเฉพาะฝั่ง server
- Server Action ต้อง catch error แล้ว return ข้อความทั่วไปให้ client เท่านั้น — ห้ามส่ง stack trace
  หรือ SQL error message ดิบๆ กลับไป (ข้อมูลนี้ช่วย attacker มากกว่าช่วย user)
- Media ทุกชนิดต้องผ่าน Cloudinary + AI moderation เท่านั้น ห้ามเก็บ binary/base64 ใน Postgres
- ข้อความรีวิวต้องผ่าน `thai-bad-words` + custom regex ฝั่ง server ก่อน persist เสมอ (ห้ามเชื่อ
  การกรองฝั่ง client)

---

## ขั้นตอนที่ 3 — ก่อนบอกว่า "เสร็จแล้ว": Self-review ที่ตรวจได้จริง

ห้ามติ๊กถูก checklist ลอยๆ โดยไม่ได้เช็คจริง — **ทุกข้อที่บอกว่าผ่าน ต้องระบุตำแหน่งในโค้ด**
(ไฟล์ + ชื่อฟังก์ชัน/บรรทัดโดยประมาณ) ว่าเงื่อนไขนั้นถูก enforce ตรงไหน ถ้าชี้ตำแหน่งไม่ได้ แปลว่า
ยังไม่เสร็จจริง — กลับไปเขียนเพิ่ม ไม่ใช่เขียนรายงานกลบเกลื่อน

รูปแบบสรุปท้ายงาน (เฉพาะงานที่แตะ auth/payment/DB mutation) ให้แสดงแบบนี้ให้ผู้ใช้เห็น:

```
### Security self-review
- [x] validateSession() อยู่บรรทัดแรกของ createOrderAction() (app/actions/order.ts)
- [x] multi-table write (order + items + stock) ห่อด้วย db.transaction() แล้ว
- [x] Zod schema `createOrderSchema` validate input ก่อนแตะ DB
- [ ] N/A — ไม่ได้แตะ Stripe ใน task นี้
- [x] error ที่ throw กลับ client เป็นข้อความทั่วไป ไม่มี stack trace
```

จากนั้นถ้าโปรเจกต์มี verify script ที่เกี่ยวข้อง ให้รันจริงก่อนสรุปว่าเสร็จ:
- แตะ order/stock flow → รัน `pnpm verify`
- แตะ Stripe/payment/webhook → รัน `pnpm verify:stripe`
- แตะโค้ดทั่วไป → อย่างน้อยรัน `pnpm lint`

ถ้ารันไม่ได้ (เช่นไม่มี DB connection ใน sandbox) ให้บอกผู้ใช้ตรงๆ ว่ายังไม่ได้รัน แทนที่จะสมมติว่าผ่าน

---

## จุดพลาดที่เจอบ่อยในสไตล์งานแบบนี้

| อาการที่เขียนไป (ดูเผินๆ ทำงานได้) | ความเสี่ยงจริง | ต้องแก้เป็น |
|---|---|---|
| เช็ค role/auth เฉพาะฝั่ง UI (ซ่อนปุ่ม) | ใครก็ยิง Server Action ตรงๆ ได้ | เช็คใน server action เอง เป็นบรรทัดแรก |
| แยก query ตัดสต็อก + สร้าง order เป็นคนละ statement | สต็อกตัดไปแล้วแต่ order ไม่ถูกสร้าง (หรือกลับกัน) | ห่อด้วย `db.transaction()` เดียว |
| `parseFloat(price) * 100` ส่งเข้า Stripe | floating point คลาดเคลื่อน ยอดเงินผิด | ใช้ `toSmallestCurrencyUnit()` |
| webhook handler parse JSON ก่อน verify signature | ปลอมแปลง webhook event ได้ | verify ด้วย raw body ก่อนเสมอ |
| ไม่เช็คว่า order ถูก fulfill ไปแล้วหรือยังก่อนตัดสต็อกใน webhook | Stripe ยิง event ซ้ำ → ตัดสต็อกซ้ำ | เช็ค `paymentStatus`/event ID ก่อน fulfill |
| return object จาก DB ตรงๆ ให้ client (`select *`) | หลุด field อ่อนไหวโดยไม่ตั้งใจ | เลือกเฉพาะ field ที่ต้องใช้จริง |
| catch error แล้ว `throw error` เดิมกลับไป | client เห็น stack trace / SQL error | catch แล้ว return ข้อความทั่วไป log รายละเอียดฝั่ง server เท่านั้น |
| `any` เพื่อความเร็วตอนแก้ type error | เสีย type safety ตรงจุดที่มักเป็น auth/payment | ใช้ inferred type จาก Drizzle หรือ Zod schema |

---

## ขอบเขตของ skill นี้

Skill นี้เน้น **backend correctness/security** ของ South Aero monorepo โดยเฉพาะ ไม่ใช่ general
code style skill — ถ้างานเป็นแค่ CSS, copywriting, หรือ pure UI ที่ไม่แตะ data/auth ก็ไม่จำเป็นต้อง
ไล่ checklist ทั้งหมด แต่ข้อ "คิดถึง edge case ก่อนเขียน" (ขั้นตอนที่ 1) ควรใช้เป็นนิสัยกับงานทุกชิ้น
ไม่ใช่แค่งานที่เข้าเงื่อนไข trigger ด้านบน