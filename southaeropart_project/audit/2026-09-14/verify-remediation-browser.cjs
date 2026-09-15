const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const req = createRequire(resolve(__dirname, '../../e2e/package.json'));
const { chromium } = req('@playwright/test');
const result = { checks: [], pages: [], errors: [] };
async function main() {
 const browser = await chromium.launch({ headless: true, channel: 'chrome' });
 try {
  for (const [app, url] of [['admin','https://localhost:3444/login'],['storefront','https://localhost:3553/']]) {
   const page = await browser.newPage({ ignoreHTTPSErrors: true });
   const errors = [], blocked = [];
   page.on('pageerror', e => errors.push(e.message));
   page.on('console', m => { if (m.type() === 'error' && /content security|violates|refused to/i.test(m.text())) blocked.push(m.text().slice(0, 400)); });
   const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
   assert.equal(response.status(), 200, `${app} page response`);
   const csp = response.headers()['content-security-policy'] || '';
   const script = csp.split(';').find(x => x.trim().startsWith('script-src ')) || '';
   assert.match(script, /'nonce-[^']+'/);
   assert.match(script, /'strict-dynamic'/);
   assert(!script.includes("'unsafe-eval'"));
   // Clerk includes an unsafe-inline compatibility token. CSP-capable browsers
   // ignore it in the presence of the asserted nonce; the parser probe below
   // verifies actual enforcement instead of relying on token absence.
   assert.equal(response.headers()['x-content-type-options'], 'nosniff');
   await page.waitForLoadState('load', { timeout: 45000 });
   const nonced = await page.locator('script[nonce]').evaluateAll(nodes => nodes.every(n => Boolean(n.nonce)));
   assert(nonced);
   const html = await page.content();
   assert(!/postgres(?:ql)?:\/\/[^\s<]+@|sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]{20}/.test(html), 'No server credential pattern in HTML');
   if (app === 'admin') {
    const password = page.locator('input[type=password]').first();
    await password.fill('browser-check-only');
    await page.getByRole('button', { name: /แสดงรหัสผ่าน|show password/i }).click();
    assert.equal(await page.locator('input[value="browser-check-only"]').getAttribute('type'), 'text');
    result.checks.push('admin login hydrates and password visibility control works');
   }
   result.pages.push({ app, status: response.status(), errors: [...errors], cspBlocks: [...blocked] });
   assert.equal(errors.length, 0, `${app} JavaScript errors`);
   assert.equal(blocked.length, 0, `${app} CSP blocks before attack probe`);
   // Intercept only this test browser's HTML, retaining the server CSP. A parser
   // inserted attacker script differs from trusted strict-dynamic script loading.
   await page.route(url, async route => {
    const original = await route.fetch();
    const body = (await original.text()).replace('<head>', '<head><script>window.__injected_security_probe = true</script>');
    await route.fulfill({ response: original, body });
   });
   await page.goto(url, { waitUntil: 'load', timeout: 60000 });
   assert.equal(await page.evaluate(() => window.__injected_security_probe), undefined);
   assert(blocked.length > 0, 'Browser must report the blocked parser-inserted script');
   result.checks.push(`${app}: nonce CSP, no unsafe-eval, credential-pattern check and parser-inserted inline script blocked`);
   await page.close();
  }
  const api = await browser.newContext({ ignoreHTTPSErrors: true });
  const adminProtected = await api.request.get('https://localhost:3444/orders', { maxRedirects: 0 });
  assert([302,303,307,308].includes(adminProtected.status()));
  assert.match(adminProtected.headers().location, /\/login/);
  result.checks.push('admin protected route redirects unauthenticated request');
  const maintenance = await api.request.post('https://localhost:3553/api/maintenance/orders');
  assert.equal(maintenance.status(), 401);
  result.checks.push('maintenance endpoint rejects missing bearer secret');
 } catch (error) { result.errors.push(error.message); process.exitCode = 1; }
 finally { await browser.close(); writeFileSync(resolve(__dirname, 'remediation-browser-results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result)); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
