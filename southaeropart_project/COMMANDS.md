# 🛠️ South Aero Project - Command Cheatsheet

เอกสารสรุปคำสั่งที่ใช้งานบ่อยทั้งหมดในโปรเจกต์ **South Aero** สำหรับการพัฒนา, การจัดการฐานข้อมูล, การทดสอบ Webhook และการแก้ปัญหาทั่วไป

---

## 🚀 1. การรันเซิร์ฟเวอร์ (Development Server)

| คำสั่ง | คำอธิบาย |
|---|---|
| `pnpm dev` | รันทุกแอปพร้อมกัน (ทั้ง Storefront + Admin) |
| `pnpm --filter storefront dev` | รันเฉพาะ **หน้าร้าน (Storefront)** พอร์ต `3000` |
| `pnpm --filter admin dev` | รันเฉพาะ **หลังบ้าน (Admin)** พอร์ต `3001` |

---

## 🗄️ 2. การจัดการฐานข้อมูล (Database & Drizzle ORM)

| คำสั่ง | คำอธิบาย |
|---|---|
| `pnpm --filter @repo/db studio` | **เปิดดูตารางข้อมูล (Drizzle Studio)** ผ่านเบราว์เซอร์ |
| `pnpm --filter @repo/db push` | อัปเดต Schema เข้า Neon DB ทันที (สะดวกตอน Dev) |
| `pnpm --filter @repo/db generate` | สร้างไฟล์ Migration เก็บไว้ใน `packages/db/drizzle` |
| `pnpm --filter @repo/db migrate` | รัน Migration ไฟล์ขึ้นฐานข้อมูล Neon |

---

## 🌐 3. การเปิด Public Tunnel สำหรับทดสอบ Webhook (Clerk / Omise)

| คำสั่ง | คำอธิบาย |
|---|---|
| `ssh -o ServerAliveInterval=30 -R 80:localhost:3000 localhost.run` | **เปิด Public HTTPS Tunnel (แนะนำ)** เชื่อมพอร์ต 3000 มีตัวกันหลุด |
| `& "$env:USERPROFILE\ngrok\ngrok.exe" http 3000` | เปิด Tunnel ผ่าน ngrok ไปยังพอร์ต 3000 |

> **หมายเหตุ:** ต้องเปิดหน้าต่าง Terminal คำสั่ง Tunnel นี้ค้างไว้คู่กับ `pnpm dev` เสมอในขณะทดสอบ

---

## 📦 4. การจัดการแพ็กเกจ (Package Management)

| คำสั่ง | คำอธิบาย |
|---|---|
| `pnpm install` | ติดตั้ง dependencies ทั้งหมดในโปรเจกต์ |
| `pnpm add <package-name> --filter storefront` | ติดตั้งไลบรารีเพิ่มใน **Storefront** |
| `pnpm add <package-name> --filter admin` | ติดตั้งไลบรารีเพิ่มใน **Admin** |
| `pnpm add <package-name> --filter @repo/db` | ติดตั้งไลบรารีเพิ่มใน **DB Package** |

---

## 🔍 5. การตรวจสอบความเรียบร้อยและ Build (Production Check)

| คำสั่ง | คำอธิบาย |
|---|---|
| `pnpm build` | ทดสอบ Build ทุกโปรเจกต์ เพื่อดูว่ามี Error ก่อน Deploy หรือไม่ |
| `pnpm lint` | ตรวจสอบ Code Quality และ Syntax Error |

---

## 💡 6. คำสั่งและทริคแก้ปัญหาใน PowerShell (Windows)

| คำสั่ง | คำอธิบาย |
|---|---|
| `Ctrl + C` | ยกเลิก/หยุดคำสั่งที่กำลังรันอยู่ใน Terminal |
| `cls` | ล้างหน้าจอ Terminal ให้โล่งสะอาด |
| `Get-Process -Name node \| Stop-Process -Force` | **แก้ปัญหาพอร์ตค้าง** สั่งปิด Node.js ทั้งหมดที่ค้างอยู่ |

---

## 📁 7. พอร์ตเริ่มต้นของโปรเจกต์ (Default Ports)

* **Storefront:** [http://localhost:3000](http://localhost:3000)
* **Admin Dashboard:** [http://localhost:3001](http://localhost:3001)
* **Drizzle Studio (Database GUI):** [https://local.drizzle.studio](https://local.drizzle.studio)
* **Webhook Endpoint Path:** `/api/webhooks/clerk` (สำหรับ Clerk) และ `/api/webhooks/omise` (สำหรับ Omise)
