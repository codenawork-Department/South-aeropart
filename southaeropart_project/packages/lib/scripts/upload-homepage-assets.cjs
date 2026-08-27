const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

// Parse root .env
const envPath = path.resolve(__dirname, '../../../.env');
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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const rootDir = path.resolve(__dirname, '../../..');

const imagesToUpload = [
  {
    filePath: path.join(rootDir, 'SOUTH AERO/G9r/g9r-f (3).png'),
    publicId: 'accord-g9r-front',
    label: 'Honda Accord G9R Front Aero',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/fd.png'),
    publicId: 'civic-fd-track',
    label: 'Honda Civic FD Track Aero',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/fe.png'),
    publicId: 'civic-fe-street',
    label: 'Honda Civic FE Street Stance',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/FRONT.png'),
    publicId: 'accord-front',
    label: 'Accord G9 Front Splitter',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/BACK.png'),
    publicId: 'accord-back',
    label: 'Accord G9 Rear Ducktail & Diffuser',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/AS.png'),
    publicId: 'accord-as',
    label: 'Accord G9 Studio Side Profile',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/civic-r.jpg'),
    publicId: 'civic-r',
    label: 'Civic Type R FL5 Swan Neck Wing',
  },
  {
    filePath: path.join(rootDir, 'SOUTH AERO/top-racer.jpg'),
    publicId: 'top-racer',
    label: 'Accord G9 Top Track Racer',
  },
];

async function uploadAll() {
  console.log('--- Starting Cloudinary Upload to: south-aero/web-assets/frontend-images/homepage ---');
  const results = {};

  for (const item of imagesToUpload) {
    if (!fs.existsSync(item.filePath)) {
      console.warn(`[SKIP] File not found: ${item.filePath}`);
      continue;
    }

    console.log(`Uploading ${item.label} from: ${item.filePath}...`);
    try {
      const res = await cloudinary.uploader.upload(item.filePath, {
        folder: 'south-aero/web-assets/frontend-images/homepage',
        public_id: item.publicId,
        overwrite: true,
        resource_type: 'image',
      });

      console.log(`✓ Success: ${item.publicId}`);
      console.log(`  URL: ${res.secure_url}`);
      results[item.publicId] = {
        publicId: res.public_id,
        secureUrl: res.secure_url,
        width: res.width,
        height: res.height,
      };
    } catch (err) {
      console.error(`✗ Error uploading ${item.publicId}:`, err);
    }
  }

  const outputPath = path.join(__dirname, 'uploaded-homepage-assets.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nSaved upload manifest to: ${outputPath}`);
  return results;
}

uploadAll().catch(console.error);
