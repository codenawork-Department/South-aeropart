-- Migration: 0002_material_aero_fields
-- เพิ่มตาราง materials และคอลัมน์ใหม่ใน products

-- ─── สร้างตาราง materials ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_name_unique" UNIQUE("name"),
	CONSTRAINT "materials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- ─── Indexes สำหรับ materials ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "materials_slug_idx" ON "materials" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_name_idx" ON "materials" USING btree ("name");
--> statement-breakpoint

-- ─── เพิ่มคอลัมน์ใน products ─────────────────────────────────────────────────
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "short_description" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "installation" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "material_id" uuid;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "downforce_n" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drag_n" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "downforce_before" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "downforce_after" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drag_before" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drag_after" numeric(10, 2);
--> statement-breakpoint

-- ─── Foreign Key: products → materials ───────────────────────────────────────
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "products_material_idx" ON "products" USING btree ("material_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_featured_idx" ON "products" USING btree ("is_featured");
--> statement-breakpoint

-- ─── Seed ข้อมูลวัสดุเริ่มต้น (ตัวอย่าง) ─────────────────────────────────────
INSERT INTO "materials" ("name", "slug", "description") VALUES
  ('Pre-preg Carbon Fiber', 'prepreg-carbon-fiber', 'คาร์บอนไฟเบอร์อัดแรงดันสูง (Autoclave) ให้น้ำหนักเบาและความแข็งแรงสูงสุด'),
  ('ABS Plastic', 'abs-plastic', 'พลาสติก ABS เกรดยานยนต์ ทนทาน ยืดหยุ่น ราคาเข้าถึงได้'),
  ('FRP / Fiberglass', 'frp-fiberglass', 'ไฟเบอร์กลาสเสริมใยแก้ว น้ำหนักเบา ขึ้นรูปได้ง่าย'),
  ('Dry Carbon Fiber', 'dry-carbon-fiber', 'คาร์บอนไฟเบอร์แบบ Dry สำหรับงานเรซิ่งและ motorsport'),
  ('Forged Carbon Composite', 'forged-carbon-composite', 'คาร์บอนอัดขึ้นรูปแบบ Forged ลายไม่ซ้ำ แข็งแกร่งมาก'),
  ('High-Impact ABS + Carbon Fiber', 'abs-carbon-hybrid', 'ผสมผสาน ABS กับคาร์บอนไฟเบอร์ สมดุลน้ำหนักและความแข็งแรง'),
  ('Vacuum-infused FRP', 'vacuum-frp', 'ไฟเบอร์กลาสอัดสูญญากาศ ลดฟองอากาศ โครงสร้างสม่ำเสมอ'),
  ('Billet Aluminum 6061-T6', 'billet-aluminum-6061', 'อลูมิเนียมแท่ง CNC เกรด 6061-T6 สำหรับงานโครงสร้าง')
ON CONFLICT ("slug") DO NOTHING;
