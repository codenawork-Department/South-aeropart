const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const root = resolve(__dirname, '../..');
const sfRequire = createRequire(resolve(root, 'apps/storefront/package.json'));
sfRequire('dotenv').config({ path: resolve(root, '.env'), quiet: true });
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Preview requires the authorized Stripe test environment');
const env = { ...process.env, NODE_ENV: 'production', APP_ENV: 'staging' };
// Ephemeral local-preview secrets, never saved or printed. Real provider test
// credentials remain those supplied by the user; no payment/email forms are submitted.
for (const key of ['ADMIN_MFA_ENCRYPTION_KEY','ORDER_TOKEN_SECRET','REALTIME_SECRET','MAINTENANCE_SECRET']) env[key] ||= randomBytes(32).toString('hex');
const app = process.argv[2];
if (!['admin','storefront'].includes(app)) throw new Error('Choose an application');
const port = app === 'admin' ? 3101 : 3100;
const req = createRequire(resolve(root, `apps/${app}/package.json`));
const child = spawn(process.execPath, [req.resolve('next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: resolve(root, `apps/${app}`), env, stdio: 'inherit', windowsHide: true });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill());
child.on('exit', code => { process.exitCode = code || 0; });
