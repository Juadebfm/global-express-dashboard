# Backend API — current state (2026-06-03)

Single source of truth for the FE engineer on **what the backend looks like right now** and **how the FE plugs into it**. This doc replaces the four legacy markdowns archived in [old_document.md](old_document.md).

If anything below disagrees with the running server, **the server wins** — re-derive from:

- Live API: `https://global-express-backend-1.onrender.com`
- OpenAPI 3 (always current): `https://global-express-backend-1.onrender.com/openapi.json`
- Interactive: `https://global-express-backend-1.onrender.com/docs`
- Hand-written reference: [`global-express-backend/API_ENDPOINTS.md`](../../global-express-backend/API_ENDPOINTS.md) — distilled below

---

## At-a-glance status

| Surface | Counts | FE coverage |
|---|---|---|
| HTTP endpoints | 168 total (163 application + `/health`, `/readiness`, `/metrics`, `/docs`, `/openapi.json`) | **163 / 163 application endpoints wired** in service modules |
| WebSocket endpoints | 1 (`/ws`) | ✅ wired ([useWebSocket.ts](../src/hooks/useWebSocket.ts)) |
| Public webhooks (inbound) | 2 (`/webhooks/clerk`, `/payments/webhook`) | n/a — FE never calls |
| REST + ASVS L2 handover (8 changes) | 7 shipped, 1 deferred (`?sort=`) | See [Backend handover delta](#backend-handover-delta) |
| Shipping-mark UX (new BE behaviour) | 1 endpoint + 1 read field | ⚠ **Profile screen needs the editable input wired** — see [Shipping mark UX](#shipping-mark-ux) |

---

## Base contract

### Required request headers

| Header | Value | When |
|---|---|---|
| `Content-Type` | `application/json` | Any JSON body. **Also required on empty-body PATCH/DELETE** (Fastify default rejects them — the BE explicitly overrides). [apiClient.ts](../src/lib/apiClient.ts) already sets this for all non-multipart requests. |
| `Authorization` | `Bearer <jwt>` | Authenticated endpoints. Either a Clerk JWT (customers/suppliers) or in-house JWT (staff/superadmin). |
| `Accept` | `application/json` | Recommended. Exceptions: `GET /users/me/export` (PDF) and `GET /metrics`. |

### Optional headers the FE may send

| Header | Where | Purpose |
|---|---|---|
| `Idempotency-Key` | `POST /payments/initialize`, `POST /orders`, `POST /support/tickets` | Replay-safe creates. Same key + same body → cached response, **`Idempotent-Replayed: true`** in the response. Same key + different body → 422. 24h TTL. Use a UUID per submit click; reuse on retries. Format `[A-Za-z0-9_-]{8,255}`. |
| `cf-turnstile-response` | 5 public POSTs (see [Public — CAPTCHA-gated endpoints](#public-captcha-gated-endpoints)) | Cloudflare Turnstile token. Required in production; the BE middleware no-ops when `TURNSTILE_SECRET_KEY` isn't set, so localhost just works. |
| `If-None-Match` | Any GET | Conditional GET — returns `304 Not Modified` when our cached ETag matches. TanStack-Query can wire this automatically. |

### Response headers always present

| Header | Value | Notes |
|---|---|---|
| `X-Request-ID` | Per-request UUID (`req-<n>`) | **Exposed via CORS** — read with `res.headers.get('x-request-id')`. **Surface in error UIs.** Also embedded as `requestId` in every error body. |
| `ETag` | `W/"<sha1>"` (weak) | On every GET response. Echo in `If-None-Match` to get 304. |
| `Cache-Control` | `no-store, private` (auth/PII routes) OR `public, max-age=300, stale-while-revalidate=60` (public catalog GETs only) | Treat the `no-store` set as never-cacheable on the FE/SW. |
| `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy` | helmet defaults | — |
| `Idempotent-Replayed` | `true` | Only on cached idempotency replays. |
| `Content-Type` | `application/problem+json; charset=utf-8` | **All error responses.** Don't try to parse as plain JSON only — type-check the content type if you re-roll the client. |

### Rate-limit headers (every response)

`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset` (seconds), `retry-after` (seconds, **on 429 only**).

**Global default:** 100 req / min / IP. Per-endpoint overrides:

| Endpoint | Limit |
|---|---|
| `POST /auth/login`, `POST /internal/auth/login` | 5/min/IP + IP allowlist (`ADMIN_IP_WHITELIST`) |
| `POST /auth/mfa/verify` | 10/min/IP |
| `POST /auth/mfa/recovery` | 5/min/IP |
| `POST /auth/forgot-password/send-otp` | 3/min/IP |
| `POST /auth/forgot-password/verify-otp` | 10/min/IP |
| `POST /auth/forgot-password/reset` | 5/min/IP |
| `POST /orders/` | **20/min/user** |
| `POST /payments/initialize` | 10/min |
| `POST /support/tickets` | **10/min/user** |
| `POST /payments/webhook` | 50/min |
| `POST /webhooks/clerk` | 200/min |

### Success envelope (every endpoint)

```json
{ "success": true, "data": <T> }
```

This is universal — including `/auth/*` (BE handover normalised these). Carve-outs: webhooks, `/health`, `/readiness`, `/metrics`, `/users/me/export` (PDF), `/docs`, `/openapi.json`.

**Pagination wrap (list endpoints):**

```json
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 } }
```

Defaults: `page=1, limit=20`, max `limit=100`. **Don't ask for `limit=100` "to be safe"** — wire real `{ page, limit }` controls. (4 known FE violations are noted in git history; clean as you touch the surface.)

### Error envelope — RFC 7807 Problem Details (every error)

```json
{
  "type": "/problems/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more request fields failed validation.",
  "instance": "/api/v1/orders",
  "requestId": "req-7",
  "errors": [
    { "path": ["body", "recipientName"], "message": "Required", "code": "invalid_type" }
  ]
}
```

| Field | Always present | What it's for |
|---|---|---|
| `type` | yes | URI for the problem class. **Switch on this.** |
| `title` | yes | Short, doesn't vary per occurrence. |
| `status` | yes | Mirrors HTTP status. |
| `detail` | yes | Human-readable, occurrence-specific. **Show this in the toast.** |
| `instance` | yes | The request path. |
| `requestId` | yes | Show as "Ref: req-X" near the error message. |
| `errors[]` | 400 from Zod only | Per-field — `{ path, message, code? }`. Wire into RHF via `useApiErrorsToForm`. |
| extension fields | sometimes | E.g. `lockedUntil` (ISO) on 423, `code: "captcha_failed" \| "captcha_missing"` on 422 CAPTCHA. Read off the top level. |

**Known `type` URIs:**

| `type` | HTTP | When |
|---|---|---|
| `/problems/validation` | 400 | Zod rejected body — `errors[]` populated |
| `/problems/unauthorized` | 401 | Missing/invalid/revoked token, bad credentials |
| `/problems/forbidden` | 403 | Wrong role, BOLA, IP allowlist denial |
| `/problems/not-found` | 404 | Resource absent |
| `/problems/conflict` | 409 | Duplicate / state-machine violation / already enrolled |
| `/problems/unprocessable` | 422 | Semantic — profile incomplete, callbackUrl not allowed, CAPTCHA failed, idempotency-key body mismatch |
| `/problems/locked` | 423 | Login lockout; **extension `lockedUntil` ISO** |
| `/problems/rate-limited` | 429 | Per-route or global cap exceeded |
| `/problems/internal` | 500 | Unhandled — `detail` is generic in prod |
| `/problems/service-unavailable` | 503 | Webhook secret unset, DB unreachable |
| `about:blank` | various | Catch-all when no specific type applies |

**FE plumbing (already in place):**

- [apiClient.ts](../src/lib/apiClient.ts) — `ApiError` carries `message`, `status`, `requestId`, `problem`, `retryAfterSeconds`. `request<T>` + `requestBlob` route every error through `buildApiError`.
- `Problem` interface + `PROBLEM_TYPE` enum exported from `apiClient.ts` — `instanceof ApiError` then read `err.problem.code` / `err.problem.errors`.
- 401 → dispatches `auth:unauthorized` (except `/auth/me` boot probe), handled by [AuthContext](../src/store/auth/AuthContext.tsx).
- 423 → dispatches `auth:locked` with `lockedUntil`, drives the 1-Hz countdown banner on [LoginForm](../src/components/forms/LoginForm/LoginForm.tsx).
- 429 → parses `Retry-After` (numeric + HTTP-date) into `retryAfterSeconds`; per-button cooldowns via [useRetryCooldown](../src/hooks/useRetryCooldown.ts) + [cooldown store](../src/store/cooldown/cooldown.store.ts).
- `useApiErrorsToForm(form, error)` — walks `problem.errors[].path` and calls `setError` per field.
- [RouteErrorBoundary](../src/components/errors/RouteErrorBoundary/RouteErrorBoundary.tsx) shows the `Ref: req-X` line on render-time crashes when the error is `ApiError`.

### HTTP status codes in use

200, 201, 304, 400, 401, 403, 404, 409, 422, 423, 429, 500, 503 — meanings match the standard, modulo the problem-type tags above.

---

## Roles & access control (RBAC)

Three access modes enforced by middleware: **public**, **authenticated** (any valid Bearer), **role-gated** (Bearer + one of the allowed roles).

| Role | Token | Description |
|---|---|---|
| `user` | Clerk JWT | Customer — the people shipping things |
| `supplier` | Clerk JWT | Korean supplier delivering on a customer's behalf |
| `staff` | Internal JWT | Operations (warehouse, dispatch, support) |
| `superadmin` | Internal JWT | Full admin — finance, pricing, **MFA required** |

**Inline-doc auth shorthand → roles:**

| Note | Allowed roles |
|---|---|
| `Auth: none` | Public |
| `Auth: Bearer` | Any authenticated user |
| `Auth: Bearer (staff+)` / `(admin+)` | staff + superadmin |
| `Auth: Bearer (superadmin)` | superadmin only |
| `Auth: Bearer (Clerk token)` | Customer paths only |
| `Auth: Bearer (internal JWT)` | Staff/superadmin paths |
| `Auth: Paystack signature` / `Auth: Svix signature` | Webhooks — provider-signed, no Bearer |

**Capability highlights** (full matrix in BE spec):

- Customers can edit their own shipping mark **once** (then locked). Staff can re-edit any time.
- Soft-delete an order = admin+. GDPR right-to-erasure = customer self-service.
- Superadmins approve dispatch batch cutoffs, set FX mode, edit pricing rules, and toggle the "require national ID" staff onboarding flag.
- Staff actions that need a superadmin-granted flag: `canManageShipmentBatches`, `canProvisionClientLogin`.
- **BOLA enforcement:** the API consistently checks resource ownership on `:id` paths — customers can only read/edit their own orders, payments, tickets, etc.

---

## Cross-cutting protocols

### Idempotency

For `POST /payments/initialize`, `POST /orders/`, `POST /support/tickets`:

1. FE generates a UUID per submit click (`crypto.randomUUID()`).
2. Sends as `Idempotency-Key: <uuid>` header.
3. **Reuses the same key on retries** (network failure, double-click, mid-submit reload).
4. Fresh user action → fresh key.

Server behavior: first call runs normally + persists `(key, user, method, path, request-hash)` for 24h. Same key + same body on retry → cached response with `Idempotent-Replayed: true`. Same key + **different** body → 422 (pick a fresh key).

**FE wiring:** `apiPost*` accepts `idempotencyKey` in `PostOpts` → composed into headers by `buildPostHeaders`. Mutations capture the key at mutation-input time so TanStack retries reuse it.

### CAPTCHA (Cloudflare Turnstile)

5 unauthenticated POSTs require `cf-turnstile-response` header — see [Public — CAPTCHA-gated endpoints](#public-captcha-gated-endpoints).

**FE wiring:**

- `@marsidev/react-turnstile` + `VITE_TURNSTILE_SITE_KEY` env var (commit-safe).
- [TurnstileGate](../src/components/ui/TurnstileGate/) primitive — disables the wrapped submit until a token is captured, exposes `requestNextToken()` Promise for multi-call flows.
- `isTurnstileError(err)` checks `err.problem.code === 'captcha_failed' | 'captcha_missing'` → reset widget and let the user retry.
- Tokens are **single-use + 5-min validity**. For multi-step flows (anonymous claim presign + claim submit) re-issue a fresh token before each call.
- Dev mode: when `VITE_TURNSTILE_SITE_KEY` is unset, the gate bypasses and returns a dummy `"dev-skip"` token — matches BE middleware no-op.

### MFA login flow

Internal users may have TOTP MFA. Login response shape branches:

```ts
// No MFA — fully logged in
{ user: Operator, tokens: { accessToken } }

// MFA enrolled — challenge required
{ mfaRequired: true, mfaToken: <5-min jwt>, userId }
```

Flow:

1. `POST /auth/login` → branch on `mfaRequired`.
2. If challenge: `POST /auth/mfa/verify` with `{ mfaToken, code }` → returns `{ user, tokens }`.
3. Recovery alternative: `POST /auth/mfa/recovery` with `{ mfaToken, recoveryCode }` → returns `{ user, tokens, remainingRecoveryCodes }`. **Warn when `remainingRecoveryCodes ≤ 2`**.

Even on no-MFA success the FE must still check `data.user.mustEnrollMfa`/`mustChangePassword`/`mustCompleteProfile` and route accordingly. [ProtectedRoute](../src/components/auth/ProtectedRoute.tsx) re-enforces all three on every protected page so deep links can't bypass.

Enrollment (`mustEnrollMfa: true`):

1. `POST /internal/me/mfa/enroll` → `{ secret, otpauthUri }`. Render the URI as a QR code + show the secret as copy-paste fallback.
2. User enters first 6-digit code from authenticator app.
3. `POST /internal/me/mfa/verify-enrollment` with `{ code }` → `{ recoveryCodes: string[10], warning }`. **Force the user to ack saving them** — the codes are shown **once** and cannot be retrieved later. [RecoveryCodesPanel](../src/components/auth/RecoveryCodesPanel/RecoveryCodesPanel.tsx) requires an explicit checkbox before Continue.

### File-scan gating (VirusTotal)

Every uploaded file is AV-scanned. **Staff UI must not open a user-uploaded file without first reading the scan status.**

`GET /api/v1/internal/file-scans/status?r2Key=<encoded key>` returns:

```ts
{ r2Key: string; status: 'pending' | 'clean' | 'malicious' | 'error' | 'skipped'; scannedAt: string | null }
```

| Status | UI |
|---|---|
| `pending` | "Scan in progress" amber pill, animated; poll every 10s; do NOT render the file |
| `clean` | Render normally |
| `malicious` | Red "Flagged — file removed" (also gone from R2); never render |
| `error` | Treat as untrusted; do NOT render |
| `skipped` | Render with amber caveat — VT didn't recognise the hash, common on legit-but-unique files |

**FE wiring:** [fileScansService.ts](../src/services/fileScansService.ts), [useFileScanStatus.ts](../src/hooks/useFileScanStatus.ts) (polls every 10s while `pending`, `staleTime: 30s` for terminal statuses), [FileScanPill](../src/components/ui/FileScanPill/), [GatedFileViewer](../src/components/ui/GatedFileViewer/). Three gated surfaces today: invoice attachments, package images, claim proofs. Payment-receipts UI doesn't exist yet — gate it when it lands.

### Shipping mark UX

Auto-generated at signup from the customer's name (Julius Adebowale → `julade`, Pluralcode business → `plural`). Format: `^[a-z][a-z0-9]{2,19}$`. Server normalises uppercase input.

Read `data.shippingMarkUserEditedAt` from `GET /users/me`:

- `null` → customer can change the mark **once** via `PATCH /users/me { shippingMark }`. Show editable input.
- non-null → only staff can edit (`PATCH /users/:id`). Show as read-only + link to support.
- 409 on PATCH → already used; refresh `GET /users/me` and re-render the locked UI.

A shipping mark is **not** a tracking number — tracking numbers are `GEX-…`. The mark is a customer-chosen alias the Korean warehouse and Lagos office use to match physical cargo by hand. Examples: `jay`, `juadeb`, `queen24`, `plural99`.

> ⚠ **FE gap (2026-06-03):** the editable input is not wired yet on the profile page. Backend exposes `shippingMark` + `shippingMarkUserEditedAt` on `GET /users/me`; FE should:
> 1. Render `shippingMark` (no more "Not provided yet" for that field — was masked by an earlier `Promise.all` bug, fixed in PR #25 via `Promise.allSettled`).
> 2. Branch on `shippingMarkUserEditedAt === null` to decide editable vs locked.
> 3. Client-validate against the regex to avoid 400 round-trips.

---

## Endpoint inventory

Every endpoint mounted at `/api/v1/<group>/...` except health/diagnostics/webhooks/ws. Authoritative reference: [`global-express-backend/API_ENDPOINTS.md`](../../global-express-backend/API_ENDPOINTS.md).

> **What this list is for:** quick lookup of method + path + auth + a one-line "what it's for" so an FE engineer can pick the right hook without context-switching to the backend repo. For payload/response shapes, click through to the BE spec.

### Health & diagnostics (5)

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /health` | none | Liveness probe — process responsive, no DB check |
| `GET /readiness` | none | Readiness — runs `SELECT 1` against DB |
| `GET /metrics` | none (restrict at LB) | Prometheus text format |
| `GET /docs` | none | Swagger UI |
| `GET /openapi.json` | none | OpenAPI 3 JSON — SDK generation source |

### Auth — `/api/v1/auth` (10)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /auth/register` | none | Informational — directs FE to Clerk SDK |
| `POST /auth/sync` | Bearer (Clerk) | Provision DB row after Clerk signup/login. Idempotent. |
| `POST /auth/login` | none + IP allowlist | Operator (staff/superadmin) sign-in. **MFA branch on `data.mfaRequired`.** Customers use Clerk. |
| `POST /auth/mfa/verify` | none (mfaToken) | Exchange `mfaToken` + 6-digit TOTP code for real access token |
| `POST /auth/mfa/recovery` | none (mfaToken) | Recovery code fallback. Returns `remainingRecoveryCodes`. |
| `GET /auth/me` | Bearer (internal) | Restore operator session — call on every dashboard load |
| `POST /auth/logout` | Bearer (staff+) | Revoke JTI server-side |
| `POST /auth/forgot-password/send-otp` | none | Send OTP to email. Always 200 (no enumeration). |
| `POST /auth/forgot-password/verify-otp` | none | Verify OTP within 15 min window |
| `POST /auth/forgot-password/reset` | none | Set new password (≥12 chars) using verified-OTP session |

### Users — `/api/v1/users` (21)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /users/me` | Bearer | Current customer profile. **Surfaces `shippingMark` + `shippingMarkUserEditedAt`.** |
| `GET /users/me/completeness` | Bearer | `{ isComplete, missingFields[] }` — call before opening order wizard |
| `PATCH /users/me` | Bearer | Update profile. **Shipping-mark edit is one-time per customer.** 409 on retry. |
| `GET /users/me/notification-preferences` | Bearer | Email/SMS/in-app/marketing toggles |
| `PATCH /users/me/notification-preferences` | Bearer | Save toggles |
| `GET /users/me/suppliers` | Bearer | Customer's supplier address book (paginated) |
| `POST /users/me/suppliers` | Bearer | Link by `supplierId` OR invite by `email` |
| `POST /users/me/suppliers/:supplierId/update-request` | Bearer | Propose a correction to a supplier's details |
| `GET /users/me/suppliers/update-requests` | Bearer | Outgoing update-request audit |
| `GET /users/me/suppliers/validation-requests` | Bearer | Incoming update requests to validate (supplier role) |
| `PATCH /users/me/suppliers/validation-requests/:id` | Bearer | Supplier accepts/rejects |
| `DELETE /users/me` | Bearer | **GDPR erasure — irreversible.** Strong confirm dialog required. |
| `GET /users/me/export` | Bearer | PDF — `Content-Disposition: attachment` |
| `GET /users/` | Bearer (admin+) | Admin user list (paginated, filter by role/isActive) |
| `GET /users/suppliers` | Bearer (admin+) | Admin supplier list |
| `GET /users/:id` | Bearer (admin+) | Admin user detail |
| `PATCH /users/:id` | Bearer (admin+) | Admin edit. **No one-time limit on shippingMark here.** |
| `PATCH /users/:id/role` | Bearer (admin+) | Staff can't assign superadmin (403) |
| `PATCH /users/:id/client-login-permission` | Bearer (superadmin) | Toggle `canProvisionClientLogin` |
| `PATCH /users/:id/shipment-batch-permission` | Bearer (superadmin) | Toggle `canManageShipmentBatches` |
| `DELETE /users/:id` | Bearer (superadmin) | Soft-delete (sets `deletedAt`). Not GDPR erasure. |

### Orders — `/api/v1/orders` (12)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /orders/track/:trackingNumber` | **none** | Public tracking page. No PII surfaced. |
| `GET /orders/my-shipments` | Bearer | Customer dashboard shipment list |
| `POST /orders/` | Bearer | Create order. **20/min/user, Idempotency-Key supported.** Returns 422 if profile incomplete. |
| `POST /orders/estimate` | Bearer | Real-time price estimate inside the wizard |
| `GET /orders/` | Bearer | Customer's orders (or staff filtered by `senderId`) |
| `GET /orders/:id` | Bearer | Order detail (BOLA-protected) |
| `GET /orders/:id/timeline` | Bearer | Full timeline + goods + invoice |
| `PATCH /orders/:id/status` | Bearer (staff+) | Status update via `statusV2` enum |
| `PATCH /orders/:id/pickup-rep` | Bearer | Customer assigns pickup-rep contact |
| `POST /orders/:id/warehouse-verify` | Bearer (staff+) | Records actual measurements + packages; triggers re-pricing |
| `DELETE /orders/:id` | Bearer (admin+) | Soft-delete |
| `GET /orders/:id/images` | Bearer | Package photos (gated through file-scan) |

### Payments — `/api/v1/payments` (9 + 1 webhook)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /payments/initialize` | Bearer | **Idempotency-Key strongly recommended.** Returns Paystack `authorizationUrl`. `callbackUrl` must be in `CORS_ORIGINS`. |
| `POST /payments/receipts/presign` | Bearer | Customer/staff offline-receipt upload — step 1 |
| `POST /payments/receipts` | Bearer | Step 2 — submit receipt metadata referencing R2 key |
| `PATCH /payments/receipts/:id/verify` | Bearer (superadmin) | Approve/reject submitted offline receipt |
| `POST /payments/verify/:reference` | Bearer | Confirm payment after Paystack redirect. Idempotent. |
| `POST /payments/webhook` | Paystack signature | FE never calls |
| `GET /payments/me` | Bearer | Customer's own payment history |
| `GET /payments/` | Bearer (superadmin) | All payments |
| `GET /payments/:id` | Bearer (superadmin) | Specific payment |
| `POST /payments/:orderId/record-offline` | Bearer (staff+) | Record transfer/cash payment |

### Uploads — `/api/v1/uploads` (4)

Staff package-photo flow. Every uploaded file is AV-scanned (see [File-scan gating](#file-scan-gating-virustotal)).

| Endpoint | Auth | Use |
|---|---|---|
| `POST /uploads/presign` | Bearer (staff+) | Presigned R2 URL — step 1 |
| `POST /uploads/confirm` | Bearer (staff+) | Register against order — step 2 |
| `GET /uploads/orders/:orderId/images` | Bearer (BOLA) | List photos |
| `DELETE /uploads/images/:imageId` | Bearer (admin+) | Remove an image |

### Reports — `/api/v1/reports` (9)

Common query params: `from`, `to` (ISO 8601), `groupBy` (`day`/`week`/`month`).

| Endpoint | Auth |
|---|---|
| `GET /reports/summary` | Bearer (superadmin) |
| `GET /reports/orders/by-status` | Bearer (admin+) |
| `GET /reports/revenue` | Bearer (superadmin) |
| `GET /reports/shipment-volume` | Bearer (admin+) |
| `GET /reports/top-customers` | Bearer (admin+) |
| `GET /reports/delivery-performance` | Bearer (admin+) |
| `GET /reports/status-pipeline` | Bearer (admin+) |
| `GET /reports/payment-breakdown` | Bearer (superadmin) |
| `GET /reports/shipment-comparison` | Bearer (admin+) |

### Internal — `/api/v1/internal` (18 + the file-scan status endpoint)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /internal/auth/login` | none + IP allowlist | Alternative operator login. Same envelope as `/auth/login`. |
| `POST /internal/users` | Bearer (admin+) | Create staff/superadmin account (sends welcome email) |
| `PATCH /internal/users/:id/password` | Bearer (superadmin) | Force-reset another internal user's password |
| `PATCH /internal/me/password` | Bearer (staff+) | Self-change password (requires current) |
| `GET /internal/me/mfa/status` | Bearer (staff+) | Enrollment status + remaining recovery codes |
| `POST /internal/me/mfa/enroll` | Bearer (staff+) | `{ secret, otpauthUri }` — render as QR |
| `POST /internal/me/mfa/verify-enrollment` | Bearer (staff+) | Returns 10 one-time recovery codes |
| `POST /internal/me/mfa/disable` | Bearer (staff+) | Requires password AND TOTP |
| `POST /internal/me/mfa/recovery-codes/regenerate` | Bearer (staff+) | Issue a fresh set |
| `GET /internal/me/profile-requirements` | Bearer (staff+) | `requireNationalId`, `allowedCountries` |
| `PATCH /internal/me/profile` | Bearer (staff+) | First-login profile-completion submit |
| `GET /internal/settings/require-national-id` | Bearer (superadmin) | Read toggle |
| `PATCH /internal/settings/require-national-id` | Bearer (superadmin) | Set toggle |
| `GET /internal/settings/special-packaging` | Bearer (staff+) | Surcharge catalog |
| `PUT /internal/settings/special-packaging` | Bearer (superadmin) | Full replace (0–50 entries) |
| `GET /internal/push/vapid-key` | Bearer (staff+) | Web Push setup |
| `POST /internal/push/subscribe` | Bearer (staff+) | Register browser subscription |
| `POST /internal/push/unsubscribe` | Bearer (staff+) | On logout / disable |
| `GET /internal/file-scans/status?r2Key=…` | Bearer (staff+) | **AV scan verdict — gate every file viewer on this** |

### Dashboard — `/api/v1/dashboard` (4)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /dashboard/stats` | Bearer | Headline cards. Role-gates `revenueMtd`/`totalSpent`/`fxRate*`. |
| `GET /dashboard/trends` | Bearer | Monthly trend; `months` query 1–12, default 3 |
| `GET /dashboard/active-deliveries` | Bearer | Map/list of in-flight shipments |
| `GET /dashboard/` | Bearer | One-shot bundle: `{ stats, trends, activeDeliveries }` |

### Notifications — `/api/v1/notifications` (8)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /notifications/` | Bearer | Inbox list |
| `GET /notifications/unread-count` | Bearer | Badge count. Poll 60s OR rely on WS. |
| `PATCH /notifications/:id/read` | Bearer | Mark one as read |
| `PATCH /notifications/read-all` | Bearer | Mark all read |
| `PATCH /notifications/:id/save` | Bearer | Pin/star toggle |
| `DELETE /notifications/:id` | Bearer | Delete one |
| `DELETE /notifications/` | Bearer | Bulk delete (1–100 ids per call) |
| `POST /notifications/broadcast` | Bearer (superadmin) | System-wide announcement |

Notification `type` enum: `order_status_update | payment_event | system_announcement | admin_alert | new_customer | new_order | payment_received | payment_failed | new_staff_account | staff_onboarding_complete`.

### Shipments — `/api/v1/shipments` (15)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /shipments/` | Bearer | List (paginated). Staff can filter by `senderId`. |
| `POST /shipments/intake` | Bearer (admin+) | Staff records new shipment intake (origin warehouse) |
| `PUT /shipments/:id/measurements` | Bearer (admin+) | Record weight/CBM at a checkpoint |
| `GET /shipments/:id/measurements` | Bearer (admin+) | All checkpoint measurements |
| `POST /shipments/invoices/:invoiceId/task-invoice/presign` | Bearer (admin+) | Per-supplier billing doc — step 1 |
| `POST /shipments/invoices/:invoiceId/task-invoice/confirm` | Bearer (admin+) | Step 2 |
| `GET /shipments/invoices/:invoiceId/task-invoice` | Bearer | List task invoices |
| `POST /shipments/invoices/:invoiceId/reg-docs/presign` | Bearer | Regulatory docs upload — step 1 |
| `POST /shipments/invoices/:invoiceId/reg-docs/confirm` | Bearer | Step 2 |
| `GET /shipments/invoices/:invoiceId/reg-docs` | Bearer | List reg docs |
| `GET /shipments/internal-track/:masterTrackingNumber` | Bearer (admin+) | Master tracking lookup (multi-customer batches) |
| `POST /shipments/batches/:batchId/approve-cutoff` | Bearer (superadmin) | Lock batch members in |
| `PATCH /shipments/batches/:batchId/carrier-info` | Bearer (staff+) | Airline/ocean/D2D carrier details |
| `PATCH /shipments/batches/:batchId/status` | Bearer (staff+) | Cascade status to member orders |
| `POST /shipments/batches/:batchId/move-to-next` | Bearer (staff+) | Move package(s) into next phase |

### Team — `/api/v1/team` (2)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /team/` | Bearer (admin+) | Internal team list |
| `PATCH /team/:id/approve` | Bearer (superadmin) | Approve a new staff account (flip `isActive`) |

### Admin — `/api/v1/admin` (10)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /admin/imports/users-suppliers` | Bearer (staff+) | **`multipart/form-data`** CSV bulk import. Run with `?dryRun=true` first. |
| `POST /admin/clients` | Bearer (staff+) | Provision new customer + return one-time login link |
| `POST /admin/clients/:id/send-invite` | Bearer (staff+) | Re-send login link |
| `GET /admin/clients` | Bearer (staff+) | CRM list |
| `GET /admin/clients/:id` | Bearer (staff+) | Client detail |
| `GET /admin/clients/:id/orders` | Bearer (staff+) | All orders for a client |
| `GET /admin/clients/:id/workbench` | Bearer (staff+) | One-shot: client + suppliers + recent orders |
| `GET /admin/clients/:id/suppliers` | Bearer (staff+) | Linked suppliers |
| `POST /admin/clients/:id/suppliers` | Bearer (staff+) | Add supplier by id or invite |
| `POST /admin/clients/:id/goods-intake` | Bearer (staff+) | Create an order on behalf with full package detail |

### Settings — `/api/v1/settings` (12)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /settings/logistics` | Bearer (staff+) | Lane + office addresses + ETA notes |
| `PATCH /settings/logistics` | Bearer (admin+; office address = superadmin) | Edit subset |
| `GET /settings/fx-rate` | Bearer (staff+) | USD→NGN setting (`mode: 'live' \| 'manual'`) |
| `PATCH /settings/fx-rate` | Bearer (superadmin) | Set mode / manual override |
| `GET /settings/shipment-types` | Bearer (staff+) | Editable catalog |
| `PATCH /settings/shipment-types` | Bearer (superadmin) | Upsert + delete |
| `GET /settings/templates` | Bearer (admin+) | Notification templates (email + in-app) |
| `PATCH /settings/templates/:id` | Bearer (admin+) | Edit one template |
| `GET /settings/pricing` | Bearer (staff+) | Pricing rules + customer overrides |
| `PATCH /settings/pricing` | Bearer (superadmin) | Bulk edit |
| `GET /settings/restricted-goods` | Bearer (staff+) | Restricted-goods catalog |
| `PATCH /settings/restricted-goods` | Bearer (admin+) | Bulk edit |

### Support — `/api/v1/support` (5)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /support/tickets` | Bearer | **10/min/user, Idempotency-Key supported.** Staff can use `forUserId`. |
| `GET /support/tickets` | Bearer | Inbox |
| `GET /support/tickets/:id` | Bearer (BOLA) | Detail + messages. Subscribe to WS `support:join` for live messages. |
| `POST /support/tickets/:id/messages` | Bearer | Reply. `isInternal` staff-only. 422 on closed ticket. |
| `PATCH /support/tickets/:id` | Bearer (staff+) | Update status/assignee |

Ticket `status`: `open | in_progress | resolved | closed`. Ticket `category`: `shipment_inquiry | payment_issue | damaged_goods | document_request | account_issue | general`.

### Public — `/api/v1/public` (11)

All unauthenticated. `cf-turnstile-response` required where noted below.

#### Public — open (no CAPTCHA)

| Endpoint | Use |
|---|---|
| `POST /public/calculator/estimate` | Public pricing calculator |
| `GET /public/shipment-types` | Calculator's shipment-type selector |
| `GET /public/calculator/rates` | Raw rate cards |
| `GET /public/gallery` | Marketing gallery (anonymous goods + sales + cars + adverts) |
| `GET /public/gallery/adverts` | Adverts only |
| `GET /public/gallery/sales` | Sales only |

#### Public — CAPTCHA-gated endpoints

| Endpoint | Use |
|---|---|
| `POST /public/newsletter/subscribe` | Marketing newsletter form |
| `POST /public/gallery/claims/presign` | Anonymous claim proof upload — step 1. **Re-issue Turnstile per presign call** (tokens are single-use). |
| `POST /public/gallery/anonymous/:trackingNumber/claim` | Submit anonymous ownership claim |
| `POST /public/gallery/cars/:trackingNumber/purchase-attempt` | Anonymous car interest |
| `POST /public/d2d/intake` | Unauthenticated D2D order intake |

### Gallery — `/api/v1/gallery` (11)

| Endpoint | Auth | Use |
|---|---|---|
| `GET /gallery/` | Bearer | Authed gallery view (includes `myClaims`) |
| `POST /gallery/claims/presign` | Bearer | Authed claim-proof upload — step 1 |
| `POST /gallery/items/media/presign` | Bearer (staff+) | Staff item media upload — step 1 |
| `POST /gallery/anonymous/:trackingNumber/claim` | Bearer | Authed ownership claim |
| `POST /gallery/cars/:trackingNumber/purchase-attempt` | Bearer | Authed car purchase attempt |
| `POST /gallery/items` | Bearer (staff+) | Create gallery item |
| `POST /gallery/adverts` | Bearer (staff+) | Convenience: item with `itemType=advert` |
| `PATCH /gallery/items/:id` | Bearer (staff+) | Edit item |
| `PATCH /gallery/adverts/:id` | Bearer (staff+) | Edit advert |
| `GET /gallery/claims` | Bearer (staff+) | Queue of incoming claims |
| `PATCH /gallery/claims/:id/review` | Bearer (staff+) | Approve/reject. Race-safe. `postApprovalAction: 'create_shipment' \| 'approve_only'`. |

### Webhooks — `/webhooks` (1 + the payments one)

| Endpoint | Auth | Use |
|---|---|---|
| `POST /webhooks/clerk` | Svix signature | Clerk lifecycle events (`user.updated`, `user.deleted`) |
| `POST /api/v1/payments/webhook` | Paystack signature (`x-paystack-signature`) | `charge.success` / `charge.failed` |

### WebSocket — `/ws` (1)

`GET ws://host/ws` — real-time push for order status, support messages, broadcast notifications.

**Auth (browser):** `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol — pass `['bearer', token]` as the `WebSocket` constructor's second arg. **Do NOT** put the token in the URL. The `Authorization: Bearer …` header also works for non-browser clients.

**Close codes:**
- `4001` Unauthorized — missing/invalid/revoked token → log the user out
- `4003` Forbidden — wrong role for that subscription / inactive account

**Server → client messages:** `connected`, `support:new_ticket` (staff), `support:new_message`, `support:join:denied`, `notification`, `order:status_update`.

**Client → server messages:** `support:join` (BOLA-checked), `support:leave`.

**FE wiring:** [useWebSocket.ts](../src/hooks/useWebSocket.ts) — reconnects on disconnect with exponential backoff. Treat `support:join:denied` as terminal for that ticket — don't retry.

---

## Backend handover delta

The 9 BE handover changes vs FE state today (single source of truth replacing the legacy `BACKEND_INTEGRATION.md`):

| # | BE change | FE status | Where |
|---|---|---|---|
| 1 | RFC 7807 Problem Details on every error | ✅ Shipped | [apiClient.ts](../src/lib/apiClient.ts) (`Problem`, `PROBLEM_TYPE`, `ApiError.problem`) |
| 2 | `/auth/*` envelope unification | ✅ Shipped | All auth/mfa services on `apiPostData`; `getMe` flat-shape fallback removed |
| 3 | `Idempotency-Key` on 3 POSTs | ✅ Shipped | `PostOpts.idempotencyKey` → `buildPostHeaders` in [apiClient.ts](../src/lib/apiClient.ts) |
| 4 | Cloudflare Turnstile on 5 public POSTs | ✅ Shipped | [TurnstileGate](../src/components/ui/TurnstileGate/) + `cf-turnstile-response` wiring |
| 5 | `X-Request-ID` in error UIs | ✅ Shipped | Toasts via `pushMessage({ ref })`; [RouteErrorBoundary](../src/components/errors/RouteErrorBoundary/RouteErrorBoundary.tsx) extracts `requestId` from `ApiError` |
| 6 | File-scan gating before opening uploads | ✅ Shipped | [fileScansService](../src/services/fileScansService.ts), [useFileScanStatus](../src/hooks/useFileScanStatus.ts), [GatedFileViewer](../src/components/ui/GatedFileViewer/), [FileScanPill](../src/components/ui/FileScanPill/) |
| 7 | MFA branches (envelope-wrapped) | ✅ Shipped | Folded into change #2 — see [MFA login flow](#mfa-login-flow) |
| 8 | `?sort=` query param | ⏸ Deferred | Informational only; revisit when a sortable column UI is queued |
| 9 | Shipping mark UX | ⚠ **Partial** | `shippingMark` reads correctly (PR #25 `Promise.allSettled` fix). **Editable input + lock-state branching on `shippingMarkUserEditedAt` not yet wired on the profile page.** |

---

## Open FE gaps to close

Items still owed against the BE contract — non-blocking but worth a sweep:

1. **Shipping mark editor** — see [Shipping mark UX](#shipping-mark-ux). Estimated effort: 1–2 hours.
2. **Pagination violations** — 4 sites request `limit=100`: [ShipmentsPage.tsx:92](../src/pages/shipments/ShipmentsPage/ShipmentsPage.tsx#L92), [BulkOrdersPage.tsx:153](../src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx#L153), [OrdersPage.tsx:88](../src/pages/orders/OrdersPage/OrdersPage.tsx#L88), [shipmentsService.ts:276](../src/services/shipmentsService.ts#L276). Wire proper `{ page, limit }` controls when you next touch these surfaces.
3. **`Cache-Control: no-store` on service worker (if any)** — verify [public/sw.js](../public/sw.js) (or any future SW) excludes `/api/v1/*` from caching.
4. **`useEffect` for data fetching** — currently zero; keep it that way.
5. **`/auth/sync` stray `fetch()`** — [ExternalSignUpPage.tsx:298](../src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx#L298) is the last non-service `fetch` call. Move into `authService.syncClerkSession()` next time you touch the file.
6. **`staleTime` audit** — 23 of 81 `useQuery` call sites set it explicitly. Per-resource defaults: settings → 5 min, dashboard → 30 s, notifications → 0.
7. **`Skeleton` primitive** — no `Skeleton` component exists yet; list/table pages fall back to `<PageLoader />` spinners. Worth shipping when you next touch a list page.
8. **`ReportsPage` lazy import** — biggest single bundle-size win (`recharts` lives in main bundle today because the page is statically imported).
9. **Retry CTA in 500/503 toasts** — `pushMessage` needs a `retry?: () => void` field; hook callers pass `() => mutation.mutate(lastVariables)`.
10. **Post-deploy manual smokes** (BE handover verification table — 6 still pending against staging):
    - No-MFA login → dashboard
    - TOTP login → dashboard
    - Recovery code login → dashboard + "9 codes left" warning
    - Superadmin first-login → forced enrollment + recovery-code ack
    - Payment-init kill-network-mid-request retry → `Idempotent-Replayed: true`
    - Pending / malicious file scan placeholders against staff UI

---

## Global behaviors to remember

- **Account lockout:** 5 failed password attempts → 15-min lockout on `/auth/login` and `/internal/auth/login`. Returns 423 with `lockedUntil` ISO extension. Rate limit is per-IP; lockout is per-account.
- **MFA:** required for `superadmin`. Optional for `staff`.
- **CORS:** origins from `CORS_ORIGINS` env. Methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Credentials allowed. Allowed request headers include `Content-Type`, `Authorization`, `Idempotency-Key`, `If-None-Match`, `cf-turnstile-response`. Exposes `Content-Disposition`, `X-Request-ID`, `Idempotent-Replayed`, `ETag`.
- **PII fields** (`firstName`, `lastName`, `phone`, addresses, emergency contacts, `nationalId`, `dateOfBirth`, `email`) are AES-256-GCM-encrypted at rest, decrypted only for authorised callers. **Do not log them client-side.**
- **Audit:** every 403 from `requireRole` is logged server-side. Sensitive admin actions also write audit entries.
- **Outbound calls** (e.g. Paystack init) use a hardened axios client — 30s timeout + 3-retry exponential backoff on 5xx/429/network. FE never sees the retries.
- **Observability:** `X-Request-ID` on every response (exposed via CORS); OpenTelemetry tracing kicks in when `OTEL_EXPORTER_OTLP_ENDPOINT` is set on the BE.

---

## How to use this doc

- **Adding a new FE feature?** Check the endpoint inventory above for the right method + path. If it's role-gated and your test user doesn't have the role, you'll get 403 — that's the right behaviour.
- **Adding a new endpoint?** Tick it here once it lands on the BE (`grep -nE "\.(get|post|put|patch|delete)\(['\"]" src/routes/*.routes.ts | wc -l` on the BE side gives the live count).
- **Diverging shape from this doc?** The OpenAPI spec at `/openapi.json` is auto-generated from Zod schemas and can't drift. Trust it over this file; PR a doc fix.
