# Security continuation — 29 September 2026, Bangkok

> Historical milestone. The owner subsequently authorized customer notes, and the new combined run passed 477/0/0/0. Read [customer notes and build verification](customer-notes-and-build.md) for the latest implementation, development migrations and verified result. Counts and the scope question below describe this earlier run and are preserved as evidence.

This report supersedes the 186 PASS / 1 FAIL / 290 BLOCKED milestone for the work described below. The original 806-file transfer manifest and historical reports remain unchanged. Existing modified/untracked UI and security work was preserved; no reset, clean, stash, commit, push or deployment was performed.

## Latest verified combined result

The completed `native --all` run **`security_test_0450b5ecb4914583b879e060b7c59124`** records **474 PASS / 0 FAIL / 3 BLOCKED / 0 UNIMPLEMENTED**, denominator **477**. It finished on 29 September 2026 at 00:38:57 Bangkok time (28 September 17:38:57 UTC), taking 20 minutes 36 seconds. All seven selected targets completed. [Manifest](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_0450b5ecb4914583b879e060b7c59124/coverage-manifest.json), [execution](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_0450b5ecb4914583b879e060b7c59124/execution.json), [final verification](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_0450b5ecb4914583b879e060b7c59124/verification.json).

| Evidence in this one run | PASS | BLOCKED |
| --- | ---: | ---: |
| Inventory, native action | 10 | 0 |
| Cart, native action | 70 | 0 |
| Guest Tracking, both real read actions | 41 | 0 |
| Admin Product, both real create/update actions | 102 | 0 |
| Checkout, including simultaneous stock races | 70 | 0 |
| Stripe Webhook, actual HTTP route | 94 | 0 |
| API JSON, isolated native HTTP parser observations | 11 | 0 |
| Offline validators, parsers and arithmetic | 76 | 0 |
| T-16 order-note rendering, absent feature | 0 | 3 |
| **Total** | **474** | **3** |

The 474 passes contain **398 native observations** (including 11 isolated parser-contract cases) and **76 offline observations**; they are not 474 browser end-to-end tests. Supplemental checks also passed: 11 real inventory sessions, 32 Admin page/email rendering checks, both single-product/shared-bundle stock races, shipment email capture, and production HTTPS guest-cookie issuance and cookie-only reads. These supplemental checks do not inflate the denominator.

All **58 recorded source digests** still matched the working tree after completion. The random schema was dropped, owned servers stopped, and all three Clerk fixture groups cleaned up. All **94 owned Stripe test payments were refunded**. [Runtime cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_0450b5ecb4914583b879e060b7c59124/cleanup.json), [Stripe cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_0450b5ecb4914583b879e060b7c59124/stripe-cleanup.json). An exact-value scan of all 15 generated public artifact files found zero matches for the 12 configured secret values checked; values and private provider identifiers were not added to this report.

The process correctly exited **1**, because all three T-16 rendering invariants remain unmeasured. This is not a completely green security gate. The ignored log is `.security-runs/combined-all.log`; the final artifacts above are the durable evidence.

## Earlier diagnostic runs

The preceding combined run `security_test_2adbaaca1e6f4a0e8bdf26d66b8491fa` recorded **379 PASS / 1 FAIL / 97 BLOCKED / 0 UNIMPLEMENTED**. Its Admin hydration failure is repaired and passed in the latest combined run. [Historical manifest](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_2adbaaca1e6f4a0e8bdf26d66b8491fa/coverage-manifest.json).

Independent diagnostic runs below are historical evidence and must **not** be added to the latest combined count:

- `security_test_2f0e5f13cd884ce8992236938e427a43`: all 11 selected Admin text/XSS variants passed both real create/update actions; **22 actual page-rendering checks passed** after the hydration repair. Its full-matrix summary is 87/0/390/0 because other native targets were not selected.
- `security_test_779165435f1947629f955a0bfc92d165`: **all 94 Webhook variants passed** through the actual Next HTTP route; its full-matrix summary is 170/0/307/0. [Webhook observations](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_779165435f1947629f955a0bfc92d165/webhook.json). All **94 owned Stripe test payments were refunded**, and schema/server cleanup succeeded. [Provider cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_779165435f1947629f955a0bfc92d165/stripe-cleanup.json).
- `security_test_b1dfa21c60fd43039eeef3b08f0a151b`: actual simultaneous final-stock checkout passed for a single product and two bundles sharing one physical part. Two real transactions reached a PostgreSQL barrier before release; exactly one order/reservation succeeded, the other returned generic CONFLICT, stock remained zero.
- `security_test_3e5acf8dd2714a71b6610eff76e5b43e`: production storefront build, real guest checkout cookie issuance and cookie-only reads passed over loopback HTTPS. This proof also ran inside the combined run above.

## Approved contract change

The owner explicitly approved **HTTP 413 for oversized requests**. Only three 1 MiB action variants changed their expected outcome: G-08 `len_1048576_fill_a`, T-04 `len_1048576_fill_A`, T-06 `utf8_bytes_1048576`. Their invariants, payloads and the 477 denominator are unchanged. The original corpus/schema are archived under `../2026-09-28/before-ingress-corpus*.json`. Coupon remains outside scope.

The shared action ingress checks actual streamed bytes before React decoding: non-multipart action bodies are limited to 1,000,000 bytes, multipart to 4 MiB. Generic 413 responses replace the framework's old opaque 500. Untrusted origins and forged forwarded hosts return generic 403. The existing Next 4 MiB action configuration remains.

## Application changes and evidence

**Guest:** server TTL, generic denial, DTO privacy, strict object arguments with positional compatibility, real Clerk owner controls, persisted invalid/future date fixtures, rate-limit boundary/recovery, and actual cookie issuance. Cookie checks require Secure, HttpOnly, SameSite=Lax, path `/`, seven-day lifetime and no JavaScript access. Both order reads succeed with the issued cookie alone. The shared database rate counter allows 120 reads/minute; the Server Action envelope carries `retryAfter` seconds (it is not an HTTP Retry-After header). Payment polling respects that delay and avoids overlapping polls.

**Admin Product:** strict stock/decimal/text/unknown-field validation, create/update role enforcement, generic conflicts/errors, atomic rollback and successful recovery after a deferred database fault. Native tests check exact persisted values, audit rows, unchanged unrelated business tables, the real admin/storefront DOM, local shipment email and executable XSS markers. A remaining intermittent FAIL was reproduced as a language-tab click before hydration: neither Thai field was visible. Language buttons are now disabled until their handlers are mounted; all original text/XSS assertions remain. Partial observations are saved even if a later fixture fails.

**Checkout:** strict nested input, server catalog prices, exact BigInt satang calculations and merchant amount bounds; no coupon input or feature was added. Guest identity creation participates in the order transaction. Real concurrency exposed a lock-upgrade deadlock between order-item foreign keys and `FOR UPDATE` on products. `FOR NO KEY UPDATE` protects stock changes while remaining compatible with those key-share locks. Native last-stock and shared-bundle races now prove one success, one conflict and one physical reservation.

**Webhook:** bounded UTF-8 byte streaming, strict timestamp grammar with 300-second past / 30-second future policy, real SDK verification of exact bytes, validated event/payment shapes, prototype/duplicate-key rejection, and additive provider-field compatibility. Order lookup requires the persisted PaymentIntent binding; metadata only confirms that binding. Wrong amounts/currency/account/mode return generic 400 without fulfillment or business mutation. Successful fulfillment and durable event identity commit together. Row locks serialize duplicate deliveries; different event IDs for one intent do not repeat stock/payment/email effects. A failed payment event cannot regress a paid order.

Database commit faults yield opaque 500 and complete rollback; retry commits once. Email faults leave a durable pending email job; retry sends through the localhost sink with the same idempotency key. A confirmed payment without an active reservation creates one durable `payment_reconciliation_jobs` row in `pending_review`, with no blind fulfillment. **That is a queue for operator review, not an automatic refund workflow or proof that an operator resolved it.** Payment recovery callers no longer label such a queued result as paid.

Migration `packages/db/drizzle/0004_payment_webhook_evidence.sql` and its Drizzle snapshot add the event ledger and reconciliation queue. Tests apply migrations only to their random schemas. The shared/default application schema was not migrated and no deployment was performed.

**API JSON:** 11 previously blocked prototype/depth/body cases now have a separate process, real loopback HTTP/chunked delivery and the RSS/time watchdog. This remains the corpus's **isolated abstract parser contract**, not evidence for an invented production route. The same bounded parser is now used by the actual webhook.

## Remaining scope decision

T-16 has three accepted order-note variants requiring real page/email rendering. The customer order-note feature is absent. The owner has not answered the earlier choice between adding that feature and moving its cases to future scope. Keep all three **BLOCKED** and keep denominator 477 until that decision is explicit. Do not mark parser acceptance as rendering evidence or silently remove the cases.

## Environment, isolation and limits

The laptop previously matched all 806 transfer hashes and actually reproduced the old 153/0/324/0 baseline. Node 22.23.2, pinned pnpm 9.7.0, installed Next 15.5.24 and the real Edge browser are used. The default pnpm launcher remains 11.25.0; use the pinned invocation from the move report.

Every native run guards test configuration before clients, creates a random PostgreSQL schema, uses copied Next apps and run-owned identities, and cleans its own resources. Clerk fixture emails/external IDs now include a per-invocation nonce: Guest/Admin/Checkout in one run no longer collide. Each fixture group has its own private cleanup record. Stripe records contain only owned test identifiers; charge creation omits receipt email, and cleanup verifies run metadata before refunding. Server-side Stripe observations record only method/status, never credentials, headers or bodies. Resend uses a loopback sink, including injected failures; no external customer email is sent.

Production HTTPS cookie verification uses a 24-hour loopback certificate; no OS trust store or global TLS setting changes. Windows Next standalone packaging required a build-only symlink fallback to directory junctions/file copies inside the disposable build. Normal host symlink permissions have not been changed. The cookie-only production runtime uses isolated media credentials with Cloudinary transport explicitly denied; it does not verify media uploads/deletes. Dedicated realtime secrets are generated for that runtime.

Resource evidence records receiving process PID, actual request bytes, whole-process RSS growth, sample gaps and elapsed time. A separate worker terminates only its own test server if a request exceeds 5 seconds or 256 MiB growth. Successful compilation/tests do not certify all production deployment settings, login/MFA flows, media operations or eventual reconciliation.

## Commands and checks

From `packages/security-harness` with dependencies already installed:

```powershell
$env:ALLOW_ISOLATED_SECURITY_TESTS = 'true'
node node_modules/tsx/dist/cli.mjs src/cli/native.ts --all
```

`--guest`, `--product`, `--checkout`, `--webhook`, `--api` select a group. `--case=<ID>` filters Product/Checkout/Webhook diagnostics; filtered runs are not a full baseline. Default still selects Inventory + Cart. The gate deliberately exits 1 when any matrix entry is FAIL/BLOCKED/UNIMPLEMENTED, even when selected native tests all pass.

Verified regressions: harness **91/91** (13 files), shared ingress/money/Stripe helpers **58/58**, storefront webhook input/checkout errors/fulfillment **37/37**, actual-SDK-signature route unit checks **10/10**. Storefront/Admin/DB/shared-lib/harness typechecks passed. Changed application and harness files passed ESLint; harness lint emits only the React version-detection warning because that workspace is not a React app. The production storefront build succeeded inside the isolated HTTPS check. The final combined result and cleanup were independently checked against the saved artifacts above.
