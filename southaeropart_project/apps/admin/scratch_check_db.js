if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured explicitly");
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const prods = await sql`SELECT id, sku, name, brand_id, car_model_id, category_id FROM products LIMIT 20;`;
  console.log("Existing Products:", prods);

  const br = await sql`SELECT id, name, slug FROM brands;`;
  console.log("Brands:", br);

  const cm = await sql`SELECT id, name, slug, brand_id FROM car_models;`;
  console.log("Car Models:", cm);

  const cat = await sql`SELECT id, name, slug FROM categories;`;
  console.log("Categories:", cat);
}

run().catch(console.error);
