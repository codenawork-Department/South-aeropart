# New-machine verification and Guest Tracking

Work started 2026-09-27 and continued 2026-09-28, Asia/Bangkok. This is development-test evidence, not production readiness. Coupon remains outside the 477-variant corpus.

## Transfer and toolchain

- [Transfer verification](transfer-verification.json): all **806 files** matched their original SHA-256 hashes before application edits; none missing. HEAD is `8d4101a9d6a3e9eb03381694be5ba5400cdcda77`.
- Existing modified/untracked application, UI, harness, docs and audit work was retained. No reset, clean, stash, commit, push or deployment was performed. The original transfer manifest is unchanged; intentional edits since verification must not be confused with a failed transfer.
- Node **22.23.2** satisfies `>=22.17.0 <25`. The default Codex `pnpm` launcher reports **11.25.0**, so commands use **pnpm 9.7.0** through the pinned npm invocation below. No global package-manager replacement was made.
- `pnpm install --frozen-lockfile` succeeded. A forced reinstall populated the supported dependencies but stalled on optional `@turbo/linux-arm64`, which is inapplicable to Windows. Only that task's installer was stopped, and the normal frozen install completed again. Neither `package.json` nor `pnpm-lock.yaml` changed from the transfer snapshot. Actual native compilation, tests and Edge execution subsequently succeeded.
- Microsoft Edge headless was exercised. Root `.env` is present; no credential values are recorded. Neon migrations/reads/writes ran inside random schemas. Clerk test users/sessions were created and cleaned. [Stripe read-only preflight](stripe-preflight.json) authenticated successfully and returned `livemode=false`; it did not create payments or expose balances.

## Reproduced baseline before Guest fixes

Run: `security_test_dd1ff7f5713647b4afcc033631947e1f`.

- [Manifest](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_dd1ff7f5713647b4afcc033631947e1f/coverage-manifest.json): **153 PASS / 0 FAIL / 324 BLOCKED / 0 UNIMPLEMENTED**, total 477.
- [Execution](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_dd1ff7f5713647b4afcc033631947e1f/execution.json): Cart and Inventory completed on the new machine.
- Inventory session checks **11/11** and actual shipment-template/Resend localhost sink check passed; one sink message, no external delivery.
- [Cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_dd1ff7f5713647b4afcc033631947e1f/cleanup.json): schema dropped, owned servers stopped.
- Corpus validation passed **102 groups**; original harness regression **68/68** and harness typecheck passed.

Exit 1 is the strict coverage gate, not a successful full security suite. The baseline was measured here; it was not inferred from the old laptop's artifacts.

## Guest findings and repairs

[Pre-fix Guest run](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_d96c38ac6f8040aba8ae3e9aea6468aa/guest-tracking.json) recorded 33 failing Guest variants and 8 blocked. Its overall 73/33/371/0 summary contains offline evidence plus Guest only, not a new Cart/Inventory run.

1. **Server expiry:** both real tracking actions accepted matching signatures for orders at/after the proposed seven-day TTL. Seven additional unit assertions also failed before repair. `verifyGuestOrderToken` now rejects future/invalid dates and age `>= 604800000 ms`, as well as malformed tokens, before comparing HMACs. Signing remains bound to the persisted order ID, owner and creation time. Cookie lifetime alone is not relied on.
2. **Denial/validation contract:** malformed order IDs now return `INVALID_INPUT` / `Invalid request`. Missing, wrong, expired and non-owner credentials and a well-formed nonexistent order return the same `NOT_FOUND` / `Resource not found` shape. The existing string `error` remains compatible with callers; `code` is explicit. Malformed explicit tokens cannot silently fall back to a valid cookie.
3. **DTO privacy:** details now use an explicit projection. Owner/admin IDs, reservation internals, unrecognized future columns and internal history notes/actors are excluded. Nested addresses are projected too. Existing receipt/recovery payment references and authorized shipping/billing data remain. Four client prop types were narrowed without replacing their UI work.
4. **Native binding:** each Guest variant invokes both real positional actions, `getOrderDetails(orderId, token?)` and `getOrderStatus(orderId, token?)`; both must satisfy the variant for one PASS. Tokens are re-minted with the run secret before the requested mutation. Omitted, null and cookie-only arguments remain distinct. Business-table fingerprints and local sink counts are measured around requests; unobserved provider counts stay null.
5. **Clock and ownership:** only the copied app's `order-token-clock.ts` module is replaced with a fixed clock and read back through a test-only probe. There is no production clock flag or session-clock override. Clerk test customers A/B each have a positive owner control for both actions, followed by cross-owner denial. This uses Clerk's [documented test-session flow](https://clerk.com/docs/guides/development/testing/overview); it does not prove OAuth login or production MFA.

## Verified combined result

Run: `security_test_215742844f5240fbbb5ba05edd0db7d5`.

[Manifest](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_215742844f5240fbbb5ba05edd0db7d5/coverage-manifest.json): **186 PASS / 1 FAIL / 290 BLOCKED / 0 UNIMPLEMENTED** in one run.

This is 73 offline passes + 70 Cart + 10 Inventory + **33 Guest passes**. [Guest evidence](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_215742844f5240fbbb5ba05edd0db7d5/guest-tracking.json) preserves results for both actions, four successful Clerk owner controls, and Clerk cleanup. Inventory sessions and shipment sink passed again. [Runtime cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_215742844f5240fbbb5ba05edd0db7d5/cleanup.json) succeeded.

### The remaining Guest FAIL is a contract mismatch at the framework boundary

`G-08 / len_1048576_fill_a`: the observed native request is **1,048,619 UTF-8 bytes**, including the positional envelope. Both actions receive wire **500** from the React/Next decoder instead of the corpus's expected wire 200 with semantic 404. No business-table mutation or local email was observed; there was no detected secret/PII marker leak. Both actions stayed inside the configured per-request resource budget in this run; sampled peak RSS growth was 74.88 MiB / 27.12 MiB and observation duration 875.70 ms / 201.99 ms (details/status). This does not change the response-contract failure. This is not evidence of a demonstrated ownership bypass or resource-exhaustion exploit.

Inspection of the installed Next **15.5.24** bundled `react-server-dom-webpack-server.node.development.js` shows `createResponse` defaults `_arraySizeLimit` to `1e6`; `parseModelString` counts string length toward that budget. The thrown message is `Maximum array nesting exceeded`. This is separate from the app's `serverActions.bodySizeLimit: "4mb"`; the [Next body-size setting](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) does not itself remove the decoder guard. Dependencies/guards/corpus expectations were not relaxed to make this PASS. A future framework/contract resolution must retain request protection and repeat resource measurements.

### Native resource observations

The new `resourceChecks` in Guest evidence contain the real request byte count, JSON container depth, receiving server PID, monotonic duration, baseline RSS, sampled peak RSS, peak growth and sampling gaps. A preload in the disposable app starts a separate worker thread; it samples whole-process RSS every 10 ms and terminates only its own process on the 5,000 ms / 256 MiB growth budget. The runner confirms the receiving process PID before and after each request. No watchdog endpoint or runtime flag was added to production application code. Node documents that [RSS in a worker describes the entire process](https://nodejs.org/api/process.html#processmemoryusage).

The native request is forwarded only after the watchdog acknowledges arming, and the complete HTTP response is captured before disarming. The warmed baseline includes Next development-server overhead and the observer itself. Regression proves actual child RSS measurement, memory-budget termination and time-budget termination even while the child main event loop is blocked.

| Input | Action | Wire bytes / JSON depth | Observation ms | Sampled peak growth MiB | Result |
|---|---|---|---:|---:|---|
| 10 KiB | Details | 10,283 / 1 | 155.64 | 0.73 | PASS |
| 10 KiB | Status | 10,283 / 1 | 155.43 | 0.76 | PASS |
| 1 MiB | Details | 1,048,619 / 1 | 875.70 | 74.88 | Resource budget passed; response contract FAIL |
| 1 MiB | Status | 1,048,619 / 1 | 201.99 | 27.12 | Resource budget passed; response contract FAIL |

Observed sample gaps were at most 16.39 ms. These are sampled peaks for the receiving process, not a continuous allocation trace, aggregate process-tree memory limit, concurrency/load test or production resource guarantee. Absolute sampled RSS reached approximately 1.56 GiB in the development server; the proposed corpus limit is **growth per request**, not an absolute 256 MiB cap. The remaining framework error was not converted to PASS. The earlier `security_test_f288d1ff48e4456b8270aeb869eb0219` run remains historical 185/1/291/0 evidence without this resource observer.

### Seven Guest variants remain BLOCKED

| Case | Count | Evidence still needed |
|---|---:|---|
| G-03 cookie-only | 1 | Valid cookie access works on development HTTP, but actual cookie issuance and flags under production-like TLS are not measured. The harness-installed cookie does not prove issuance. |
| G-07 invalid/out-of-range DB timestamps | 2 | PostgreSQL cannot store these fixtures. Pure verifier rejection is tested separately; the native action cases require a justified fixture/validator seam. |
| G-09 object-only extra fields | 3 | The production APIs are positional. No proposed object adapter was invented or silently stripped by the harness. |
| A-04 Guest rate limit | 1 | No action-specific policy/exhaustion/Retry-After fixture is registered. Existing page middleware limits are a different contract. |

The other **283 BLOCKED** are Admin Product 102, Checkout 70, Webhook 94, Amount 3 and API/resource 14. These remain implementation/measurement work, not a reason to ask again for the recorded development-test authorization. Next broad milestone is Admin Product after the remaining Guest contract/resource decisions are tracked.

## Regression and limits

- Guest token + DTO regression: **27/27**. Harness regression after fixture, cleanup and watchdog tests: **84/84**. Harness and storefront typecheck passed.
- Changed-file ESLint: zero errors; the existing invoice `<img>` warning remains. Linting harness files with the explicit storefront config also emits a React auto-detection warning; no React runtime is added to the harness for this.
- The new Clerk cleanup guard confirms provider deletion acknowledgement. An uncertain create is never retried or labeled clean: its run-owned external ID is preserved in ignored `.security-runs/<runId>/clerk-fixtures.json` for reconciliation, and the run fails. Regression covers setup failure, uncertain creation and live-key rejection.
- `git diff --check` passed after removing trailing blank lines in the edited token test. Unrelated transferred source remained hash-identical; no transfer file was deleted.
- New runs record selected security-source SHA-256 digests in `execution.json`. This records the modified working tree, not merely HEAD.
- No production build/TLS/CSP, external email client, corpus-wide resource verification, password/OAuth login, or new Stripe payment/refund integration was asserted. The historical 25-check DB/Stripe suite was not rerun; Stripe connectivity was checked read-only.

## Replay on this machine

Run from `southaeropart_project` in PowerShell. Use the pinned launcher because the default `pnpm` resolves to a different version in Codex:

```powershell
npm exec --yes --package=pnpm@9.7.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@9.7.0 -- pnpm --filter @repo/security-harness validate
npm exec --yes --package=pnpm@9.7.0 -- pnpm --filter @repo/security-harness test
npm exec --yes --package=pnpm@9.7.0 -- pnpm --filter @repo/security-harness typecheck
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
npm exec --yes --package=pnpm@9.7.0 -- pnpm --filter @repo/security-harness native --with-guest
```

`native` without flags retains the Cart/Inventory baseline; `--guest` selects Guest alone. Do not add its passes to a different run. `--with-guest` produces the combined report. The strict gate remains exit 1 while FAIL/BLOCKED exists. The installed CLI fallback in the original handoff also remains available.
