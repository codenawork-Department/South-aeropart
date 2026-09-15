const fs = require('fs');
const {createRequire} = require('module');
const fromApp=createRequire(process.cwd()+'/apps/storefront/package.json');
fromApp('dotenv').config({path:'.env',quiet:true});
const dbUrl=process.env.DATABASE_URL;
const stripeKey=process.env.STRIPE_SECRET_KEY;
console.log(JSON.stringify({databaseConfigured:Boolean(dbUrl),databaseIsNeon:dbUrl?new URL(dbUrl).hostname.endsWith('.neon.tech'):false,stripeTestMode:stripeKey?.startsWith('sk_test_')===true,stripeLiveMode:stripeKey?.startsWith('sk_live_')===true}));
