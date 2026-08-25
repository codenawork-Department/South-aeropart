const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

const INITIAL_ICONS = [
  { name: "Aerodynamic Wind / Airflow", slug: "aero-wind", category: "aerodynamics", type: "lucide", lucideName: "Wind" },
  { name: "High-Speed Downforce", slug: "aero-downforce", category: "aerodynamics", type: "lucide", lucideName: "Zap" },
  { name: "Vortex Management & Flow", slug: "aero-flow", category: "aerodynamics", type: "lucide", lucideName: "Layers" },
  { name: "High-Speed Stability", slug: "aero-stability", category: "aerodynamics", type: "lucide", lucideName: "Compass" },
  { name: "CFD & Wind Tunnel Tested", slug: "aero-cfd", category: "aerodynamics", type: "lucide", lucideName: "Activity" },
  { name: "Pre-preg Carbon Fiber & Durability", slug: "material-carbon", category: "material", type: "lucide", lucideName: "Shield" },
  { name: "UV-Resistant Clear Coat", slug: "material-uv", category: "material", type: "lucide", lucideName: "Sun" },
  { name: "Show-Quality Mirror Gloss", slug: "material-gloss", category: "material", type: "lucide", lucideName: "Sparkles" },
  { name: "Impact & Heat Resistant ABS", slug: "material-abs", category: "material", type: "lucide", lucideName: "Flame" },
  { name: "3D Laser Scan & CAD Fitment", slug: "fitment-cad", category: "performance", type: "lucide", lucideName: "Crosshair" },
  { name: "Adjustable Aerodynamic Attack", slug: "fitment-adjustable", category: "performance", type: "lucide", lucideName: "Sliders" },
  { name: "Direct Bolt-On OEM Gap", slug: "fitment-bolton", category: "performance", type: "lucide", lucideName: "CheckCircle2" },
  { name: "Flush Body Line Integration", slug: "fitment-flush", category: "performance", type: "lucide", lucideName: "Maximize2" },
  { name: "Reduced Drag & Lift Coefficient", slug: "perf-drag-reduction", category: "performance", type: "lucide", lucideName: "Gauge" },
  { name: "Track-Proven Motorsport Dynamics", slug: "perf-track", category: "performance", type: "lucide", lucideName: "Flag" },
  { name: "Calculated Pressure Gradient", slug: "perf-pressure", category: "performance", type: "lucide", lucideName: "Cpu" },
  { name: "Professional Installation Hardware", slug: "install-hardware", category: "services", type: "lucide", lucideName: "Wrench" },
  { name: "Premium Quality Assurance", slug: "trust-quality", category: "trust", type: "lucide", lucideName: "Award" },
  { name: "Dedicated Engineering Support", slug: "support-expert", category: "trust", type: "lucide", lucideName: "Headphones" },
  { name: "Fast & Secure Tracked Delivery", slug: "shipping-secure", category: "services", type: "lucide", lucideName: "Truck" },
];

async function seed() {
  console.log("Seeding curated initial icons into Neon DB...");
  let count = 0;
  for (const item of INITIAL_ICONS) {
    const existing = await sql`SELECT id FROM icons WHERE slug = ${item.slug} LIMIT 1;`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO icons (name, slug, category, type, lucide_name, is_active)
        VALUES (${item.name}, ${item.slug}, ${item.category}, ${item.type}, ${item.lucideName}, true);
      `;
      count++;
    }
  }
  console.log(`Seeded ${count} initial icons successfully! Total in DB: ${INITIAL_ICONS.length}`);
}

seed().catch(console.error);
