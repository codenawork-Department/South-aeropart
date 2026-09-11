---
name: south-aero-i18n
description: >-
  เพิ่มหรือแก้ภาษาไทย/อังกฤษและการแสดงสกุลเงินใน South Aero Storefront
  ใช้กับ dictionaries, localized product fields, locale persistence, hydration และ price formatting
  ไม่ใช้การเปลี่ยนภาษาหรือ display currency เป็นเหตุเปลี่ยน payment currency
---

# South Aero Localization

อ่าน [CLAUDE.md](../../../CLAUDE.md) §1 และ §4 พร้อม [i18n config](../../../apps/storefront/i18n/config.ts)
คงสถาปัตยกรรม cookie locale ที่มีอยู่ ไม่เปลี่ยนเป็น locale-prefixed routes หรือเพิ่ม i18n library โดยไม่มีขอบเขตงานรองรับ

## จุดเริ่มแก้ไข

- [th dictionary](../../../apps/storefront/i18n/dictionaries/th.ts) เป็นแหล่ง type `Dictionary`;
  [en dictionary](../../../apps/storefront/i18n/dictionaries/en.ts) ใช้ type เดียวกัน
- [LanguageProvider](../../../apps/storefront/components/providers/LanguageProvider.tsx),
  [LanguageSwitcher](../../../apps/storefront/components/layout/LanguageSwitcher.tsx)
  และ [root layout](../../../apps/storefront/app/layout.tsx) เชื่อม server/client locale
- [i18n helpers](../../../apps/storefront/lib/i18n-helpers.ts) สำหรับ fields ไทย/อังกฤษของสินค้าและ order item
  และ [profile i18n](../../../apps/storefront/components/profile/profile-i18n.ts) สำหรับ UI profile ที่แยกอยู่
- [currency helper](../../../apps/storefront/lib/currency.ts) และ
  [CurrencyProvider](../../../apps/storefront/components/providers/CurrencyProvider.tsx) ใช้กับราคาที่แสดง

## รักษาความสอดคล้อง

1. เพิ่ม dictionary keys ทั้งสองภาษา โดยใช้ `Dictionary` ตรวจ parity และอ่าน callers
   อย่าฮาร์ดโค้ดข้อความ Storefront เฉพาะภาษาเดียว รวม validation/error/empty/aria labels
2. ใช้ `sanitizeLanguage`, `SUPPORTED_LANGUAGES` และ `LANGUAGE_COOKIE_NAME` จาก config
   ไม่ตั้ง default ใหม่เองเพราะหน้าหรือสินค้าบางส่วนเป็นภาษาไทย
3. Trace cookie → server initial locale → hydration → localStorage → profile preference
   ต้องมี fallback เมื่อ storage ไม่มี/ถูกปิดหรือ cookie ไม่ถูกต้อง และไม่เขียนค่า default ทับ preference โดยไม่ตั้งใจ
4. แปล product fields ผ่าน helpers เดิม ให้ fallback เมื่อ English field ว่าง
   รักษา snapshot/variant suffix ของ order และอย่าดึงข้อมูลสินค้าปัจจุบันไปเขียนทับประวัติการซื้อ
5. แยก locale กับ currency; ใช้ formatter เดิมสำหรับ display และรักษา money เป็น decimal string
   conversion สำหรับแสดงผลไม่ใช่ authoritative order/Stripe amount
6. ถ้าเพิ่ม currency ที่เก็บเงินจริง ใช้ [south-aero-payments](../south-aero-payments/SKILL.md)
   ตรวจหน่วยย่อยและ rounding ตามสกุลนั้น ไม่ถือว่าทุกสกุลมีทศนิยมสองหลัก

ตรวจสลับภาษา → refresh → navigation, invalid/missing cookie, storage ใช้งานไม่ได้,
ข้อความยาว และ fields ที่คำแปลว่าง รัน Storefront typecheck เพื่อตรวจ dictionary contract
ถ้าแก้ profile persistence ใช้ [secure-review](../secure-review/SKILL.md) กับ ownership ของ action นั้น

