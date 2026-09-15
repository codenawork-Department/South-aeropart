const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const https = require('node:https');
const dir = resolve(__dirname, '../../apps/storefront');
const req = createRequire(resolve(dir, 'package.json'));
req('dotenv').config({ path: resolve(dir, '../../.env'), quiet: true });
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Test configuration required');
process.env.NODE_ENV = 'production';
process.env.APP_ENV = 'staging';
for (const key of ['ORDER_TOKEN_SECRET','REALTIME_SECRET','MAINTENANCE_SECRET']) process.env[key] ||= randomBytes(32).toString('hex');
const app = req('next')({ dev: false, dir, hostname: 'localhost', port: 3553 });
app.prepare().then(() => {
 const handler = app.getRequestHandler();
 https.createServer({ key: readFileSync(resolve(__dirname, 'preview-tls/key.pem')), cert: readFileSync(resolve(__dirname, 'preview-tls/cert.pem')) }, (request,response) => handler(request,response))
  .listen(3553, '127.0.0.1', () => console.log('Direct HTTPS production preview ready on 3553'));
});
