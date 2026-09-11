---
name: south-aero-3d
description: >-
  พัฒนาและแก้ Storefront 3D car viewer ของ South Aero ด้วย Three.js, React Three Fiber และ Drei
  ใช้กับ GLB/glTF, materials, camera, lighting, shadows, reflections, adaptive quality และ WebGL performance
  ไม่ใช้กับการสร้างภาพ raster หรือการแก้ upload permission
---

# South Aero 3D Viewer

อ่าน [CLAUDE.md](../../../CLAUDE.md) §1–2 และข้อกำหนด UI ที่เกี่ยวข้อง
ตรวจ versions/exports จาก manifest และ installed packages ก่อนนำตัวอย่าง Three/R3F ใหม่มาใช้

## จุดแก้ตามหน้าที่

- [CarModelViewer](../../../apps/storefront/components/3d/CarModelViewer.tsx): UI และขอบเขตโหลด viewer
- [CarScene](../../../apps/storefront/components/3d/CarScene.tsx): Canvas, camera และ scene composition
- [prepareCarModel](../../../apps/storefront/components/3d/prepareCarModel.ts): clone, material mapping และ resource ownership
- [StudioLighting](../../../apps/storefront/components/3d/StudioLighting.tsx),
  [ManagedFloorReflection](../../../apps/storefront/components/3d/ManagedFloorReflection.tsx),
  [BakedContactShadow](../../../apps/storefront/components/3d/BakedContactShadow.tsx): แสง/เงา/พื้น
- [adaptiveQuality](../../../apps/storefront/components/3d/adaptiveQuality.ts),
  [AdaptiveQualityMonitor](../../../apps/storefront/components/3d/AdaptiveQualityMonitor.tsx),
  [renderingPreferences](../../../apps/storefront/components/3d/renderingPreferences.ts): quality control
- [model assets](../../../apps/storefront/public/models) และ
  [environment assets](../../../apps/storefront/public/environments): ไฟล์ที่ viewer โหลดจริง

## รักษาโมเดลและ resources

1. แยก browser/WebGL APIs ไว้ฝั่ง client พร้อม loading/error fallback ที่คงพื้นที่ layout
   หน้าเนื้อหาสินค้าต้องใช้งานได้เมื่อ WebGL/asset load ล้มเหลว
2. ตรวจ graph/material/texture ของ asset ก่อนแก้ตามชื่อ mesh
   preserve skeleton, animation, transforms, UVs และ texture channels ที่จำเป็น
3. `useGLTF` cache อาจใช้ร่วมกันหลาย instance; clone สิ่งที่จะแก้ และ dispose เฉพาะ resources ที่ instance เป็นเจ้าของ
   ไม่ dispose geometry/texture ของ cache เมื่อ unmount viewer หนึ่งตัว
4. ใช้ mapping จาก `prepareCarModel` แทนการเปิด transparency ทุก RGBA texture
   alpha บาง atlas เป็นข้อมูล shading ไม่ใช่ cutout; ถ้าเปลี่ยน model ต้องตรวจ mapping ใหม่
5. Cleanup timers/listeners/render targets และทดสอบ mount→unmount→remount
   ไม่เพิ่ม React state update ทุก frame ถ้าใช้ refs/renderer state ได้

## Performance และคุณภาพภาพ

- เก็บหลักฐานก่อนปรับ: device/viewport/DPR, scene/asset, warm-up,
  frame time/FPS, draw calls และ memory เมื่อเครื่องมือรองรับ
- ลดต้นทุนตรงสาเหตุ เช่น DPR, shadow resolution, reflection update rate หรือ postprocessing
  ตรวจภาพหลังเปลี่ยนแต่ละชุด ไม่ลดคุณภาพทุกจุดโดยไม่มีข้อมูล
- คง manual quality preference เมื่อมี; adaptive mode ต้องไม่แกว่งไปมาและไม่ใช้ loading spike เป็น steady-state FPS
  ตรวจ recovery เมื่อกลับจาก background tab และหยุดงานที่ไม่จำเป็นเมื่อ viewer มองไม่เห็น
- ตรวจ camera framing, orbit/touch controls, clipping, glass/cutout/shadow และ reduced motion
  ประเมิน mobile จริงหรือ device ที่ระบุ ไม่อ้าง performance จากเครื่องเดียวครอบคลุมทุกเครื่อง

## ตรวจ regression

หลังอ่าน test imports/side effects แล้ว ใช้คำสั่ง local ที่มี:
- `pnpm --filter storefront exec tsx --test components/3d/adaptiveQuality.test.ts` สำหรับ quality behavior
- `pnpm --filter storefront exec tsx scripts/verify-car-model.ts` สำหรับ model preparation เมื่อ fixture model ยังมี

Model script ใช้ headless texture substitute จึงไม่พิสูจน์ browser texture/lighting
เปิด viewer ตรวจภาพจริงก่อนอ้าง visual correctness และรัน lint/typecheck ตาม
[south-aero-testing](../south-aero-testing/SKILL.md)
ถ้าแตะ upload/provider URL policy ใช้ [south-aero-media](../south-aero-media/SKILL.md) และ security scope ที่เกี่ยวข้อง

