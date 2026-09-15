// Read-only requests to loopback production builds. No login attempts or mutations.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
async function main() {
  const cases = [
    ['storefront-home', 'http://127.0.0.1:3100/'],
    ['admin-login', 'http://127.0.0.1:3101/login'],
    ['admin-anonymous', 'http://127.0.0.1:3101/'],
    ['storefront-mock-production', 'http://127.0.0.1:3100/pay/mock/550e8400-e29b-41d4-a716-446655440000'],
  ];
  const results = [];
  for (const [name, url] of cases) {
    const start = Date.now();
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const body = await res.text();
      results.push({ name, status: res.status, elapsedMs: Date.now() - start,
        headers: Object.fromEntries(['content-security-policy','x-frame-options','x-content-type-options',
          'strict-transport-security','cache-control','location'].map(k => [k, res.headers.get(k)])),
        responseBytes: Buffer.byteLength(body),
        rawSecretPattern: /(?:postgres(?:ql)?:\/\/[^\s'"<]+@|sk_live_[A-Za-z0-9]{20,})/.test(body),
      });
    } catch (e) { results.push({ name, error: e.name, elapsedMs: Date.now() - start }); }
  }
  fs.writeFileSync(path.join(__dirname, 'runtime-results.json'), JSON.stringify({
    scope: 'Windows Node.js production build, loopback HTTP; not Cloudflare, not TLS, no signed-in sessions', results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (process.argv.includes('--browser')) {
    const pw = createRequire(path.join(root, 'e2e/package.json'))('@playwright/test');
    const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });
    try {
      const page = await browser.newPage();
      // Harmless event marker; no external requests and no app credentials.
      await page.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'"><svg onload=window.__auditMarker=1></svg>');
      await page.waitForFunction(() => window.__auditMarker === 1);
      const evidence = { browser: browser.version(), inlineSvgEventExecutesUnderUnsafeInline: true,
        scope: 'Isolated local HTML, equivalent relevant CSP directive; no production injection performed' };
      fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify(evidence));
    } finally { await browser.close(); }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
