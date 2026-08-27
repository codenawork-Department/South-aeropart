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

const imagesToDelete = [
  'south-aero/web-assets/frontend-images/homepage/accord-front',
  'south-aero/web-assets/frontend-images/homepage/accord-back',
  'south-aero/web-assets/frontend-images/homepage/accord-as',
  'south-aero/web-assets/frontend-images/homepage/civic-r',
  'south-aero/web-assets/frontend-images/homepage/top-racer',
];

async function cleanup() {
  console.log('--- Deleting 5 extra images from Cloudinary ---');
  for (const publicId of imagesToDelete) {
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted ${publicId}:`, res);
    } catch (err) {
      console.error(`Error deleting ${publicId}:`, err);
    }
  }

  // Update manifest to keep only the 3 main images
  const manifestPath = path.join(__dirname, 'uploaded-homepage-assets.json');
  const onlyThree = {
    "accord-g9r-front": {
      "publicId": "south-aero/web-assets/frontend-images/homepage/accord-g9r-front",
      "secureUrl": "https://res.cloudinary.com/eorcwggk/image/upload/v1787852339/south-aero/web-assets/frontend-images/homepage/accord-g9r-front.png",
      "width": 1086,
      "height": 815
    },
    "civic-fd-track": {
      "publicId": "south-aero/web-assets/frontend-images/homepage/civic-fd-track",
      "secureUrl": "https://res.cloudinary.com/eorcwggk/image/upload/v1787852341/south-aero/web-assets/frontend-images/homepage/civic-fd-track.png",
      "width": 1313,
      "height": 1198
    },
    "civic-fe-street": {
      "publicId": "south-aero/web-assets/frontend-images/homepage/civic-fe-street",
      "secureUrl": "https://res.cloudinary.com/eorcwggk/image/upload/v1787852342/south-aero/web-assets/frontend-images/homepage/civic-fe-street.png",
      "width": 1461,
      "height": 1076
    }
  };

  fs.writeFileSync(manifestPath, JSON.stringify(onlyThree, null, 2), 'utf8');
  console.log('✓ Successfully cleaned up Cloudinary assets. Kept only the 3 main images.');
}

cleanup().catch(console.error);
