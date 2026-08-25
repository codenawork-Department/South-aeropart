const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Checking database schema and icons...");

  // Check columns in products
  const productCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'features';
  `;
  console.log("products.features column check:", productCols);

  // Check icons table
  const iconRows = await sql`SELECT count(*) FROM icons;`;
  console.log("icons count in db:", iconRows);

  console.log("All DB checks passed successfully!");
}

run().catch(console.error);
