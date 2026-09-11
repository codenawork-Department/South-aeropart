---
name: south-aero-media
description: >-
  พัฒนา Cloudinary uploads, asset ownership, image delivery และ moderation ของ South Aero
  ใช้กับ product/homepage media, signed uploads, delete/overwrite และรีวิวที่มีการกลั่นกรอง
  ไม่ใช้กับการปรับแสงหรือ performance ของ 3D renderer
---

# South Aero Media and Moderation

อ่าน [CLAUDE.md](../../../CLAUDE.md) §4, §5.2, §5.5–5.6 และใช้
[secure-review](../secure-review/SKILL.md) ก่อนและหลังแก้ upload/moderation boundary

## ตามเส้นทาง asset

- [Cloudinary helpers](../../../packages/lib/src/cloudinary.ts):
  upload, moderated upload, delete, rename และ optimized URL
- [upload validator](../../../apps/admin/lib/upload-validator.ts),
  [image uploader](../../../apps/admin/components/products/image-uploader.tsx),
  [product actions](../../../apps/admin/actions/product.actions.ts),
  [bundle actions](../../../apps/admin/actions/bundle.actions.ts)
- [homepage actions](../../../apps/admin/actions/homepage.actions.ts),
  [text moderation](../../../packages/lib/src/moderation/text-moderation.ts),
  [customer review actions](../../../apps/storefront/actions/review.actions.ts),
  [admin review actions](../../../apps/admin/actions/review.actions.ts)

## Upload และ lifecycle

1. ตรวจ auth/permission/entity ownership ก่อนออก signature หรือ upload/delete/overwrite
   จำกัด formats, ขนาดจริง, file signature/MIME, resource type และ quota ตาม asset
   ไม่ถือว่า extension หรือ browser MIME คือผลตรวจไฟล์
2. ถ้าใช้ signed upload ให้ออก signature ฝั่ง server หลัง allowlist parameters,
   preset/folder/resource type และอายุ ห้ามเซ็น object ที่ client ส่งมาโดยตรง
3. ยืนยัน provider result และ asset ownership ก่อนผูก `publicId`/`secureUrl` กับ entity
   URL ที่ดูเหมือน Cloudinary ไม่พิสูจน์ว่าเป็น asset ของผู้ใช้หรือ upload ที่อนุญาต
4. เก็บเฉพาะ asset references ใน DB ไม่เก็บ binary/base64; จำกัดไม่เกิน 20 รูปต่อสินค้า
   validate จำนวนและลำดับรูปทั้ง server และ UI
5. ภาพต้อง quarantine จน moderation อนุมัติ แยก pending/rejected/provider error
   3D/ไฟล์อื่นที่ image moderation ไม่รองรับใช้ validation/quarantine ที่เหมาะสม ไม่อ้างว่า approved จาก image model
6. วางลำดับ upload→DB attach→delete old asset ให้มี recovery
   ถ้า DB fail หลัง upload ให้ cleanup เฉพาะ asset ของ operation นี้ ไม่ลบ asset ที่ entity อื่นใช้อยู่
   bulk cleanup scripts ต้องตรวจ scope ก่อนใช้
7. แสดงภาพด้วย Next Image/CldImage และ size ที่เหมาะกับจอ คง cover/order/alt
   ตรวจ failure placeholder และ image host/config ที่เกี่ยวข้องโดยไม่เปิด wildcard เกินความจำเป็น

## Review moderation

ใช้ server-side moderation ก่อนเผยแพร่ และตรวจ ownership/moderator permission ใน action
การกรองคำหยาบไม่ป้องกัน XSS; render escaped text หรือ sanitize HTML ที่รองรับตาม §5.5
คงการอธิบาย rejected/pending ให้ผู้ใช้แก้ไขได้โดยไม่เปิดเผย provider secrets

เลือก tests สำหรับ forged MIME/public ID/URL, oversized file, unauthorized delete,
pending/rejected moderation และ DB failure หลัง upload ตามงานที่แก้
ใช้ isolated assets/account ตาม [south-aero-testing](../south-aero-testing/SKILL.md)
สำหรับ render 3D ใช้ [south-aero-3d](../south-aero-3d/SKILL.md) แยกจาก asset validation

