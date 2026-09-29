# Customer order notes and website verification — 29 September 2026

The owner explicitly requested customer order notes and investigation of broken pages. This resolves the previous T-16 scope question. Coupon remains excluded; the security corpus denominator remains 477. Existing modified and untracked work was preserved.

**Verified result: 477 PASS / 0 FAIL / 0 BLOCKED / 0 UNIMPLEMENTED** in the completed combined run `security_test_88f9013e9fdf487da10381de05ce2697`; process exit 0. The source hashes, supplemental checks, fixture cleanup and configured-secret scan also passed. Both applications built successfully, and the latest recorded checks cover all 37 Turbopack pages and 10 selected production routes.

## Feature

Checkout now has an optional customer note between the address and delivery sections, with Thai/English labels, a UTF-8 byte counter, accessible error feedback and retry preservation. Notes are limited to 2,048 UTF-8 bytes; invalid types, NUL/control characters and malformed surrogate sequences are rejected. Accepted text is stored verbatim with the order transaction; blank-only input becomes null. A PostgreSQL byte-length constraint supplies a second boundary.

The note appears on the customer's order details, the admin order details, the receipt email and the shipment email. It is distinct from internal admin history notes. React renders text and email templates explicitly escape HTML. Customer access follows the existing order ownership/guest-token checks.

The native T-16 adapter sends all three original corpus notes through real checkout, checks exact persistence, authoritative totals and one stock reservation, verifies owner access and another customer's denial, inspects both actual pages and both real templates through the local email sink, and rejects six supplemental invalid notes without mutation. The dedicated run `security_test_e97b12dad60e41648b091a92ed85de53` passed all three selected cases and six supplemental checks; its full-matrix summary is 79/0/398/0 because other native groups were not selected. Do not add standalone results together.

## Build and runtime repairs

Removed the named `ProductInput` and `CheckoutInput` type re-exports from `"use server"` action files and imported those types from their existing validation modules. This fixes the two reported Turbopack compiler errors.

The wider browser check also reproduced `Rendered more hooks than during the previous render` in Next's Router when an already-paid order used a streamed server redirect. After server-side authorization and payment confirmation, a small client component now uses document replacement to open the order, with a normal link fallback. It preserves the guest token and `paid=true`, encodes URL values and avoids rendering payment controls for paid orders. The stack matched the framework's documented [Router redirect issue](https://github.com/vercel/next.js/issues/63121); no framework dependency was upgraded.

Both applications completed full production builds. Run [`security_test_ab624898c1d64f1aaa2224c6dc62a4ea`](site-checks/security_test_ab624898c1d64f1aaa2224c6dc62a4ea/results.json) passed all 37 enumerated Turbopack page routes (20 Storefront, 17 Admin), nine of ten selected production route assertions, and all four note layout checks (Thai at 390px and English at 1440px in both modes). Its remaining assertion expected a heading named `404`, while the application's custom heading is `PAGE NOT FOUND`. Focused recheck [`security_test_a1e660ce4de94452873d9a2714d8dc4f`](site-checks/security_test_a1e660ce4de94452873d9a2714d8dc4f/results.json) then passed both payment routes in both modes, all four layout checks, and cleanup; it exited 0. No browser exceptions were observed in that recheck.

The production mock-payment page remains disabled. Next can return HTTP 200 for a streamed not-found page, as [its documentation explains](https://nextjs.org/docs/app/api-reference/file-conventions/not-found); the revised check requires actual not-found UI and absence of the payment simulator as well as acceptable transport status. Fixture authorization headers are restricted to the loopback application.

This page inventory verifies rendering/build behavior, not every combination of user actions. The paid payment fixture checks redirection; it does not exercise every unpaid payment control. OAuth callback pages loading is not proof of an external OAuth login.

[Consolidated route evidence](site-verification.json) lists the latest observation for each of the 47 mode/route combinations, with its originating run ID; it does not label the earlier failing run as a pass. [Mobile Thai note screenshot](site-checks/security_test_a1e660ce4de94452873d9a2714d8dc4f/production-note-th.png).

## Database application

Migrations `0004_payment_webhook_evidence` and `0005_customer_order_note` were applied at 2026-09-29 10:58:37 UTC to the existing owner-authorized development/test database's `public` schema, so the local application can use the feature. This is separate from security runs, which continue to create/drop random temporary schemas and use test providers plus the localhost email sink.

Preflight confirmed non-production environment flags, Stripe/Clerk test keys, exactly four existing migration entries, no conflicting new tables/column, and the reviewed additive SQL. Historical ledger hashes matched all four migration files after LF normalization; the transferred files use CRLF. Historical SQL and ledger rows were left unchanged. The two new migrations ran in one transaction with a five-second lock timeout and a 30-second statement timeout. All 31 pre-existing business tables had identical row counts and content fingerprints before/after (excluding the newly added null note field). The new tables were empty, all existing notes were null, and the database byte constraint existed. A fresh read-only connection then confirmed both tables, the note column and six migration entries. No orders, stock, payment values or existing customer data were edited by this migration.

[Redacted migration verification](application-migration-verification.json). The native harness does not need or alter the shared schema to prepare its fixtures.

## Local regression checks

- Harness: 91/91.
- Shared order-note, monetary, Stripe helper and action-ingress regressions: 77/77.
- Storefront checkout note interaction, input/DTO/ownership helpers and webhook regressions: 48/48.
- Admin product action and input regressions: 41/41. Total across these four local suites: 257/257.
- Typechecks passed for Storefront, Admin, DB, shared library and security harness.
- Changed-file ESLint and `git diff --check` passed.

## Combined security gate

The final `native --all` run **`security_test_88f9013e9fdf487da10381de05ce2697`** finished on 29 September 2026 at **18:25:15 Bangkok** (11:25:15 UTC), taking **20 minutes 18 seconds**. All seven selected targets completed and the process exited **0**. Post-run verification at 22:47 Bangkok confirmed that all **74 recorded source digests** still matched the working tree.

| Evidence in this single run | PASS | FAIL / BLOCKED |
| --- | ---: | ---: |
| Inventory | 10 | 0 / 0 |
| Cart | 70 | 0 / 0 |
| Guest Tracking | 41 | 0 / 0 |
| Admin Product | 102 | 0 / 0 |
| Checkout | 70 | 0 / 0 |
| Stripe Webhook | 94 | 0 / 0 |
| Customer notes, original T-16 variants | 3 | 0 / 0 |
| Isolated HTTP parser contract | 11 | 0 / 0 |
| Offline validators, parsers and arithmetic | 76 | 0 / 0 |
| **Total** | **477** | **0 / 0** |

These are **390 application cases, 11 isolated HTTP parser-contract cases and 76 offline cases**, not 477 browser end-to-end flows. T-16 retains its original `api.json` corpus target but is now bound to real checkout and order rendering; `order-notes.json` records that binding separately from the abstract parser. Supplemental checks passed without inflating the denominator: 11 inventory sessions, 32 Admin rendering checks, two simultaneous stock races, production HTTPS cookie issuance, the shipment sink, and six invalid-note rejections.

- [Coverage manifest](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/coverage-manifest.json)
- [Execution and source hashes](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/execution.json)
- [Post-run verification](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/verification.json)
- [Order-note observations](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/order-notes.json)
- [Runtime cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/cleanup.json) and [Stripe cleanup](../../fuzz-matrix-2026-09-24/artifacts/native/security_test_88f9013e9fdf487da10381de05ce2697/stripe-cleanup.json)

All **94 owned Stripe test payments were refunded**. The random schema was dropped, all owned servers stopped, and all **four Clerk fixture groups** were cleaned. An exact-value/JSON-escaped scan checked 12 configured secrets against all 17 generated public run artifacts and found zero matches; no values are recorded. The separate site artifact scan checked 28 files and also found zero matches.

Earlier note diagnostics remain historical: initial adapter setup/capture errors and development Flight debug-path leakage were repaired, and production-mode note observations retained the original leak and plain-text assertions. The first aborted bootstrap left two owned Clerk fixtures, which were subsequently identified by their exact run/fixture external IDs and deleted; its private cleanup record now confirms completion. No historical failed run was relabeled PASS.

No production deployment, commit or push was performed. The passing gate covers the fixed corpus and evidence above; Coupon, external email delivery and full external OAuth interactions remain outside the measured scope.
