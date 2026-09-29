# South Aero security harness — handoff for the next AI agent

> **Latest verified result, 2026-09-29:** Combined run `security_test_88f9013e9fdf487da10381de05ce2697` completed with **477 PASS / 0 FAIL / 0 BLOCKED / 0 UNIMPLEMENTED**, exit **0**. All seven targets completed, all 74 recorded source hashes matched, 94/94 owned Stripe test payments were refunded, and random schema/server/four Clerk fixture groups were cleaned. The owner authorized customer notes; all three T-16 cases now pass through actual checkout, customer/admin pages and both email templates. See [the current feature/build report and verification links](docs/security/handoff/2026-09-29/customer-notes-and-build.md). Both apps built; all 37 Turbopack pages and the latest checks of 10 production routes passed. Migrations 0004/0005 were applied to the already-authorized development/test application's public schema with existing rows preserved; security tests still use random schemas and the localhost email sink. Coupon remains excluded. Older sections below are historical, including the former T-16 scope question.

Snapshot date: **2026-09-26, Asia/Bangkok**. This file transfers the task without requiring the original chat. Read the actual code and referenced results before changing anything; earlier reports are historical evidence, not a guarantee that a different machine will reproduce them.

> **Continuation update, 2026-09-29:** Read [the current continuation report](docs/security/handoff/2026-09-29/full-security-continuation.md) first. Latest completed combined run `security_test_0450b5ecb4914583b879e060b7c59124`: **474 PASS / 0 FAIL / 3 BLOCKED / 0 UNIMPLEMENTED**, denominator 477. All seven selected targets completed, all 58 recorded source hashes matched, all 94 owned Stripe test payments were refunded, and schema/server/Clerk cleanup succeeded. Guest HTTPS cookies/rate limiting, Admin, Checkout races, Webhooks and isolated API resource observations passed in this one run. Only three T-16 order-note rendering cases await an explicit scope decision because that feature is absent; the gate correctly exits 1. Migration 0004 is tested only in temporary schemas. The owner approved 413 for oversized actions; Coupon remains outside scope. All 806 transfer hashes matched before edits and the laptop actually reproduced 153/0/324/0; the [migration report](docs/security/handoff/2026-09-27/new-machine-and-guest.md) records that evidence. Original transfer manifest unchanged; use pinned pnpm 9.7.0. Sections below are the historical snapshot, not the latest implementation state.

## 1. User objective and decisions

Continue adversarial security testing of the existing South Aero e-commerce monorepo: Next.js 15, Drizzle/Neon PostgreSQL, Stripe, Clerk and Resend. The original matrix covers numerical/monetary boundaries, malformed types/structures, Unicode/injection, authentication/ownership, webhooks, error redaction and side effects.

The owner explicitly requested implementation and testing, and confirmed in the previous task:

- There is no production deployment yet; the application runs locally.
- The connected DB is intended for eventual production, but **currently contains disposable test data**. The owner authorized modifications to this development data. The harness still creates a separate random schema per run and cleans only its own fixtures.
- Stripe is in test mode. Keep all payment tests in test mode.
- **Coupon is out of scope** because the customer has no plan to use it. N-26/N-27, 13 variants, were removed from the active denominator; they were not marked PASS. Do not restore coupon support as part of this work.
- Continue routine implementation and testing within the existing authorization. Ask for user input only when a genuinely new prerequisite or decision cannot be resolved from the project.

This records authorization for the described development environment, not permission to modify a future production system. Inspect effective configuration without printing secrets before any DB/provider run. Keep temporary-schema isolation, test credentials and local email capture. Do not disable guards to obtain green results, deploy, or send external email as a consequence of this handoff.

## 2. Repository and migration facts

Old Git root: `C:\Users\thana\south_aero_project\South-aeropart`.

Old application workspace: `South-aeropart/southaeropart_project`. All relative links and commands below are relative to **southaeropart_project**, unless stated otherwise. Resolve the new workspace path rather than hardcoding the old Windows username.

HEAD at handoff: `8d4101a`. **The working tree has substantial modified and untracked work, including this harness and unrelated UI work.** HEAD alone does not represent the tested source. A fresh clone alone is insufficient. Preserve the complete working tree, parent `.git`, project `.agents/skills`, assets, docs, lockfile and audit artifacts. Do not reset, clean, stash away, overwrite, or commit unrelated edits merely to simplify the test work.

The current test work is on the ordinary working tree, not a separate completed PR. No commit/push/deployment was performed for this handoff. The user is moving computers; do not assume the old chat, account login state, user-global skills, plugins or dependency junctions move with the repository.

Read [the move checklist](MOVE-TO-NEW-LAPTOP.md). The generated [transfer manifest](docs/security/handoff/2026-09-26/transfer-manifest.json) records SHA-256 hashes of Git-visible project files in the working tree, excluding secrets and the manifest itself. Check it before new edits. It is an integrity inventory, not a backup of file contents, Git history, ignored assets or credentials. A `missingAtSnapshot` entry describes an already-absent tracked path, not a transfer failure.

## 3. Read these first

1. [CLAUDE.md](CLAUDE.md), especially sections 5 and 6.
2. Relevant local skills: [testing](.agents/skills/south-aero-testing/SKILL.md), [secure review](.agents/skills/secure-review/SKILL.md); auth, commerce, database, payments and feature skills as the next changes require.
3. [Harness README](packages/security-harness/README.md) and [integration setup](packages/security-harness/INTEGRATION-SETUP.md).
4. [Corpus](docs/security/fuzz-matrix-2026-09-24/corpus.json), its schema and recipe definitions in the same directory/package.
5. The latest verified manifest below, then the native runner and relevant application actions.

The handoff is task context, not a reason to ignore more recent user instructions or repository changes.

## 4. Verified state — do not mix evidence layers

Latest verified combined run:

`security_test_3ed506de659543c0b2d42544b720a20a`

- [Manifest](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/coverage-manifest.json): **477 total; 153 PASS / 0 FAIL / 324 BLOCKED / 0 UNIMPLEMENTED**.
- [Run metadata](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/execution.json): both `cart.add` and `inventory.delta` completed against Next.js development servers.
- [Request byte counts/digests](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/requests.json).
- [Cleanup](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/cleanup.json): schema dropped, owned servers stopped. Temporary sessions/orders/products no longer exist; the runner recreates them.

The 153 passes comprise 73 offline observations plus **70 Cart and 10 Inventory native HTTP passes from that one run**. Native Cart compares business-table fingerprints before/after every request. Inventory checks actual stock, exact request delta, audit actor/metadata and returned DTO. Cart is currently a stateless validator/DTO action, not a persisted cart/catalog-availability check.

Separate supplemental tests, not added to the 477 denominator:

- [11 real inventory session checks passed](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/inventory-sessions.json): anonymous, staff, expired, revoked, inactive account, idle timeout, wrong hash, invalid JWT signature, downgrade to staff after a working session, admin, super_admin. These use generated JWTs plus real session rows; they do not exercise password login or production MFA.
- [Shipment email check passed](docs/security/fuzz-matrix-2026-09-24/artifacts/native/security_test_3ed506de659543c0b2d42544b720a20a/email-sink.json): actual DB read, actual template and actual Resend SDK deliver one request to a localhost sink. Stored malicious text stays escaped in rendered Chromium HTML. No external delivery. This is not an actual mail-client execution test or proof of all order/email flows.
- [Earlier DB/Stripe integration](audit/2026-09-25/security_test_c8ae663fbd8745afbbbbaf6b950306d4.json): 25 checks passed, including inventory boundaries, audit failure rollback, concurrent adjustments with a barrier, reservations and Stripe binding/fulfillment/idempotency. Test-payment cleanup succeeded. That suite called services/handlers directly and disabled email; it did not prove native HTTP or email delivery.
- Latest harness regression: **68/68**, harness typecheck and changed-file ESLint passed. Production-mode native invocation was rejected before runtime initialization. No production-build/readiness conclusion follows.

The [offline manifest](docs/security/fuzz-matrix-2026-09-24/artifacts/coverage-manifest.json) remains **73 PASS / 0 FAIL / 404 BLOCKED / 0 UNIMPLEMENTED**. This is expected: offline execution cannot replace native observations. Keep native reports separate. The strict gate exits **1** while any case is blocked/unimplemented/failed; do not turn exit 1 into success just because the selected native targets passed.

Some remaining entries inherit generic messages such as “authorization missing” or “no sink registered” from offline adapters. The owner already authorized development tests and the native runner already has a sink. The missing work is wiring those other adapters/observers to the native runtime, not asking again for the same permission or assuming credentials are absent.

## 5. Code already implemented

- [Native CLI](packages/security-harness/src/cli/native.ts): default Cart + Inventory; `--cart` or `--inventory` selects one. Combines actual observations with the offline manifest, records supplemental checks separately, cleans runtime in `finally`.
- [Runtime](packages/security-harness/src/integration/native-runtime.ts): preflight before DB/provider clients; root `.env`; random schema with actual migrations; copied apps with test-only callers; generated admin sessions; real browser; localhost email HTTP server; cleanup. No production test route was added to application source.
- [Transport](packages/security-harness/src/integration/native-action.ts): observe the real Next-generated Action ID/envelope, identify the requested action among background profile/session calls, forward real HTTP with `route.fetch`, retain response bytes before React refresh, then fulfill the browser request with that response. Raw integer digits are not parsed through JS Number. Raw replacement supports observed single-argument JSON envelopes only.
- [DB observer](packages/security-harness/src/integration/db-observer.ts), [session checks](packages/security-harness/src/integration/inventory-sessions.ts), [email sink check](packages/security-harness/src/integration/email-sink.ts).
- [Playwright type bridge](e2e/security-browser.ts): uses the installed e2e workspace dependency; do not remove it without replacing module/type resolution correctly.
- [Inventory action](apps/admin/actions/inventory.actions.ts), [Drizzle repository](apps/admin/lib/inventory-repository.ts), [shared command](packages/lib/src/inventory-adjustment.ts): admin/super_admin, strict UUID/nonzero integer delta, stock 0..2147483647, single-product only, row lock plus conditional stock update, transactional audit, post-commit cache/realtime handling. Each delta request is a new adjustment; there is no idempotency key. Do not blindly retry an uncertain adjustment.
- [Cart action](apps/storefront/actions/cart.actions.ts): strict input and generic validation response, rejects extra fields.
- [Stripe/money helper](packages/lib/src/stripe.ts): decimal-safe conversion using BigInt; separate 39-test monetary regression passed previously.
- [HTML escaping](packages/lib/src/html.ts), [shipment template](apps/admin/lib/shipment-email.ts), [receipt template](apps/storefront/lib/order-email.ts): escaping fixes; mocked-template diagnostic suite had 3 passing tests, with later actual shipment sink evidence above.
- [Isolated DB/Stripe runner](apps/storefront/scripts/verify-security-integration.ts) and [inventory checks](apps/storefront/scripts/security-inventory-checks.ts). Legacy `verify_loop.ts` / `verify_stripe_loop.ts` are disabled entry points; do not resurrect their old behavior.

## 6. Remaining 324 variants and next steps

Recommended order: **Guest → Admin Product → Checkout → Webhook → Amount/API/resource gaps**. Build on the existing runner, preserve truthful per-variant results, then repair real application failures with regression coverage.

1. **Guest Tracking — 41**: seed owned guest orders and customer A/B fixtures; bind the real `getOrderDetails` / `getOrderStatus` two-argument APIs. Re-mint fixture tokens with the per-run secret while preserving each intended mutation. Add a controlled application clock for exact expiry bounds and test wrong owner/missing/wrong/expired/nonexistent order responses and DTO privacy. Real customer ownership tests still need Clerk test-user sessions A/B; none were created in the verified native run. Inspect `apps/storefront/lib/guest-order-token.ts` carefully: the last read found HMAC comparison without server-side TTL enforcement. Treat that as a point to investigate and test, not a proven native finding or already-fixed control. Cookie maxAge is not proof of server token expiry.
2. **Admin Product — 102**: bind create/update actions, seed collision-free fixtures without altering the mutated field, use admin/staff sessions and DB before/after evidence. Check SKU/price/stock bounds, unknown fields, response redaction, parameterized text persistence, actual rendering for XSS, prototype state, and resource budgets. Re-read existing changes in `product.actions.ts`; create/update role/error handling were not uniform at the last inspection. Do not invent observed statuses or weaken the corpus merely to match current errors.
3. **Checkout — 70**: bind real order creation with seeded prices/stock and Clerk customer sessions where required. Prove authoritative totals/ownership, safe rejection, reservation effects, simultaneous last-stock contention and retry outcomes. Add actual Stripe write observation/cleanup and email counts. Guest rate limits must not silently mask intended validation scenarios; preserve and test the rate limit rather than disabling it globally.
4. **Stripe Webhook — 94**: forward exact raw bytes to the real HTTP route; use the run's webhook secret and owned Stripe test intents/orders. Re-sign final valid fixtures but preserve intentionally corrupted payload/signature combinations. Add clocks, sequential/concurrent duplicates, different event IDs for one payment, ordering, binding mismatches, real fault injection, recovery and DB/provider/email readbacks. Calling the handler or SDK verifier directly is not native HTTP evidence.
5. **Amount calculation — 3**: bind real order arithmetic. The remaining calculation adapter is absent; validating a different object shape cannot prove totals. Review the proposed discount-related case against the explicit coupon deferral before implementing any feature; do not add coupon functionality to satisfy a test.
6. **API JSON — 14**: identify the actual application endpoint/contract before binding. Missing evidence includes resource limits, inert text and process prototype integrity. Measure UTF-8 bytes, real ingress behavior, time/RSS with a watchdog, and before/after prototype state in the process that handles input. Some cases are proposed contracts and may need a user scope decision if no real surface exists; keep that distinction visible instead of inventing a production endpoint or marking PASS.

Cross-cutting pitfalls:

- Next handled Server Actions commonly return HTTP 200 with semantic errors. Record actual wire status separately from semantic status/error code.
- Use `localhost` consistently for Next's listener and browser URL. Mixing `127.0.0.1` with Clerk's localhost rewrite caused internal looping/rate limiting. The readiness fetch must use manual redirects; let the browser complete Clerk's development handshake.
- Background layout actions share the probe URL; matching only a POST or `next-action` header captures unrelated requests. Preserve the action-ID selection logic.
- Browser response bodies can disappear during navigation/refresh. Preserve the transport's early real-response capture.
- `RESEND_BASE_URL` directs the installed SDK to the real local sink. A fake API key alone does not provide capture. Do not send to real recipients.
- Never turn missing DB/provider/clock/resource evidence into zero side effects or a true invariant. Keep BLOCKED when genuinely unmeasured. A tested mismatch may be FAIL without being a demonstrated exploit; identify proposed-contract differences explicitly.
- Freeze/recompute evidence for a single run; do not merge unrelated old run totals into a claim of fresh coverage. Failed bootstrap artifacts also exist; use the exact verified run above as the baseline.

## 7. New-machine setup and verification

Project `package.json` specifies Node **>=22.17.0 <25**, pnpm **9.7.0**. The old successful environment used Node 22.17.1; this is a historical observation, not a request to downgrade an updated supported runtime. Install dependencies afresh on the destination so symlinks/native binaries do not point to the old machine.

From `southaeropart_project`:

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm --filter @repo/security-harness validate
pnpm --filter @repo/security-harness test
pnpm --filter @repo/security-harness typecheck
```

Use the lockfile; if installation fails, diagnose the actual error instead of upgrading dependencies or regenerating the lockfile casually. These commands have not been run on the new laptop yet.

Transfer root `.env` separately and privately to `southaeropart_project/.env`. Read `.env.example` for required names; do not dump values into chat or commit them. Native preflight requires the owner-authorized development DB, Stripe `sk_test_...`, Clerk `sk_test_...`, and corresponding app configuration. It generates temporary admin/order/webhook secrets and overrides email configuration inside child processes. No admin/customer password is required for the already-supported inventory/session tests. Clerk A/B setup for the remaining work is a separate task.

The native runner uses Playwright from `e2e` and defaults to installed Microsoft Edge (`msedge`). Check that browser availability on the destination; use `PLAYWRIGHT_CHANNEL` only for an installed supported channel. The old Windows sandbox required elevated tool permission to read dependency junctions in some runs; that is a host tool limitation, not a reason to weaken application security.

After environment inspection, reproduce the current native baseline:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
pnpm --filter @repo/security-harness native
```

Expected baseline is 153/0/324/0 **only when the same source and assumptions reproduce**. Inspect new artifacts and cleanup before accepting it. Exit 1 remains expected while the full corpus has gaps. Do not fabricate a successful rerun if networking, browser, credentials or dependency setup is blocked.

Fallback if the pnpm launcher fails but dependencies are correctly installed:

```powershell
Set-Location packages/security-harness
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
node node_modules/tsx/dist/cli.mjs src/cli/native.ts
```

The separate `pnpm verify:stripe` mutates the isolated test DB and creates/refunds a Stripe test payment. Read its script and existing setup instructions before execution; it is not a read-only health check. Do not run `db:push` or migrations against the shared public schema to prepare the native runner; it creates its own schema from the migration journal.

## 8. Expected first agent response/action on the new machine

Report whether transferred source and evidence are present, whether dependency/env/browser setup is usable, and which baseline commands actually ran. Then implement the next Guest milestone, preserving other working-tree edits. Keep handoff/status docs and per-run evidence current. Report PASS/FAIL/BLOCKED by actual observations and state the exact next dependency when blocked. Ask the owner for specific missing configuration only if it cannot be resolved with the transferred project and already-granted development scope.

This handoff stores context in the project deliberately; it does not promise chat-history synchronization. OpenAI's [long-task guidance](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex) describes keeping durable specifications, constraints and status in repository Markdown files so work can be resumed.
