# Security remediation rollout

This change is not a production deployment approval. The original audit remains historical evidence in `audit/2026-09-14`. See `remediation-report.md` there for checks actually performed.

## Required before the application uses this schema

1. Rotate/revoke the Neon credentials previously committed in eight files. Removing literals does not invalidate copies in Git history. Update local environment, MCP environment and eventual deployment secret stores, then inspect access logs. Do not print credentials or put them in commands committed to Git.
2. Snapshot the database and verify a restore on a separate branch. Use a migration role for DDL and a restricted application role for runtime. The test runs authorized in this task used disposable schemas on the existing test project; this is not proof that those credentials are isolated from a future production project.
3. Review the migration journal before applying it. `0000` through the registered `0003_security_runtime` pass on a fresh schema. The old unregistered `0002_material_aero_fields.sql` and `0003_installations.sql` are historical manual scripts, not journal entries. Do not glob and execute every SQL file.
4. For an existing database built with `db:push` or manual scripts, compare the live schema and establish an explicit migration baseline first. The generated migrations contain CREATE statements for previously unregistered tables and must not be blindly applied to that database. No migration was applied to its original schema during this remediation.
5. Reconcile existing orders and stock before enabling checkout. Existing orders default to `inventory_state=legacy` and cannot enter the new fulfillment/cancellation flow automatically. Do not relabel them `reserved` without a complete physical-stock reservation ledger. Check existing duplicate PaymentIntent IDs, negative stock, and invalid bundle quantities before installing constraints. Existing paid orders must not be charged again.

## Runtime configuration

- Run on supported Node 22.17+ or the tested compatible deployment runtime. `APP_ENV=staging` uses Stripe test keys with `NODE_ENV=production`; `APP_ENV=production` requires live Stripe keys and HTTPS storefront URLs. Mock payment is disabled whenever `NODE_ENV=production`.
- Use HTTPS for the production-build staging browser test too. The tested Clerk development handshake sets SameSite=None cookies which Chrome rejects without Secure on HTTP; matching keys alone do not make an HTTP preview valid.
- Set independent random values of at least 32 characters for `ADMIN_SESSION_SECRET`, `ADMIN_MFA_ENCRYPTION_KEY`, `ORDER_TOKEN_SECRET`, `REALTIME_SECRET`, and `MAINTENANCE_SECRET`. Never reuse values. Supply real provider configuration; example values are not deployment credentials. Keep existing session secret available when decrypting older MFA records, then re-enroll/migrate deliberately before rotating it.
- Set a temporary `ADMIN_BOOTSTRAP_TOKEN` only for initial super-admin provisioning, pass it on the setup form, and remove it afterwards. Production admin sessions without MFA can only enroll; previous sessions lacking MFA proof must sign in again. Idle sessions expire after 30 minutes.
- Configure a scheduler to POST `/api/maintenance/orders` every minute using `Authorization: Bearer <MAINTENANCE_SECRET>` from a secret store. It processes at most 25 expired reservations and 10 email jobs per run. Alert on failed responses, old reservations and unsent email backlog. Provider cancellation must finish before releasing stock; failures intentionally retain the reservation for retry.
- Only set `TRUSTED_PROXY=cloudflare` when the origin cannot be reached directly and Cloudflare overwrites incoming client-IP headers. Otherwise unverified requests share an `unknown` rate-limit bucket. Add ingress/WAF limits to prevent traffic from reaching Node/DB; process-local limits are not a distributed perimeter.
- Configure and test Stripe/Clerk webhook delivery and retries at the actual HTTPS endpoint. Local signature tests do not prove external webhook routing. Email jobs retry with provider idempotency, but delivery beyond the provider's idempotency retention still needs reconciliation.

## Financial and media operations

- Manual status updates cannot mark payments paid/refunded. A paid order cannot use unpaid cancellation/restocking. Refunds and legacy orders require a provider-backed reconciliation workflow; the existing status dropdown is not a refund API.
- Product images retain their stored Cloudinary identity when product metadata changes. Client public IDs/URLs cannot replace ownership. DB changes commit before deletion of existing assets. Provider cleanup is best effort; failed cleanup can leave orphaned public product assets and must be reconciled.
- Review uploads require byte-format validation, an active customer, quota, ownership record and explicit moderation approval. Pending/unknown moderation is rejected. Existing review assets need ownership backfill before reuse through the new submission flow.

## Verification commands

Run `pnpm test`, `pnpm lint`, `pnpm build`, and then `pnpm typecheck`. Do not run standalone typecheck concurrently with Next build: build rewrites `.next/types`.

`pnpm verify` and `pnpm verify:stripe` now create a random isolated schema, apply the registered migration journal, exercise concurrency and clean up. They require explicit `ALLOW_ISOLATED_SECURITY_TESTS=true`; Stripe verification rejects live keys and refunds only its own test intent. Emails use a sink. Run only against an authorized test project. Read the result JSON and require both `cleanup` and `stripeCleanup` to be true; if the process is interrupted, reconcile its recorded run and test payment before retrying.

Legacy shared-fixture verification loops are retired. Stateful Playwright requires an explicitly provisioned disposable `TEST_DATABASE_URL`, `TEST_DATABASE_DISPOSABLE=true`, no Resend key and no Stripe live key. It refuses occupied port 3005. Its old fixture lifecycle is not a replacement for the isolated integration suite.

## Remaining deployment gates

- Cloudflare hosting adapter, large 3D asset delivery and real Workers compatibility have not been proven. SSE currently uses per-process clients/version and requires a shared delivery mechanism for reliable multi-instance operation.
- Complete actual browser checkout with Clerk, Stripe Elements/PromptPay, Cloudinary and 3D under the new CSP, including mobile/remount and external webhook retries.
- Run the changed CI in GitHub and configure required branch checks. CodeQL/Gitleaks configuration is not an executed scan. Previously leaked Git history may correctly keep Gitleaks red until separately remediated.
- Configure monitoring, alert ownership, reservation/email recovery, backup retention and a measured restore drill. Do not open real payments until these gates and the schema/credential steps above are complete.
