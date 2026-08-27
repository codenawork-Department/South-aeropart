const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  }
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('--- Creating / Verifying homepage_hero_cards table in Neon Postgres ---');

  await sql`
    CREATE TABLE IF NOT EXISTS homepage_hero_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      position INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      tag TEXT NOT NULL,
      brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
      car_model_id UUID REFERENCES car_models(id) ON DELETE SET NULL,
      image_url TEXT NOT NULL,
      cloudinary_public_id TEXT,
      href TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS hero_cards_position_idx ON homepage_hero_cards (position);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS hero_cards_active_idx ON homepage_hero_cards (is_active);
  `;

  console.log('✓ Table and indexes ensured successfully.');

  // Find Honda brand and Accord model for initial linking
  const [honda] = await sql`SELECT id FROM brands WHERE slug = 'honda' LIMIT 1`;
  const [accord] = await sql`SELECT id FROM car_models WHERE slug = 'accord' LIMIT 1`;
  const [fl5] = await sql`SELECT id FROM car_models WHERE slug = 'civic-type-r-fl5' LIMIT 1`;

  // Seed default 3 cards if empty
  const existingCards = await sql`SELECT * FROM homepage_hero_cards ORDER BY position ASC`;
  console.log(`Current cards in DB: ${existingCards.length}`);

  const defaultCards = [
    {
      position: 1,
      title: 'ACCORD G9 REAR',
      tag: 'DUCKTAIL & DIFFUSER',
      brand_id: honda ? honda.id : null,
      car_model_id: accord ? accord.id : null,
      image_url: 'https://res.cloudinary.com/eorcwggk/image/upload/v1787852339/south-aero/web-assets/frontend-images/homepage/accord-g9r-front.png',
      cloudinary_public_id: 'south-aero/web-assets/frontend-images/homepage/accord-g9r-front',
      href: '/products?make=honda&model=accord',
      is_active: true,
    },
    {
      position: 2,
      title: 'CIVIC FD TRACK',
      tag: 'AERO PACKAGE',
      brand_id: honda ? honda.id : null,
      car_model_id: null,
      image_url: 'https://res.cloudinary.com/eorcwggk/image/upload/v1787852341/south-aero/web-assets/frontend-images/homepage/civic-fd-track.png',
      cloudinary_public_id: 'south-aero/web-assets/frontend-images/homepage/civic-fd-track',
      href: '/products?make=honda&model=civic-fd',
      is_active: true,
    },
    {
      position: 3,
      title: 'CIVIC FE STREET',
      tag: 'MODERN STANCE',
      brand_id: honda ? honda.id : null,
      car_model_id: null,
      image_url: 'https://res.cloudinary.com/eorcwggk/image/upload/v1787852342/south-aero/web-assets/frontend-images/homepage/civic-fe-street.png',
      cloudinary_public_id: 'south-aero/web-assets/frontend-images/homepage/civic-fe-street',
      href: '/products?make=honda&model=civic-fe',
      is_active: true,
    },
  ];

  if (existingCards.length === 0) {
    for (const card of defaultCards) {
      await sql`
        INSERT INTO homepage_hero_cards (
          position, title, tag, brand_id, car_model_id, image_url, cloudinary_public_id, href, is_active
        ) VALUES (
          ${card.position}, ${card.title}, ${card.tag}, ${card.brand_id}, ${card.car_model_id},
          ${card.image_url}, ${card.cloudinary_public_id}, ${card.href}, ${card.is_active}
        );
      `;
    }
    console.log('✓ Seeded initial 3 hero cards into homepage_hero_cards table.');
  } else {
    // Update card 1 with the new Accord G9r image and link
    await sql`
      UPDATE homepage_hero_cards 
      SET 
        image_url = ${defaultCards[0].image_url},
        cloudinary_public_id = ${defaultCards[0].cloudinary_public_id},
        href = ${defaultCards[0].href},
        updated_at = now()
      WHERE position = 1;
    `;
    // Update card 2 with Cloudinary image
    await sql`
      UPDATE homepage_hero_cards 
      SET 
        image_url = ${defaultCards[1].image_url},
        cloudinary_public_id = ${defaultCards[1].cloudinary_public_id},
        href = ${defaultCards[1].href},
        updated_at = now()
      WHERE position = 2;
    `;
    // Update card 3 with Cloudinary image
    await sql`
      UPDATE homepage_hero_cards 
      SET 
        image_url = ${defaultCards[2].image_url},
        cloudinary_public_id = ${defaultCards[2].cloudinary_public_id},
        href = ${defaultCards[2].href},
        updated_at = now()
      WHERE position = 3;
    `;
    console.log('✓ Updated existing 3 hero cards with Cloudinary assets & routes.');
  }

  const finalCards = await sql`SELECT id, position, title, tag, image_url, href, is_active FROM homepage_hero_cards ORDER BY position ASC`;
  console.log('Final DB Cards:', finalCards);
}

run().catch(console.error);
