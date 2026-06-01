# Backend Integration Tracker — REST standards + ASVS L2 pass

**Source handover:** received from backend team, 2026-05-20.
**Backend live at:** `https://global-express-backend-1.onrender.com` — contract verified stable.
**Spec source of truth:** [`global-express-backend/API_ENDPOINTS.md`](../global-express-backend/API_ENDPOINTS.md) (single source of truth) + live OpenAPI 3 at `https://global-express-backend-1.onrender.com/openapi.json`.
**Estimated FE effort:** 1–2 dev-days, ~6 PRs.

This file is the working tracker. Tick items as PRs land. Acceptance criteria are non-negotiable — every PR must hit them before the BE-change is marked done.

---

## Status at a glance

| # | BE change | FE work | Risk | PR slice |
|---|---|---|---|---|
| 1 | RFC 7807 Problem Details on every error | Rewrite `apiClient` error path; add `requestId` + `problem` to `ApiError`; add a `useApiErrorsToForm` hook for 422 mapping | **High** — every error path touches this | [PR A](#pr-a-rfc-7807-problem-details) |
| 2 | `/auth/*` now wrapped in `{ success, data }` | Switch all `auth/*` callers to `apiGetData/apiPostData`; drop legacy flat-shape tolerance in `authService.getMe` | Medium — 9 endpoints, login is critical path | [PR B](#pr-b-auth-envelope-unification) |
| 3 | `Idempotency-Key` header on payment / order / ticket POST | Add `idempotencyKey` option to `apiClient`; thread through 3 services + their hooks | Medium — payment is the highest-impact site | [PR C](#pr-c-idempotency-key) |
| 4 | Cloudflare Turnstile on 5 public POST endpoints | Install widget; wrap 5 forms; reset on `code: "captcha_failed"`; add `VITE_TURNSTILE_SITE_KEY` env | Medium — new dep, new env var | [PR D](#pr-d-turnstile-captcha) |
| 5 | `X-Request-ID` shown in error UIs | Surface `problem.requestId` (lands in PR A) inside feedback toasts + `RouteErrorBoundary` fallback | Low — depends on PR A | [PR A](#pr-a-rfc-7807-problem-details) (folded in) |
| 6 | File-scan gating before opening uploaded files | New `useFileScanStatus(r2Key)` hook with poll; status pill primitive; gate file viewers in payments / gallery claims / invoices / package images | **High** — touches every staff file-viewer | [PR E](#pr-e-file-scan-gating) |
| 7 | MFA branches in login flow (now envelope-wrapped) | Verify all MFA endpoints unwrap `.data` post PR B; smoke the four flows (no-MFA login, MFA login via TOTP, recovery code, first-time enrollment) | Low — flow exists, just needs the envelope shift | folded into [PR B](#pr-b-auth-envelope-unification) |
| 8 | `?sort=` query param — not yet wired | None — informational only. Raise with BE when a sortable column is needed. | — | n/a |

**Legend:** [ ] Not started · [~] In progress / partial · [x] Shipped + verified against BE

---

## Current FE baseline (where we are today)

These are the things that already line up — don't redo them. The 8 changes below build on this baseline.

- **`ApiError`** ([src/lib/apiClient.ts](src/lib/apiClient.ts:10)) — carries `message`, `status`, `retryAfterSeconds`. Missing: `requestId`, `problem` (full parsed body).
- **Single 401 handler** (PR #7) — dispatches `auth:unauthorized`, `AuthContext` clears session state. `/auth/me` boot-probe is exempted.
- **423 lockout dispatch** (PR #9) — reads `lockedUntil` (still works as an extension field on the new Problem shape).
- **429 retry-after** (PR #7, #10) — parses `Retry-After` header into `retryAfterSeconds`; per-button cooldown wired in `LoginPage` via [useRetryCooldown](src/hooks/useRetryCooldown.ts).
- **Envelope unwrap helpers** (PR #8) — `apiGetData / apiPostData / apiPatchData / apiPutData / apiDeleteData / apiPostMultipartData` unwrap `{ success, data }` exactly once. Used by 24 services.
- **Empty-body Content-Type fix** (PR #10) — every non-multipart request sends `Content-Type: application/json`.
- **MFA flow** (PR #9) — LoginPage branches on `mfaRequired`, MfaChallengePage holds `mfaToken` in router state (never localStorage), `ProtectedRoute` enforces `mustEnrollMfa` across refresh/deep-link, `RecoveryCodesPanel` requires explicit ack before continue.
- **Public tracking page** — read-only, no PII fields surfaced.
- **WS subprotocol auth** (PR #7) — `['bearer', token]` as the WebSocket constructor's second arg.

**What's missing (the gap PR A–E close):**
- Error path still reads `payload.message` and dies on `application/problem+json` Content-Type / `detail` field.
- `authService.getMe` ([src/services/authService.ts:67](src/services/authService.ts#L67)) tolerates flat-shape with `response?.data ?? response` — must be removed once BE always wraps.
- Zero Idempotency-Key usage anywhere.
- Zero Turnstile widget integrations; no `VITE_TURNSTILE_SITE_KEY` env.
- No `requestId` surfaced in any error UI.
- No file-scan checks before opening uploaded files (payment receipts, claim proofs, invoice attachments, package images).

---

## PR A — RFC 7807 Problem Details

> Closes BE changes **#1** (Problem Details) and **#5** (requestId in error UIs).
> Branch: `be-integration-1-problem-details`

### BE delta

Every error response now uses `application/problem+json; charset=utf-8` with body shape:

```jsonc
{
  "type": "/problems/<slug>",
  "title": "<short>",
  "status": 401,
  "detail": "<human-readable>",
  "instance": "/api/v1/auth/login",
  "requestId": "req-2y",
  "errors": [...] // only on 400 validation
  // extension fields (e.g. `lockedUntil`, `code: "captcha_failed"`) appear at top level
}
```

Known `type` URIs: `/problems/validation`, `/problems/unauthorized`, `/problems/forbidden`, `/problems/not-found`, `/problems/conflict`, `/problems/unprocessable`, `/problems/locked`, `/problems/rate-limited`, `/problems/internal`, `/problems/service-unavailable`.

### Current FE

[apiClient.ts:122-127](src/lib/apiClient.ts#L122-L127) extracts `payload.message`. The new payload has `detail` instead — every error toast will currently show "An unexpected error occurred" because the fallback fires.

### FE actions

1. **Extend `ApiError`** to carry `requestId: string | null` + `problem: Problem | null` (the whole parsed body), so callers that want extension fields (`lockedUntil`, `code`, `errors`) can read them without re-parsing.
2. **Rewrite the `if (!response.ok)` block** in both `request<T>` and `requestBlob`:
   - Pull `detail`, fall back to `title`, then to the existing HTTP fallback message.
   - Pull `requestId` from the parsed problem (or `X-Request-ID` header as a fallback when the body didn't parse).
   - Keep the existing 401 / 423 / 429 dispatchers but read fields from the problem shape: `dispatchAccountLocked` already reads `payload.lockedUntil` — still works because extensions live at the top level.
3. **Define `Problem` type** in `src/lib/apiClient.ts` so service callers can `instanceof ApiError` and inspect `err.problem`.
4. **Add `useApiErrorsToForm`** in `src/hooks/` — takes `Problem` + react-hook-form's `setError`, maps `errors[].path` → field paths. Used by every form on a 400/422.
5. **Surface `requestId`** in:
   - `useFeedbackStore.pushMessage` — accept an optional `ref?: string`; the toast renders "ref: req-X" in small text under the message.
   - [RouteErrorBoundary](src/components/errors/RouteErrorBoundary/RouteErrorBoundary.tsx) — when caught error is `ApiError`, show its `requestId` (component renders even for render-time errors which won't have a problem; guard).
6. **Tests** — extend [apiClient.test.ts](src/lib/apiClient.test.ts) to assert:
   - `ApiError.requestId` populated from `problem.requestId`
   - `ApiError.problem.errors` populated on 400 validation
   - `ApiError.problem.lockedUntil` still readable (regression check)
   - Content-Type `application/problem+json` is parsed correctly
   - Falls back to `title` when `detail` missing; falls back to HTTP message when neither

### Acceptance

- [ ] No FE code reads `response.message` directly — all error paths read from `ApiError.message` (which is `problem.detail`) or `ApiError.problem.errors[].message`
- [ ] Every error toast displays `requestId` somewhere visible
- [ ] `RouteErrorBoundary` fallback shows `requestId` when present
- [ ] 423 lockout countdown still triggers (regression smoke)
- [ ] 429 toast still quotes Retry-After (regression smoke)
- [ ] Tests assert all 10 known `type` URIs round-trip through `ApiError`

### PR sequence dependency

**Foundation PR — must land first.** PR B, D, E all depend on `ApiError.problem` and `useApiErrorsToForm`.

---

## PR B — Auth envelope unification

> Closes BE change **#2** (`/auth/*` wrapped) and verifies **#7** (MFA flow envelope shift).
> Branch: `be-integration-2-auth-envelope`
> **Depends on PR A** (so error-shape changes don't blindside the login path).

### BE delta

9 `/auth/*` routes used to return flat shapes; now wrap in `{ success: true, data: ... }` like everything else. `POST /auth/sync` and `POST /auth/register` were already wrapped — no change there.

### Current FE

- [src/services/authService.ts:67](src/services/authService.ts#L67) — `getMe` has `(response?.data ?? response)` legacy tolerance.
- [authService.ts:38-50](src/services/authService.ts#L38-L50) — `login` already calls `apiPost<{ success; data: InternalLoginPayload }>` and reads `response.data`. Should be fine if BE response matches.
- MFA services ([src/services/mfaService.ts](src/services/mfaService.ts)) — needs audit; many likely already use `apiPostData` after PR #8.
- Forgot-password services — needs audit.

### FE actions

1. **Audit every `auth/*` and `internal/me/mfa/*` call site** — list them, check whether they use `apiGet/apiPost` (which returns the raw body) or `apiGetData/apiPostData` (which auto-unwraps). Migrate the former to the latter.
2. **Remove the flat-shape fallback** in `getMe` ([authService.ts:67](src/services/authService.ts#L67)). Backend now always wraps; the `??` makes the code lie about the contract.
3. **MFA endpoints** — verify all 3 internal MFA enrollment endpoints (`POST /internal/me/mfa/enroll`, `POST /internal/me/mfa/verify-enrollment`, `POST /internal/me/mfa/disable`) and 2 challenge endpoints (`POST /auth/mfa/verify`, `POST /auth/mfa/recovery`) use `apiPostData`. Verify `useMfa` hook payloads still type-check.
4. **Smoke-test the four MFA flows manually:**
   - No-MFA login → dashboard
   - TOTP login (with MFA enrolled)
   - Recovery code login (warn at ≤2 codes remaining)
   - Superadmin first-login → forced enrollment, scans QR, sees 10 recovery codes, must ack save

### Acceptance

- [ ] All 9 `auth/*` callers go through `apiGetData/apiPostData`
- [ ] `getMe`'s `response?.data ?? response` is gone
- [ ] No-MFA login → dashboard
- [ ] TOTP login → dashboard
- [ ] Recovery code login → dashboard, shows remaining count warning at ≤2
- [ ] Superadmin first-login enforces enrollment + recovery-code ack
- [ ] Existing tests still pass; add coverage where missing

---

## PR C — Idempotency-Key

> Closes BE change **#3**.
> Branch: `be-integration-3-idempotency`
> **Depends on PR A.**

### BE delta

3 POST endpoints require an `Idempotency-Key: <uuid>` header. Server caches the response for 24h. Same key + same body → cached response with `Idempotent-Replayed: true` header. Same key + different body → 422 with `detail: "Idempotency-Key has already been used with a different request"`.

Endpoints:
- `POST /api/v1/payments/initialize` — **critical**, prevents double Paystack init
- `POST /api/v1/orders` — order wizard double-submit
- `POST /api/v1/support/tickets` — ticket form double-submit

### Current FE

Zero `Idempotency-Key` usage. Network failure or hard refresh mid-submit can today produce duplicate payment transactions.

### FE actions

1. **Extend `apiClient`** — add an `idempotencyKey?: string` option to `apiPost / apiPostData / apiPostMultipart` (and the helpers that route through them). When set, attach `Idempotency-Key: <key>` header.
2. **Key generation strategy** — each logical submit click generates ONE key via `crypto.randomUUID()`, captured in component state (or useRef) and **reused across retries** until the submit succeeds OR the user cancels. A fresh user action (new submit click after cancel) gets a fresh key.
3. **Wire into 3 services:**
   - [paymentsService.ts](src/services/paymentsService.ts) `initializePayment(token, payload, idempotencyKey)` — accept the key as a required param. Caller is responsible for generating + persisting it.
   - [ordersService.ts:19](src/services/ordersService.ts#L19) `createOrder(token, payload, idempotencyKey)` — same.
   - [supportService.ts](src/services/supportService.ts) `createSupportTicket(...)` — same.
4. **Wire into hooks** — each `useMutation` for these three endpoints generates the key at mutation-input time (the `mutate` call carries `{ payload, idempotencyKey }`), so retries via `mutate()` again reuse it cleanly via TanStack's built-in retry semantics.
5. **Tests** — `apiClient.test.ts` asserts the header is attached when the option is set.

### Acceptance

- [ ] All 3 endpoints attach `Idempotency-Key` derived from `crypto.randomUUID()`
- [ ] Hard refresh during a payment-initialize does NOT create a duplicate Paystack transaction (manual smoke)
- [ ] TanStack mutation retry (network failure) reuses the same key
- [ ] User can submit a second time with a fresh key after cancelling the first attempt

---

## PR D — Turnstile CAPTCHA

> Closes BE change **#4**.
> Branch: `be-integration-4-turnstile`
> **Depends on PR A** (the 422 `code: "captcha_failed"` path needs `ApiError.problem`).

### BE delta

5 unauthenticated POST endpoints now require a Cloudflare Turnstile token in header `cf-turnstile-response`.

| Endpoint | Current FE form |
|---|---|
| `POST /api/v1/public/newsletter/subscribe` | landing-page newsletter footer (find under `/components/marketing` or similar) |
| `POST /api/v1/public/gallery/claims/presign` | anonymous claim flow in [GalleryPage](src/pages/public/GalleryPage) |
| `POST /api/v1/public/gallery/anonymous/:trackingNumber/claim` | same — claim submit |
| `POST /api/v1/public/gallery/cars/:trackingNumber/purchase-attempt` | car purchase modal |
| `POST /api/v1/public/d2d/intake` | [D2dIntakePage](src/pages/public/D2dIntakePage) |

### Current FE

No Turnstile integration. No `VITE_TURNSTILE_SITE_KEY` env var.

### FE actions

1. **Install** `@marsidev/react-turnstile`.
2. **New env var** `VITE_TURNSTILE_SITE_KEY` — site key from Cloudflare dashboard (safe to commit since it's public). Document in `.env.example`.
3. **Build a `<TurnstileGate>` primitive** in `src/components/ui/` that:
   - Renders the widget
   - Tracks the token in local state
   - Disables the wrapped submit button until a token is captured
   - Exposes a `reset()` ref so the parent can clear the token after a failed submit
   - In development (no site key set), bypasses (returns dummy token `"dev-skip"`) so localhost just works — matches the BE middleware's dev-mode no-op behavior.
4. **Wire the 5 forms** — each captures the token, attaches `cf-turnstile-response` header on submit. On `ApiError` with `problem.type === '/problems/unprocessable'` AND `problem.code === 'captcha_failed' | 'captcha_missing'`, reset the widget and show the inline error.
5. **Add a `useTurnstile` hook** (or use the gate primitive's ref API) — TBD during implementation; pick whichever ergonomically composes with react-hook-form.
6. **Tests** — service tests for the 5 endpoints assert the header is attached.

### Acceptance

- [ ] All 5 public forms render the Turnstile widget
- [ ] Submit button stays disabled until token captured
- [ ] `cf-turnstile-response` header sent on submit
- [ ] On `code: "captcha_failed"` or `"captcha_missing"`, widget resets and user can retry
- [ ] Localhost dev works without `VITE_TURNSTILE_SITE_KEY` (gate bypasses)

---

## PR E — File-scan gating

> Closes BE change **#6**.
> Branch: `be-integration-5-file-scans`
> **Depends on PR A.**

### BE delta

New endpoint: `GET /api/v1/internal/file-scans/status?r2Key=<key>` returns:

```ts
{ r2Key: string; status: 'pending' | 'clean' | 'malicious' | 'error' | 'skipped'; scannedAt: string | null }
```

Every uploaded file is VirusTotal-scanned. FE must check status before exposing the file.

### Current FE

No scan check anywhere. Staff UI today opens files immediately after upload. Affected surfaces:
- **Payment receipts** — staff review queue (find under `/pages/payments` or admin payments page)
- **Anonymous gallery claim proofs** — claim review queue ([AdminGalleryPage](src/pages/admin/AdminGalleryPage))
- **Invoice attachments** — task invoices + reg docs (shipments detail page)
- **Package images** — [src/services/ordersService.ts:259](src/services/ordersService.ts#L259) order images endpoint

### FE actions

1. **New service** `src/services/fileScansService.ts` with `getFileScanStatus(token, r2Key)`.
2. **New hook** `src/hooks/useFileScanStatus.ts` — `useQuery` keyed by `r2Key`, polls every 10s while status is `pending`, stops polling on terminal status. `staleTime: 30s` for terminal statuses (don't re-fetch a clean file).
3. **New UI primitive** `src/components/ui/FileScanPill/` — small status pill (green / amber / red / gray) with hover-tooltip. Status → label mapping:
   - `pending` — "Scan in progress" (amber dot, animated)
   - `clean` — "Scanned safe" (green)
   - `malicious` — "Flagged — file removed" (red, file is also gone from R2)
   - `error` — "Scan failed" (red, treat as untrusted)
   - `skipped` — "Not scanned by VT" (gray dot, common on legit but unique files)
4. **Gate every file viewer** — wherever the FE renders an `<img>` / opens a download / shows a preview from an R2 key:
   - Show the pill next to the filename
   - For `pending` / `error` / `malicious`, render a placeholder instead of the file
   - Only mount the file viewer when status is `clean` or `skipped`
5. **Audit pass** — grep for every `<img src={...r2Url}` / `window.open(r2Url)` in `src/pages/admin`, `src/pages/payments`, `src/pages/shipments/ShipmentDetailPage`, and AdminGalleryPage's claim review UI.

### Acceptance

- [ ] No staff UI page opens a user-uploaded file without first calling `getFileScanStatus`
- [ ] `pending` rows show the pill + placeholder and auto-refresh
- [ ] `malicious` shows the red warning, file is never rendered
- [ ] `error` is treated as untrusted (file not shown)
- [ ] `skipped` shows the file with a small amber pill caveat
- [ ] Polling stops when status becomes terminal (no infinite polling waste)

---

## PR sequence + dependencies

```
                ┌──────────────────────────────────┐
                │ PR A — RFC 7807 + requestId      │  foundational, must land first
                └──────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬─────────────┐
        ▼                ▼                ▼             ▼
    ┌───────┐       ┌────────┐       ┌────────┐    ┌────────┐
    │ PR B  │       │ PR C   │       │ PR D   │    │ PR E   │
    │ /auth │       │ idem.  │       │ turn.  │    │ scans  │
    │ env   │       │ key    │       │ stile  │    │        │
    └───────┘       └────────┘       └────────┘    └────────┘
   (envelope +     (3 services,    (5 forms,      (4 staff
    MFA #7)        2 hooks)         new env)       surfaces)
```

**Why this order:**
- PR A defines the contract every other PR reads. Trying to ship B/D/E without it means each one re-implements problem parsing inline.
- PR B is independent of C/D/E in terms of files touched but is the highest user-criticality path (login) — ship second so it's verified in main before parallel work piles on.
- PR C/D/E touch disjoint file sets (services + forms + staff viewers) — can run in parallel by different devs once A is in.

---

## Verification checklist (from BE handover)

Mark each test pass before declaring "FE integrated":

| # | Test | Expected | PR |
|---|---|---|---|
| 1 | Submit login form with bad password | Banner shows `problem.detail`, ref code visible | A + B |
| 2 | Submit login form with empty password | Field-level error from `problem.errors[].path` via `useApiErrorsToForm` | A + B |
| 3 | Login after 5 bad attempts | 423 — countdown to `problem.lockedUntil` (regression of PR #9) | A |
| 4 | Submit newsletter without solving Turnstile | Widget alerts user, no API call made | D |
| 5 | Submit newsletter with stale Turnstile token | 422, widget resets, user can retry | D |
| 6 | Initialize payment, kill network mid-request, retry | Single Paystack transaction created (`Idempotent-Replayed: true` on retry) | C |
| 7 | Staff opens unscanned receipt | Pending placeholder + auto-refresh, not the file | E |
| 8 | Staff opens malicious receipt | Red warning, file not displayed | E |
| 9 | Superadmin first-login | Forced through MFA enrollment, sees 10 recovery codes, must ack save | B |
| 10 | Superadmin logs in with TOTP | Lands on dashboard | B |
| 11 | Superadmin logs in with recovery code | Dashboard, sees "9 codes left" warning | B |
| 12 | Any error response in DevTools | Content-Type `application/problem+json`, body has `type/title/status/detail/instance/requestId` | A |

---

## Cross-references

- API parity tracker: [API_PARITY_CHECKLIST.md](API_PARITY_CHECKLIST.md) — endpoint coverage + quality standards
- Backend spec: [`global-express-backend/API_ENDPOINTS.md`](../global-express-backend/API_ENDPOINTS.md)
- Live OpenAPI: `https://global-express-backend-1.onrender.com/openapi.json`
- Interactive docs: `https://global-express-backend-1.onrender.com/docs`

## Out of scope (deferred)

- `?sort=` query parameter (BE change #8) — informational only; revisit when a sortable column UI is queued.
- Auto-generated TypeScript client via `openapi-typescript` — possible follow-up to retire hand-written type files. Out of scope for the launch sprint.
- Migrating away from the per-call `token` parameter to an interceptor — orthogonal cleanup, not blocking launch.
