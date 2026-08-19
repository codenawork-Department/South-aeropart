# South Aero Performance — Auto Parts E-Commerce Platform

> Monorepo (Turborepo + pnpm) สำหรับร้านค้าอะไหล่แอโรพาร์ทรถยนต์ Honda  
> Tech Stack: Next.js 14 (App Router) · React 18 · Drizzle ORM · Neon Postgres · Clerk · Omise · Cloudinary

---

## 🏗️ ระบบ Monorepo & Configuration

`package.json`: Root workspace — กำหนด scripts (dev/build/lint/db:push/db:studio) | เชื่อมต่อ: turbo.json, pnpm-workspace.yaml | Error: ไม่มี

`pnpm-workspace.yaml`: กำหนด workspace paths (apps/*, packages/*) | เชื่อมต่อ: package.json | Error: ไม่มี

`turbo.json`: กำหนด task pipeline (build/lint/dev) และ cache strategy | เชื่อมต่อ: package.json | Error: ไม่มี

`.env.example`: เทมเพลต environment variables ทั้งระบบ (DB, Clerk, Cloudinary, Omise) | เชื่อมต่อ: env.ts ทุกแอป | Error: ไม่มี

`project-context.md`: เอกสาร context สำหรับ AI Agent — กฎการเขียนโค้ด, schema, rules | เชื่อมต่อ: ทุกไฟล์ | Error: ไม่มี

---

## 📦 packages/config — Shared Configuration

`packages/config/eslint-preset.js`: ESLint preset ใช้ร่วมกัน — บังคับ no-any, warn unused vars | เชื่อมต่อ: storefront, admin | Error: ไม่มี

`packages/config/typescript/base.json`: TypeScript base config — strict mode, ESNext, bundler resolution | เชื่อมต่อ: nextjs.json | Error: ไม่มี

`packages/config/typescript/nextjs.json`: TypeScript config สำหรับ Next.js — extends base, jsx preserve, Next plugin | เชื่อมต่อ: storefront/tsconfig.json, admin/tsconfig.json | Error: ไม่มี

`packages/config/package.json`: Package metadata สำหรับ config workspace | เชื่อมต่อ: pnpm-workspace.yaml | Error: ไม่มี

---

## 🗄️ packages/db — Database Layer (Drizzle ORM + Neon Postgres)

`packages/db/src/client.ts`: สร้าง Drizzle client เชื่อมต่อ Neon Postgres ผ่าน HTTP driver | เชื่อมต่อ: schema/index.ts | Error: ⚠️ อ่าน DATABASE_URL จาก process.env โดยตรง ไม่ผ่าน zod validation (ขัดกับ rule ห้ามใช้ process.env ใน packages)

`packages/db/src/index.ts`: Re-export db client และ schema ทั้งหมด | เชื่อมต่อ: client.ts, schema/index.ts | Error: ไม่มี

`packages/db/src/schema/users.ts`: Schema ตาราง users — id (Clerk ID), email, role, metadata | เชื่อมต่อ: orders.ts, reviews.ts, user-interests.ts | Error: ไม่มี

`packages/db/src/schema/products.ts`: Schema ตาราง products + product_images — sku, slug, price, compatibility, images (Cloudinary) | เชื่อมต่อ: orders.ts, reviews.ts, user-interests.ts | Error: ไม่มี

`packages/db/src/schema/orders.ts`: Schema ตาราง orders + order_items — สถานะคำสั่งซื้อ, การชำระเงิน, ที่อยู่จัดส่ง (Address type) | เชื่อมต่อ: users.ts, products.ts | Error: ไม่มี

`packages/db/src/schema/reviews.ts`: Schema ตาราง reviews — rating, content, moderation status, image URLs | เชื่อมต่อ: users.ts, products.ts | Error: ไม่มี

`packages/db/src/schema/user-interests.ts`: Schema ตาราง user_interests — wishlist/view/price_drop_alert + unique index | เชื่อมต่อ: users.ts, products.ts | Error: ไม่มี

`packages/db/src/schema/index.ts`: กำหนด Drizzle relations ทุกตาราง + re-export schemas ทั้งหมด | เชื่อมต่อ: users.ts, products.ts, orders.ts, reviews.ts, user-interests.ts | Error: ไม่มี

`packages/db/drizzle.config.ts`: Drizzle Kit config — schema path, output dir, PostgreSQL dialect | เชื่อมต่อ: schema/index.ts | Error: ⚠️ ใช้ process.env.DATABASE_URL! (non-null assertion) จะ crash ถ้าไม่ได้ตั้งค่า

`packages/db/package.json`: Dependencies — drizzle-orm, @neondatabase/serverless, zod | เชื่อมต่อ: pnpm-workspace.yaml | Error: ไม่มี

`packages/db/tsconfig.json`: TypeScript config สำหรับ db package | เชื่อมต่อ: config/typescript/base.json | Error: ไม่มี

---

## 🔧 packages/lib — Shared Business Logic

`packages/lib/src/cloudinary.ts`: Cloudinary upload + AI moderation (aws_rek) + delete | เชื่อมต่อ: product.actions.ts (admin), review.actions.ts | Error: ⚠️ ใช้ process.env โดยตรงใน packages (ขัดกับ rule #8 ใน project-context)

`packages/lib/src/omise.ts`: Omise payment API — createCharge, retrieveCharge ผ่าน fetch + Basic Auth | เชื่อมต่อ: checkout.actions.ts, webhooks/omise/route.ts | Error: ⚠️ ใช้ process.env.OMISE_SECRET_KEY โดยตรง (ขัดกับ rule #8)

`packages/lib/src/moderation/text-moderation.ts`: ตรวจสอบคำหยาบ — custom regex + thai-bad-words (dynamic import) | เชื่อมต่อ: review.actions.ts | Error: ⚠️ thai-bad-words ไม่ได้อยู่ใน dependencies ของ package.json (จะ fallback เป็น console.warn)

`packages/lib/package.json`: Dependencies + exports mapping (cloudinary, omise, moderation) | เชื่อมต่อ: pnpm-workspace.yaml | Error: ⚠️ ขาด thai-bad-words ใน dependencies (ทั้งที่โค้ดใช้งาน), ขาด omise SDK (ใช้ raw fetch แทน แต่ project-context ระบุว่าติดตั้ง omise)

`packages/lib/tsconfig.json`: TypeScript config สำหรับ lib package | เชื่อมต่อ: config/typescript/base.json | Error: ไม่มี

---

## 🎨 packages/ui — Shared UI Components (shadcn/ui)

`packages/ui/src/lib/utils.ts`: cn() helper — รวม clsx + tailwind-merge สำหรับ className | เชื่อมต่อ: components ทั้งหมดที่ใช้ @repo/ui | Error: ไม่มี

`packages/ui/src/index.ts`: Re-export cn() จาก utils | เชื่อมต่อ: utils.ts | Error: ⚠️ ยังไม่มี shadcn components ใดถูก export (ไดเรกทอรี components/ ว่างเปล่าหรือยังไม่ถูกสร้าง)

`packages/ui/package.json`: Dependencies — cva, clsx, tailwind-merge, lucide-react, react | เชื่อมต่อ: pnpm-workspace.yaml | Error: ไม่มี

`packages/ui/tsconfig.json`: TypeScript config สำหรับ UI package | เชื่อมต่อ: config/typescript/base.json | Error: ไม่มี

---

## 🛒 apps/storefront — หน้าร้านค้า (Customer-facing)

### App Config & Entry

`apps/storefront/package.json`: Dependencies — next, react, clerk, cloudinary, lucide, zod, workspace packages | เชื่อมต่อ: pnpm-workspace.yaml | Error: ไม่มี

`apps/storefront/next.config.mjs`: Next.js config — transpile workspace packages, Cloudinary remote patterns | เชื่อมต่อ: package.json | Error: ไม่มี

`apps/storefront/tsconfig.json`: TypeScript config — extends nextjs.json, path alias @/* | เชื่อมต่อ: config/typescript/nextjs.json | Error: ไม่มี

`apps/storefront/tailwind.config.js`: Tailwind config — custom colors จาก CSS vars, fonts, animations (slide/fade) | เชื่อมต่อ: globals.css, packages/ui | Error: ไม่มี

`apps/storefront/postcss.config.js`: PostCSS config — tailwindcss + autoprefixer | เชื่อมต่อ: tailwind.config.js | Error: ไม่มี

`apps/storefront/middleware.ts`: Middleware — ปัจจุบัน pass-through (Clerk ถูก disable ไว้รอ config keys) | เชื่อมต่อ: @clerk/nextjs (commented) | Error: ⚠️ Clerk middleware ถูก comment out — ไม่มีการป้องกัน route ใดเลย (account, checkout, wishlist เปิดให้ทุกคนเข้าถึง)

`apps/storefront/lib/env.ts`: Environment validation ด้วย zod — ตั้ง optional ทุกตัว | เชื่อมต่อ: .env.example | Error: ⚠️ ทุก key เป็น optional หมด ทำให้ไม่มีการบังคับว่า env ถูกตั้งค่าจริง (ควร required เมื่อพร้อม production)

`apps/storefront/lib/mock-data.ts`: ข้อมูลจำลอง — MockProduct type, MOCK_PRODUCTS (4 สินค้า), VEHICLE_MAKES/MODELS, CartItem type, categories | เชื่อมต่อ: หน้า page ทุกหน้า, components ส่วนใหญ่ | Error: ⚠️ ใช้ id เป็น string "1","2","3","4" (ไม่ใช่ UUID) ขัดกับ schema ที่กำหนด productId เป็น uuid — cart.actions.ts จะ validate fail ถ้าใช้ mock id

### Layout & Global

`apps/storefront/app/layout.tsx`: Root layout — โหลด Inter + Oswald fonts, metadata SEO, CartProvider, Navbar, Footer | เชื่อมต่อ: Navbar.tsx, Footer.tsx, CartProvider.tsx, globals.css | Error: ไม่มี

`apps/storefront/app/globals.css`: Global CSS — CSS variables (colors, spacing), utility classes, dark theme design system | เชื่อมต่อ: tailwind.config.js, ทุก component | Error: ไม่มี

`apps/storefront/app/(shop)/layout.tsx`: Shop group layout — passthrough fragment | เชื่อมต่อ: layout.tsx (root) | Error: ไม่มี

### หน้าร้าน (Pages)

`apps/storefront/app/(shop)/page.tsx`: หน้าหลัก — ประกอบ 7 sections (VehicleSelector, Hero, Slider, Categories, Info, Badges, Newsletter) | เชื่อมต่อ: ทุก home components | Error: ไม่มี

`apps/storefront/app/(shop)/products/page.tsx`: หน้ารายการสินค้า — grid 4 คอลัมน์, ใช้ MOCK_PRODUCTS, ปุ่ม AddToCart | เชื่อมต่อ: mock-data.ts, AddToCartButton.tsx, VehicleSelector.tsx, NewsletterSection.tsx, FeatureBadges.tsx | Error: ไม่มี

`apps/storefront/app/(shop)/products/[slug]/page.tsx`: หน้ารายละเอียดสินค้า — gallery, specs, quantity selector, add to cart, performance stats, features | เชื่อมต่อ: mock-data.ts, CartProvider.tsx, FeatureBadges.tsx | Error: ⚠️ เป็น "use client" ทั้งหน้า (ขัดกับ rule #2 ที่ควรเป็น RSC default — ควรแยก client logic ออกเป็น component ย่อย)

`apps/storefront/app/(shop)/about/page.tsx`: หน้าเกี่ยวกับเรา — static content, placeholder image | เชื่อมต่อ: ไม่มี | Error: ไม่มี

`apps/storefront/app/(shop)/collection/page.tsx`: หน้า collection — แสดง body kit 4 รายการ (3 coming soon) | เชื่อมต่อ: ไม่มี | Error: ไม่มี

`apps/storefront/app/(shop)/gallery/page.tsx`: หน้า gallery — placeholder 6 ภาพ | เชื่อมต่อ: ไม่มี | Error: ไม่มี

### Server Actions

`apps/storefront/actions/cart.actions.ts`: Server Actions สำหรับตะกร้า — addToCart, removeFromCart, updateCartQuantity + zod validation | เชื่อมต่อ: @repo/db (TODO) | Error: ⚠️ ทุกฟังก์ชันเป็น stub (return placeholder) ยังไม่เชื่อมต่อ DB จริง

`apps/storefront/actions/checkout.actions.ts`: Server Action สำหรับ checkout — createOrder + address/items validation | เชื่อมต่อ: @repo/db (TODO), @repo/lib/omise (TODO) | Error: ⚠️ เป็น stub — return placeholder orderId, ยังไม่สร้าง order จริงหรือเรียก Omise

`apps/storefront/actions/review.actions.ts`: Server Action สำหรับรีวิว — submitReview + zod validation | เชื่อมต่อ: @repo/db (TODO), @repo/lib/moderation (TODO) | Error: ⚠️ เป็น stub — ยังไม่เรียก moderateText() หรือ insert DB

`apps/storefront/actions/wishlist.actions.ts`: Server Actions สำหรับ wishlist — add/remove/get + zod validation | เชื่อมต่อ: @repo/db (TODO) | Error: ⚠️ เป็น stub — ยังไม่เชื่อมต่อ user_interests table

### Webhooks (API Routes)

`apps/storefront/app/api/webhooks/clerk/route.ts`: Clerk webhook handler — รับ user.created / user.updated events, sync ข้อมูลผู้ใช้ | เชื่อมต่อ: @repo/db (TODO) | Error: ⚠️ ไม่มีการ verify webhook signature (Svix) — ใครก็ยิง POST มาได้; DB insert/update ยัง comment out

`apps/storefront/app/api/webhooks/omise/route.ts`: Omise webhook handler — รับ charge.complete event, validate token, อัปเดตสถานะ payment | เชื่อมต่อ: @repo/db (TODO) | Error: ⚠️ ใช้ process.env.OMISE_WEBHOOK_SECRET โดยตรง (ไม่ผ่าน env.ts); DB update ยัง comment out; ไม่มี idempotency check

### Components — Layout

`apps/storefront/components/layout/Navbar.tsx`: Navigation bar — logo, nav links, search toggle, user link, cart toggle | เชื่อมต่อ: CartProvider.tsx, CartSidebar.tsx, MobileMenu.tsx | Error: ไม่มี

`apps/storefront/components/layout/Footer.tsx`: Footer — link columns (shop/company/support), social icons, payment methods, newsletter bar | เชื่อมต่อ: ไม่มี | Error: ⚠️ มี link ไปหน้าที่ยังไม่มี (blog, contact, shipping, returns, faq, terms)

`apps/storefront/components/layout/MobileMenu.tsx`: เมนูมือถือ — slide-in panel, nav links, search, account link | เชื่อมต่อ: Navbar.tsx | Error: ⚠️ ใช้ styled-jsx (@keyframes slideInLeft) แต่ class ที่ assign เป็น animate-slide-in-right (ทิศทาง animation ขัดกัน — panel ควร slide จากซ้าย)

`apps/storefront/components/layout/CartSidebar.tsx`: Sidebar ตะกร้า — แสดงรายการสินค้า, quantity controls, subtotal, checkout link, trust badges | เชื่อมต่อ: CartProvider.tsx | Error: ไม่มี

### Components — Home Page

`apps/storefront/components/home/VehicleSelector.tsx`: ตัวเลือกยี่ห้อ/รุ่นรถ — dropdown make + model, ปุ่ม view products | เชื่อมต่อ: mock-data.ts (VEHICLE_MAKES, VEHICLE_MODELS) | Error: ⚠️ ปุ่ม "VIEW ALL PRODUCTS" ไม่มี onClick/href — กดแล้วไม่ทำอะไร

`apps/storefront/components/home/HeroSection.tsx`: Hero section — slogan "NOT LOUD, JUST DIFFERENT", car lineup placeholders, watermark | เชื่อมต่อ: ไม่มี | Error: ไม่มี

`apps/storefront/components/home/FeaturedSlider.tsx`: Slider ผลงานเด่น — Accord G9 Body Kit, 5 slides, navigation controls | เชื่อมต่อ: mock-data.ts (FEATURED_BODY_KIT) | Error: ⚠️ ปุ่ม "EXPLORE" ไม่มี onClick/href — กดแล้วไม่ทำอะไร

`apps/storefront/components/home/ProductCategories.tsx`: Grid หมวดหมู่สินค้า — tabs (SHOP/G9/GALLERY), 4 categories | เชื่อมต่อ: mock-data.ts (CATEGORY_TABS, PRODUCT_CATEGORIES) | Error: ⚠️ การเปลี่ยน tab ไม่มีผลต่อเนื้อหา (แสดง categories เดิมทุก tab)

`apps/storefront/components/home/InfoSections.tsx`: 2 cards — Aerodynamic + Philosophy พร้อม placeholder images | เชื่อมต่อ: ไม่มี | Error: ⚠️ ปุ่ม "LEARN MORE" ทั้ง 2 ไม่มี onClick/href

`apps/storefront/components/home/FeatureBadges.tsx`: 4 trust badges — Premium Quality, Precise Fitment, Performance Driven, Support | เชื่อมต่อ: ไม่มี | Error: ไม่มี

`apps/storefront/components/home/NewsletterSection.tsx`: ฟอร์มสมัคร newsletter — email input + subscribe button | เชื่อมต่อ: ไม่มี | Error: ⚠️ ปุ่ม SUBSCRIBE ไม่มี logic ใดๆ (ไม่มี form action/onClick)

### Components — Products

`apps/storefront/components/products/AddToCartButton.tsx`: ปุ่มเพิ่มลงตะกร้า — icon button, ใช้ useCart().addItem | เชื่อมต่อ: CartProvider.tsx, mock-data.ts | Error: ไม่มี

### Components — Providers

`apps/storefront/components/providers/CartProvider.tsx`: Cart Context — state management สำหรับตะกร้า (add/remove/update/clear), คำนวณ itemCount + subtotal | เชื่อมต่อ: mock-data.ts (CartItem type), ทุก component ที่ใช้ useCart() | Error: ⚠️ ตะกร้าเป็น client-side only (state หายเมื่อ refresh) — ยังไม่ sync กับ DB

---

## 🔐 apps/admin — แผงควบคุมผู้ดูแล (Admin Dashboard)

### App Config & Entry

`apps/admin/package.json`: Dependencies — next, react, clerk, tanstack/react-table, lucide, zod, workspace packages | เชื่อมต่อ: pnpm-workspace.yaml | Error: ไม่มี

`apps/admin/next.config.mjs`: Next.js config — transpile workspace packages | เชื่อมต่อ: package.json | Error: ⚠️ ไม่มี Cloudinary remote patterns (ต่างจาก storefront — ถ้าจะแสดงรูปสินค้าจะต้องเพิ่ม)

`apps/admin/tsconfig.json`: TypeScript config — extends nextjs.json, path alias @/* | เชื่อมต่อ: config/typescript/nextjs.json | Error: ไม่มี

`apps/admin/tailwind.config.js`: Tailwind config — minimal, ไม่มี custom theme | เชื่อมต่อ: globals.css | Error: ไม่มี

`apps/admin/postcss.config.js`: PostCSS config — tailwindcss + autoprefixer | เชื่อมต่อ: tailwind.config.js | Error: ไม่มี

`apps/admin/middleware.ts`: Middleware — pass-through (Clerk ถูก disable) | เชื่อมต่อ: @clerk/nextjs (ยังไม่ใช้) | Error: ⚠️ Clerk middleware ถูก disable — admin ไม่มีการตรวจสอบสิทธิ์ใดเลย (ทุกคนเข้าถึง dashboard ได้)

`apps/admin/lib/env.ts`: Environment validation ด้วย zod — DATABASE_URL, Clerk keys (optional) | เชื่อมต่อ: .env.example | Error: ⚠️ เหมือน storefront ทุก key เป็น optional

### Layout & Pages

`apps/admin/app/layout.tsx`: Root layout — minimal, metadata, globals.css | เชื่อมต่อ: globals.css | Error: ไม่มี

`apps/admin/app/globals.css`: Global CSS — Tailwind directives, dark theme (#0A0A0A), system fonts | เชื่อมต่อ: tailwind.config.js | Error: ไม่มี

`apps/admin/app/(dashboard)/page.tsx`: หน้า Dashboard — sidebar navigation, stats grid (hardcoded), placeholder content | เชื่อมต่อ: ไม่มี | Error: ⚠️ Nav links ใช้ href="#" (ไม่ navigate); ข้อมูลสถิติ hardcode ไม่ดึงจาก DB; ยังไม่มีหน้า products/orders/reviews

---

## 📊 สรุป Error ที่พบทั้งโปรเจกต์

| ระดับ | จำนวน | รายละเอียด |
|-------|--------|------------|
| 🔴 Critical | 3 | Clerk middleware disabled (ทั้ง storefront + admin), Clerk webhook ไม่ verify signature |
| 🟠 Architecture | 4 | process.env โดยตรงใน packages (client.ts, cloudinary.ts, omise.ts, drizzle.config.ts) ขัดกับ rule #8 |
| 🟡 Incomplete | 6 | Server Actions ทั้งหมดเป็น stub, webhooks ยัง comment DB logic, ปุ่มหลายจุดไม่มี action |
| 🟡 Data Mismatch | 1 | mock-data ใช้ id แบบ string ("1","2") ขัดกับ schema ที่กำหนด UUID |
| 🔵 Missing Dep | 1 | thai-bad-words ไม่อยู่ใน lib/package.json |
| 🔵 UI Bug | 2 | MobileMenu animation ทิศทางขัดกัน, ProductCategories tab ไม่เปลี่ยนเนื้อหา |

---

## ⚡ Quick Start

```bash
# Clone & install
git clone <repo-url>
cd southaeropart_project
pnpm install

# ตั้งค่า environment
cp .env.example apps/storefront/.env.local
cp .env.example apps/admin/.env.local
# แก้ไข .env.local ใส่ค่าจริง

# Push schema ไป database
pnpm db:push

# รัน dev servers
pnpm dev
# storefront → http://localhost:3000
# admin     → http://localhost:3001
```
