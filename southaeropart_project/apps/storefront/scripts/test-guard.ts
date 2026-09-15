/** Legacy fixtures require an explicitly provisioned disposable database. */
export function assertTestIsolation(options?: { requireStripe?: boolean }) {
  if (process.env.NODE_ENV === 'production' || process.env.TEST_DATABASE_DISPOSABLE !== 'true') throw new Error('Explicit disposable test database authorization required');
  const target = process.env.TEST_DATABASE_URL;
  if (!target || process.env.DATABASE_URL !== target) throw new Error('DATABASE_URL must exactly match provisioned TEST_DATABASE_URL');
  const url = new URL(target);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Postgres test database required');
  if (process.env.RESEND_API_KEY) throw new Error('Email sink required: remove RESEND_API_KEY from this test environment');
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (key.startsWith('sk_live_') || (options?.requireStripe && !key.startsWith('sk_test_'))) throw new Error('Stripe test credentials required');
}
