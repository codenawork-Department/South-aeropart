// Offline characterization of the audited commit. Passing assertions reproduce
// unsafe behavior; they are NOT release acceptance tests. No DB/provider access.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const appRequire = createRequire(path.join(root, 'apps/admin/package.json'));
const ts = appRequire('typescript');
const records = [];
const quiet = { log() {}, warn() {}, error() {} };
function load(relative, mocks = {}, env = {}) {
  const file = path.join(root, relative);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@repo/') || name.startsWith('@/') || name.startsWith('next/')) {
      throw new Error('Unmocked application dependency: ' + name);
    }
    return appRequire(name);
  };
  vm.runInNewContext(source, { module, exports: module.exports, require: localRequire,
    process: { env }, Buffer, console: quiet, FormData, URL, Date,
    setTimeout, clearTimeout }, { filename: file });
  return module.exports;
}
async function record(id, title, fn) {
  const evidence = await fn();
  records.push({ id, title, reproduced: true, evidence });
  console.log(id + ': REPRODUCED — ' + title);
}
function dbDouble(initial) {
  const state = structuredClone(initial);
  const tables = {};
  for (const name of ['orders','orderItems','orderStatusHistory','orderItemBundleParts',
    'productBundleItems','products','adminUsers']) {
    tables[name] = new Proxy({ name }, { get: (t, key) => key === 'name' ? name : { table: name, key } });
    state[name] ||= [];
  }
  function matches(row, expr) {
    if (!expr) return true;
    if (expr.op === 'eq') return row[expr.col.key] === expr.val;
    if (expr.op === 'in') return expr.val.includes(row[expr.col.key]);
    if (expr.op === 'and') return expr.args.every(x => matches(row, x));
    if (expr.op === 'sql') return row.paymentStatus !== 'paid';
    throw new Error('Unknown predicate');
  }
  const deferred = fn => ({ then: (yes, no) => Promise.resolve().then(fn).then(yes, no),
    limit: n => Promise.resolve(fn().slice(0, n)), returning: () => Promise.resolve(fn()) });
  const db = {
    select: () => ({ from: table => ({ where: clause => deferred(() =>
      state[table.name].filter(r => matches(r, clause)).map(r => ({ ...r }))) }) }),
    update: table => ({ set: values => ({ where: clause => deferred(() => {
      const rows = state[table.name].filter(r => matches(r, clause));
      rows.forEach(r => Object.assign(r, values)); return rows.map(r => ({ ...r }));
    }) }) }),
    insert: table => ({ values: values => { state[table.name].push({ ...values }); return Promise.resolve(); } }),
    transaction: async fn => fn(db),
  };
  return { state, module: { db, ...tables,
    eq: (col, val) => ({ op: 'eq', col, val }),
    inArray: (col, val) => ({ op: 'in', col, val }),
    and: (...args) => ({ op: 'and', args }), sql: () => ({ op: 'sql' }) } };
}
async function main() {
  const limiter = load('apps/storefront/lib/rate-limiter.ts');
  await record('ABUSE-01', 'Forwarded header overrides the supplied connection IP', async () => {
    const ip = limiter.getClientIp({ ip: '192.0.2.10', headers: new Headers({ 'x-forwarded-for': '198.51.100.99' }) });
    assert.equal(ip, '198.51.100.99'); return { selectedIp: ip, suppliedConnectionIp: '192.0.2.10' };
  });
  await record('ABUSE-02', 'maxBuckets does not bound active entries', async () => {
    const l = new limiter.MemoryRateLimiter(2);
    for (let i = 0; i < 10; i++) l.check('key-' + i, limiter.RATE_LIMIT_PRESETS.API, 1000);
    assert.equal(l.size(), 10); return { configuredMax: 2, actualActiveEntries: l.size() };
  });
  const icons = load('apps/admin/components/icons/app-icon.tsx');
  await record('XSS-01', 'SVG sanitizer retains an unquoted event handler', async () => {
    const output = icons.sanitizeAndFormatSvg('<svg xmlns="http://www.w3.org/2000/svg" onload=void(0)></svg>');
    assert.match(output, /onload=void\(0\)/); return { retainedEventAttribute: true, browserExecutionTested: false };
  });
  const oid = '550e8400-e29b-41d4-a716-446655440000';
  await record('STOCK-01', 'Fulfillment deducts stock already reserved by checkout', async () => {
    const d = dbDouble({ orders: [{ id: oid, paymentStatus: 'pending', status: 'pending' }],
      orderItems: [{ id: 'item', orderId: oid, productId: 'part', quantity: 1 }],
      products: [{ id: 'part', productType: 'single', stockQuantity: 9 }] });
    const f = load('apps/storefront/lib/order-fulfillment.ts', { '@repo/db': d.module,
      'next/cache': { revalidatePath() {} }, '@/lib/order-email': { sendOrderConfirmationEmail: async () => {} } });
    assert.equal((await f.fulfillOrderPayment(oid, { method: 'stripe', chargeId: 'pi_audit' })).success, true);
    assert.equal(d.state.products[0].stockQuantity, 8);
    return { originalStock: 10, afterCheckoutReservation: 9, afterFulfillment: 8,
      boundary: 'Actual fulfillment function; post-checkout state supplied by in-memory double, not PostgreSQL' };
  });
  await record('PAYMENT-01', 'Stripe handler fulfills a mismatched PaymentIntent', async () => {
    const d = dbDouble({ orders: [{ id: oid, total: '100.00', currency: 'THB', status: 'pending',
      paymentStatus: 'pending', stripePaymentIntentId: 'pi_expected' }] });
    let calls = 0;
    const handler = load('apps/storefront/app/api/webhooks/stripe/route.ts', {
      '@repo/db': d.module,
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
      '@repo/lib': { toSmallestCurrencyUnit: () => 10000, constructStripeWebhookEvent: () => ({
        type: 'payment_intent.succeeded', livemode: true,
        data: { object: { id: 'pi_different', metadata: { orderId: oid }, amount_received: 10000, currency: 'thb' } } }) },
      '@/lib/order-fulfillment': { fulfillOrderPayment: async () => { calls++; return { success: true }; } },
    }, { NODE_ENV: 'production' });
    const response = await handler.POST({ headers: new Headers({ 'stripe-signature': 'mocked-signature' }), text: async () => '{}' });
    assert.equal(response.status, 200); assert.equal(calls, 1);
    return { httpStatus: response.status, fulfillmentCalls: calls, signatureVerifier: 'mocked; no claim of cryptographic bypass' };
  });
  const mfa = load('apps/admin/lib/mfa.ts', {}, { ADMIN_SESSION_SECRET: 'audit-only-local-key-at-least-thirty-two-characters' });
  await record('MFA-01', 'MFA setup can replace an existing factor using session alone', async () => {
    const admin = { id: 'audit-admin', email: 'audit@example.test', mfaEnabled: true };
    const d = dbDouble({ adminUsers: [admin] });
    let passwordChecks = 0;
    const actions = load('apps/admin/actions/auth.actions.ts', { '@repo/db': d.module,
      'next/navigation': { redirect() {} }, '@/lib/mfa': mfa,
      '@/lib/auth': { validateSession: async () => admin, logAuditEvent: async () => {},
        verifyPassword: async () => { passwordChecks++; return false; } } });
    const setup = await actions.initiateMfaSetupAction();
    const fd = new FormData();
    fd.set('code', mfa.generateTotp(setup.secret));
    fd.set('encryptedSecret', setup.encryptedSecret);
    fd.set('recoveryCodesHash', JSON.stringify([mfa.hashRecoveryCode('attacker-chosen-code')]));
    assert.equal((await actions.confirmMfaSetupAction(null, fd)).success, true);
    assert.equal(passwordChecks, 0);
    assert.equal(d.state.adminUsers[0].mfaRecoveryCodesHash[0], mfa.hashRecoveryCode('attacker-chosen-code'));
    return { requiresExistingSession: true, reauthenticationCalls: passwordChecks, clientChosenRecoveryHashAccepted: true };
  });
  await record('MFA-02', 'MFA-enabled account with absent secret falls through to password-only login', async () => {
    const d = dbDouble({ adminUsers: [{ id: 'audit-admin', email: 'audit@example.test', isActive: true,
      mfaEnabled: true, mfaSecretEncrypted: null, passwordHash: 'mock' }] });
    let sessions = 0;
    const actions = load('apps/admin/actions/auth.actions.ts', { '@repo/db': d.module,
      'next/navigation': { redirect() {} }, '@/lib/mfa': mfa,
      '@/lib/auth': { verifyPassword: async () => true, isAccountLocked: () => false,
        resetFailedLogins: async () => {}, createSession: async () => { sessions++; }, logAuditEvent: async () => {} } });
    const fd = new FormData(); fd.set('email', 'audit@example.test'); fd.set('password', 'audit-only');
    await actions.loginAction(null, fd); assert.equal(sessions, 1);
    return { mfaEnabled: true, secretPresent: false, sessionsCreated: sessions, passwordVerification: 'mocked valid' };
  });
  await record('MFA-03', 'Recovery helper accepts the same code twice against concurrent snapshots', async () => {
    const hashes = [mfa.hashRecoveryCode('audit-recovery')];
    const a = mfa.verifyAndConsumeRecoveryCode('audit-recovery', hashes);
    const b = mfa.verifyAndConsumeRecoveryCode('audit-recovery', hashes);
    assert.equal(a.valid && b.valid, true);
    return { acceptedSnapshots: 2, boundary: 'Helper only; action uses non-atomic read/update, PostgreSQL race remains untested' };
  });
  await record('AUTH-01', 'Receipt email mutation fails open when Clerk auth throws', async () => {
    const d = dbDouble({ orders: [{ id: oid, userId: 'user_other', shippingAddress: { email: 'owner@example.test' },
      stripePaymentIntentId: null, createdAt: new Date() }] });
    const actions = load('apps/storefront/actions/checkout.actions.ts', {
      '@repo/db': d.module, '@repo/lib': {},
      '@clerk/nextjs/server': { auth: () => { throw new Error('Missing middleware context'); } },
      'next/cache': { revalidatePath() {} }, 'next/headers': {},
      '@/lib/order-email': {}, '@/lib/user-sync': {}, '@/lib/order-fulfillment': {},
      '@/lib/guest-order-token': {}, '@/lib/rate-limiter': limiter,
    }, { NODE_ENV: 'production' });
    const result = await actions.updateOrderReceiptEmail(oid, 'changed@example.test');
    assert.equal(result.success, true);
    assert.equal(d.state.orders[0].shippingAddress.email, 'changed@example.test');
    return { authenticatedUser: null, authException: true, mutationSucceeded: true,
      boundary: 'Actual server action with simulated auth-context error; remote reachability not proven' };
  });
  await record('STOCK-02', 'Staff can cancel a paid order repeatedly and inflate stock', async () => {
    const d = dbDouble({ orders: [{ id: oid, orderNumber: 'SA-AUDIT', status: 'paid', paymentStatus: 'paid' }],
      orderItems: [{ id: 'item', orderId: oid, productId: 'part', quantity: 1 }],
      products: [{ id: 'part', productType: 'single', stockQuantity: 8, status: 'active' }] });
    const actions = load('apps/admin/actions/order.actions.ts', {
      '@repo/db': d.module, 'next/cache': { revalidatePath() {} },
      '@/lib/auth': { validateSession: async () => ({ id: 'staff', role: 'staff', fullName: 'Audit Staff' }),
        logAuditEvent: async () => {} },
      '@/lib/shipment-email': { sendShipmentNotificationEmail: async () => {} },
      '@/lib/realtime-notifier': { notifyStorefrontCatalogChange() {} },
    });
    assert.equal((await actions.updateOrderStatusAction({ orderId: oid, status: 'cancelled' })).success, true);
    const afterFirst = d.state.products[0].stockQuantity;
    assert.equal((await actions.updateOrderStatusAction({ orderId: oid, status: 'cancelled' })).success, true);
    assert.equal(d.state.products[0].stockQuantity, afterFirst + 1);
    return { initialStock: 8, afterFirstCancel: afterFirst, afterSecondCancel: d.state.products[0].stockQuantity,
      actorRole: 'staff', boundary: 'Actual action with sequential in-memory persistence, not PostgreSQL' };
  });
  fs.writeFileSync(path.join(__dirname, 'reproduction-results.json'), JSON.stringify({
    commit: '3b05acf8ddd30cc139c38974506a2ac4bdae8edb',
    scope: 'Offline actual-source characterization with explicit doubles; no database, provider, or HTTP server',
    records }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
