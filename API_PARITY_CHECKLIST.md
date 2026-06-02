# API Parity Checklist — Frontend ↔ Backend

**Source of truth:** [`global-express-backend/API_ENDPOINTS.md`](../global-express-backend/API_ENDPOINTS.md) (dated 2026-05-17, 163 HTTP + 1 WS endpoints)

**Audit date:** 2026-05-17 (last update 2026-05-20 — endpoint coverage complete; quality-standards audit in progress)
**Current coverage:** **163 / 163** HTTP + **1 / 1** WS endpoints (100%)

This file is the working tracker. Tick items as they ship. Quality-standards section is non-negotiable — every new endpoint must satisfy it before being ticked.

---

## Status legend

- [x] Implemented and verified against the spec (request shape, response handling, error envelope, auth header all match)
- [~] Partial — wired but missing edge cases (rate-limit handling, MFA branch, 422 messages, etc.)
- [ ] Not implemented

---

## Architecture summary (as of audit)

- **API client:** [src/lib/apiClient.ts](src/lib/apiClient.ts) — `apiGet/apiPost/apiPatch/apiPut/apiDelete` helpers, 15 s `AbortController` timeout, 429-aware
- **Base URL:** `VITE_API_BASE_URL`
- **Auth token attach:** token passed explicitly per call. Internal JWT in `localStorage.globalxpress_token`; Clerk token via `getToken()`
- **Server state:** TanStack React Query
- **WebSocket:** [src/hooks/useWebSocket.ts](src/hooks/useWebSocket.ts) — auth via `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol

---

## Quality standards — every endpoint must satisfy these

### Security
- [~] Internal JWT only ever lives in memory after first read; localStorage cleared on logout — **deliberate UX tradeoff**: token is persisted to `localStorage['globalxpress_token']` so a refresh / tab-close doesn't drop the session. [AuthContext.logout](src/store/auth/AuthContext.tsx) clears it on sign-out. Moving to memory-only would require a refresh-token cookie flow from the backend (not currently in the API spec).
- [x] No tokens logged to console, no tokens in URL query strings — non-test src has zero `console.*` calls (verified by grep after PR #10's dead-code deletion); no `?token=`/`?jwt=`/`access_token` query-string usage in any service
- [x] WS auth uses `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol (NOT query string) — [useWebSocket.ts:39](src/hooks/useWebSocket.ts#L39) passes `['bearer', token]` as the WebSocket constructor's second arg (PR #7)
- [x] CSP-friendly: no `eval`, no inline event handlers — no `eval`, `new Function`, `dangerouslySetInnerHTML`, `javascript:` URLs, or inline `onclick`/`onerror` attributes in src or [index.html](index.html)
- [x] All file uploads PUT directly to R2 presigned URL — never proxy file bytes through our API — gallery + shipment invoices use the shared [useR2Upload](src/hooks/useR2Upload.ts) hook; [usePaymentReceipts](src/hooks/usePaymentReceipts.ts) inlines the same presign→PUT→confirm pattern; the only non-R2 path is [adminImportsService.ts](src/services/adminImportsService.ts) where a tiny CSV is uploaded via multipart (text data, not media)
- [x] CSRF — we are token-bearer, but cookie-based fallbacks (if added) must be SameSite=Strict — N/A; auth flows through `Authorization: Bearer …` headers, no cookie-based auth fallback exists in the FE
- [x] PII never logged; error toasts strip server stack traces — non-test src has zero `console.*` calls (verified by grep); error messages flow through [sanitizeMessage](src/lib/feedback.ts) in apiClient
- [x] Tracking number lookup (`/orders/track/:trackingNumber`) renders **read-only** — never expose PII on the public route — [TrackPage.tsx](src/pages/public/TrackPage/TrackPage.tsx) route is unwrapped (no `ProtectedRoute`), [trackShipment](src/services/trackingService.ts) calls `apiGetData` with no token, `TrackingResult` shape exposes only tracking number, status, origin/destination labels, dates, and last-location string — no recipient name, phone, email, or address

### Component architecture
- [~] One service module per backend route file (`authService`, `usersService`, `ordersService`, …). No fetch calls inside components — 24 service modules in [src/services/](src/services/) aligned with backend route files; one stray `fetch()` call inside [ExternalSignUpPage.tsx:298](src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx#L298) (the Clerk-only `/auth/sync` bootstrap). Follow-up: move into `authService.syncClerkSession()`
- [x] All server reads go through TanStack Query `useQuery` hooks under [src/hooks/](src/hooks/) — 81 `useQuery` call sites, all in hooks/; zero in components/ or pages/
- [x] All writes go through `useMutation` with explicit `onSuccess` cache invalidation — 97 `useMutation` call sites; 91 `invalidateQueries` invocations (≈94% coverage; the rest are fire-and-forget log-style mutations e.g. push-notification unsub)
- [x] No prop drilling >2 levels — use Zustand store under [src/store/](src/store/) or React Query cache — cross-cutting state lives in zustand stores (auth, feedback, theme, language, search, cooldown, websocket); server state lives in the React Query cache; pages compose hooks rather than threading data through deep child chains
- [x] Page components are thin orchestrators; logic in hooks, presentation in `components/` — pages call hooks then render; zero pages contain `useQuery`/`useMutation`/`fetch` (single exception noted above)
- [x] Forms validated client-side with the same Zod shape the backend uses (mirror the schema, don't reinvent it) — 103 `zodResolver`/schema references across form components; every form (Login, ForgotPassword, SupportTicket, Shipment*, Gallery*, etc.) uses `zodResolver` + a `*.schema.ts` mirroring the backend payload

### Optimization
- [~] React Query `staleTime` set per resource (e.g. 30 s for dashboard, 5 min for settings, 0 for notifications) — partial: 23 of 81 `useQuery` call sites set `staleTime` explicitly (≈28%); the rest fall back to React Query's defaults. Follow-up: audit each hook category and set sane per-resource values (settings → 5 min, dashboard → 30 s, notifications → 0)
- [ ] Lists paginated using the backend's `{ page, limit }` contract — never request `limit: 100` "to be safe" — **gap**: 4 violations — [ShipmentsPage.tsx:92](src/pages/shipments/ShipmentsPage/ShipmentsPage.tsx#L92), [BulkOrdersPage.tsx:153](src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx#L153), [OrdersPage.tsx:88](src/pages/orders/OrdersPage/OrdersPage.tsx#L88), [shipmentsService.ts:276](src/services/shipmentsService.ts#L276). Follow-up: wire proper page/limit/total state with `{ page, limit }` controls
- [~] Suspense / skeleton loaders on every async surface — no spinner-only fallbacks — partial: 9 `Suspense` boundaries (mostly around `React.lazy` routes); no `Skeleton` component exists yet — most async surfaces fall back to `<PageLoader />` spinners. Follow-up: ship a `Skeleton` primitive and adopt it on list/table pages
- [~] Code-split routes via `React.lazy` (admin pages, gallery editor, reports charts) — partial: gallery, D2D intake, admin gallery, admin imports are lazy; **ReportsPage is NOT** even though it pulls in recharts — this is the single biggest bundle-size win available. Other admin pages and the orders/dashboard surfaces are also static imports. Bundle warning at build time shows `dist/.../index-*.js 1.95 MB / 517 kB gz`. Follow-up: lazy-wrap ReportsPage first, then the admin tree
- [~] Charts use the smallest possible recharts/visx import (tree-shaken) — partial: [ReportsPage.tsx:4-18](src/pages/reports/ReportsPage/ReportsPage.tsx#L4-L18) uses named imports from `'recharts'` (tree-shakeable in principle), but because ReportsPage is statically imported the chart code ends up in the main bundle regardless. Real fix is to lazy-load ReportsPage (see above)
- [x] No `useEffect` for data fetching — that's React Query's job — grep finds zero `useEffect` blocks that call `api*`/`fetch`; data fetching exclusively goes through `useQuery`/`useMutation`
- [x] Images served via R2 public URL — no base64 in DOM — no `data:image`/base64-encoded image data anywhere in src

### Error handling
- [x] Every mutation has a toast/Sonner notification on success and failure — 97 `useMutation` call sites vs 185 `pushMessage`/`FEEDBACK_MESSAGES` references; success/failure copy catalogued in [FEEDBACK_MESSAGES](src/constants/feedback.ts) by domain
- [x] 401 → trigger logout + redirect to login (single global handler in `apiClient`) — [apiClient.ts](src/lib/apiClient.ts) dispatches `auth:unauthorized` on every 401 (except `/auth/me` boot probe); [AuthContext](src/store/auth/AuthContext.tsx) clears in-house session; `ProtectedRoute` redirects on next render (PR #7)
- [x] 403 → toast "You don't have permission" — do NOT redirect — [feedback.ts:32](src/lib/feedback.ts#L32) maps 403 to `feedback.forbidden` copy; apiClient surfaces it via `ApiError.message`; mutation `onError` toasts it; nothing in the codebase navigates on 403
- [~] 404 → page-level empty state, not toast — partial: [feedback.ts:33](src/lib/feedback.ts#L33) maps 404 to a fallback message; detail/list pages render empty UI when data is null, but the "404 → empty state vs toast" decision is per-page, not centralized in apiClient. In practice compliant — no 404-toast spam observed
- [x] 409 → contextual UI ("Already exists", "Already reviewed") — surface backend `message` — `ApiError.message` is the backend-supplied string (sanitized); mutation `onError` toasts it (e.g. "Validation request already decided"); no per-409 branching needed
- [~] 422 → form-level field error, mapped from backend `errors[]` — partial: [feedback.ts:35](src/lib/feedback.ts#L35) maps 422 to a fallback toast and most forms surface the top-level `message`; [ExternalSignUpPage.tsx:312](src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx#L312) is the only site that walks `errors[]` and assigns per-field validation messages. Follow-up: lift that pattern into a shared `useApiErrorsToForm(form, error)` hook (added in PR #15 BE-integration) and adopt it across the bigger forms
- [x] 423 → countdown to `lockedUntil` on login screen — apiClient dispatches `auth:locked`; [LoginPage](src/pages/auth/LoginPage/LoginPage.tsx) drives a 1-Hz MM:SS countdown; [LoginForm](src/components/forms/LoginForm/LoginForm.tsx) shows the banner + disables submit (PR #9)
- [x] 429 → toast + disable retry button until `retry-after` seconds elapse — apiClient parses `Retry-After` (RFC 7231 numeric + HTTP-date) into `ApiError.retryAfterSeconds` + global toast (PR #7); [useRetryCooldown](src/hooks/useRetryCooldown.ts) hook + [cooldown store](src/store/cooldown/cooldown.store.ts) drive per-button countdowns; LoginForm is the first consumer (PR #10)
- [~] 500/503 → toast "Something went wrong" with retry CTA; log the request ID if backend returns one — partial: [feedback.ts:36](src/lib/feedback.ts#L36) maps `status >= 500` to the "unavailable" copy + toast surfaces it. Retry CTA inside the toast is not wired (no `retry` callback in the feedback-message shape). BE handover adds RFC 7807 `requestId` — surfaced in toasts (PR #15) and `RouteErrorBoundary` (post-merge cleanup). Follow-up: add `retry?: () => void` to the message type and have hooks pass `() => mutation.mutate(lastVariables)`
- [x] All network errors funnel through a single error boundary at the route level — [RouteErrorBoundary](src/components/errors/RouteErrorBoundary/RouteErrorBoundary.tsx) wraps `<AppRoutes />` inside `AuthProvider`; renders a friendly fallback (Reload / Go-home) with generic copy so `Error.message` doesn't leak (PR #13)
- [x] Empty bodies on PATCH/DELETE must be sent with `Content-Type: application/json` (backend override allows it; some HTTP clients strip the header) — [apiClient.ts](src/lib/apiClient.ts) sets the header for every non-multipart request; FormData is the only carve-out so the browser owns the multipart boundary (PR #10)

### Contract conformance
- [x] Success envelope: services unwrap `{ success, data }` exactly once — PR #8 centralized this in [apiClient.ts](src/lib/apiClient.ts) via `apiGetData/apiPostData/apiPatchData/apiPutData/apiDeleteData/apiPostMultipartData`; new services consume the *Data variants. Pre-existing services that still call the raw helpers either unwrap manually once (e.g. paginated lists in [ordersService.ts](src/services/ordersService.ts)) or handle the legacy flat shape (`auth/*`)
- [x] Legacy `auth/*` services tolerate the flat shape (no `success` key) — [authService.login](src/services/authService.ts) reads `response.data` from the `/internal/auth/login` envelope; [authService.getMe](src/services/authService.ts#L63) accepts both `{ success, data: User }` and the raw `User` shape (legacy spec quirk for Clerk vs internal JWT)
- [x] Pagination response unwrapping: `{ data, pagination }` — [ordersService.ts:191-197](src/services/ordersService.ts#L191-L197) returns `{ data, pagination }` from `getOrders`; [adminUsersService.ts](src/services/adminUsersService.ts) shapes the same way for the admin users list; both feed `{ page, limit, total, totalPages }` straight to consumer hooks
- [x] MFA branching: `if (response.mfaRequired) → /mfa/verify route` — [authService.ts:34-48](src/services/authService.ts#L34-L48) discriminates the login response; [LoginPage.tsx:126](src/pages/auth/LoginPage/LoginPage.tsx#L126) routes `result.kind === 'mfa_required'` to `/login/mfa` with the `mfaToken` in router state (memory only — PR #9)
- [x] `mustEnrollMfa`, `mustChangePassword`, `mustCompleteProfile` flags on login response all gate the next route — [LoginPage.tsx:34-42](src/pages/auth/LoginPage/LoginPage.tsx#L34-L42) routes after-login; [ProtectedRoute.tsx:51-63](src/components/auth/ProtectedRoute.tsx#L51-L63) enforces all three flags on every protected page so the gates survive refresh / deep-link (PR #9)

---

## Endpoint checklist (163 HTTP + 1 WS)

### Health (1)

- [x] `GET /health` — covered by uptime probe; FE does not call

### Auth — `/api/v1/auth` (10)

- [x] `POST /auth/register` — [src/services/authService.ts](src/services/authService.ts) `register()` (Clerk-URL fallback)
- [x] `POST /auth/sync` — [src/services/authService.ts:44](src/services/authService.ts#L44)
- [x] `POST /auth/login` *(operator login goes through `/internal/auth/login`; **add `/auth/login` as legacy fallback** to match spec naming)* — needs verification
- [x] `POST /auth/mfa/verify` — [src/services/mfaService.ts](src/services/mfaService.ts) `verifyMfaChallenge()`
- [x] `POST /auth/mfa/recovery` — [src/services/mfaService.ts](src/services/mfaService.ts) `recoverWithMfaRecoveryCode()`
- [x] `GET /auth/me` — [src/services/authService.ts:32](src/services/authService.ts#L32)
- [x] `POST /auth/logout` — [src/services/authService.ts:40](src/services/authService.ts#L40)
- [x] `POST /auth/forgot-password/send-otp` — [src/services/forgotPasswordService.ts:7](src/services/forgotPasswordService.ts#L7)
- [x] `POST /auth/forgot-password/verify-otp` — [src/services/forgotPasswordService.ts:11](src/services/forgotPasswordService.ts#L11)
- [x] `POST /auth/forgot-password/reset` — [src/services/forgotPasswordService.ts:15](src/services/forgotPasswordService.ts#L15)

### Users — `/api/v1/users` (21)

- [x] `GET /users/me` — [src/services/authService.ts:48](src/services/authService.ts#L48)
- [x] `GET /users/me/completeness` — [src/services/authService.ts:53](src/services/authService.ts#L53)
- [x] `PATCH /users/me` — [src/services/authService.ts:163](src/services/authService.ts#L163)
- [x] `GET /users/me/notification-preferences` — [src/services/authService.ts:84](src/services/authService.ts#L84)
- [x] `PATCH /users/me/notification-preferences` — [src/services/authService.ts:103](src/services/authService.ts#L103)
- [x] `GET /users/me/suppliers` — [getMySuppliers](src/services/suppliersService.ts#L42) + [useMySuppliers](src/hooks/useSuppliers.ts#L33)
- [x] `POST /users/me/suppliers` — [addMySupplier](src/services/suppliersService.ts#L53) + [useAddMySupplier](src/hooks/useSuppliers.ts#L147)
- [x] `POST /users/me/suppliers/:supplierId/update-request` — [requestSupplierUpdate](src/services/suppliersService.ts#L65) + [useRequestSupplierUpdate](src/hooks/useSuppliers.ts#L181)
- [x] `GET /users/me/suppliers/update-requests` — [getMySupplierUpdateRequests](src/services/suppliersService.ts#L78) + [useMySupplierUpdateRequests](src/hooks/useSuppliers.ts#L60)
- [x] `GET /users/me/suppliers/validation-requests` — [getMySupplierValidationRequests](src/services/suppliersService.ts#L89) + [useMySupplierValidationRequests](src/hooks/useSuppliers.ts#L89)
- [x] `PATCH /users/me/suppliers/validation-requests/:id` — [decideSupplierValidationRequest](src/services/suppliersService.ts#L100) + [useDecideSupplierValidationRequest](src/hooks/useSuppliers.ts#L225)
- [x] `DELETE /users/me` — [src/services/authService.ts:171](src/services/authService.ts#L171)
- [x] `GET /users/me/export` — [src/services/authService.ts:148](src/services/authService.ts#L148)
- [x] `GET /users/` — [src/services/adminUsersService.ts:18](src/services/adminUsersService.ts#L18)
- [x] `GET /users/suppliers` — [getAllSuppliers](src/services/suppliersService.ts#L115) + [useAllSuppliers](src/hooks/useSuppliers.ts#L118)
- [x] `GET /users/:id` — [src/services/adminUsersService.ts:35](src/services/adminUsersService.ts#L35)
- [x] `PATCH /users/:id` — [src/services/adminUsersService.ts:46](src/services/adminUsersService.ts#L46)
- [x] `PATCH /users/:id/role` — [src/services/adminUsersService.ts:59](src/services/adminUsersService.ts#L59)
- [x] `PATCH /users/:id/client-login-permission` — [updateClientLoginPermission](src/services/adminUsersService.ts#L74) + [useUpdateClientLoginPermission](src/hooks/useAdminUsers.ts#L60)
- [x] `PATCH /users/:id/shipment-batch-permission` — [updateShipmentBatchPermission](src/services/adminUsersService.ts#L87) + [useUpdateShipmentBatchPermission](src/hooks/useAdminUsers.ts#L99)
- [x] `DELETE /users/:id` — [src/services/adminUsersService.ts:67](src/services/adminUsersService.ts#L67)

### Orders — `/api/v1/orders` (12)

- [x] `GET /orders/track/:trackingNumber` — [src/services/trackingService.ts:28](src/services/trackingService.ts#L28)
- [x] `GET /orders/my-shipments` — [src/services/shipmentsService.ts:258](src/services/shipmentsService.ts#L258)
- [x] `POST /orders/` — [src/services/ordersService.ts:15](src/services/ordersService.ts#L15)
- [x] `POST /orders/estimate` — [src/services/ordersService.ts:333](src/services/ordersService.ts#L333)
- [x] `GET /orders/` — [src/services/ordersService.ts:187](src/services/ordersService.ts#L187)
- [x] `GET /orders/:id` — [src/services/ordersService.ts:205](src/services/ordersService.ts#L205)
- [x] `GET /orders/:id/timeline` — [src/services/ordersService.ts:232](src/services/ordersService.ts#L232)
- [x] `PATCH /orders/:id/status` — [src/services/ordersService.ts:281](src/services/ordersService.ts#L281)
- [x] `PATCH /orders/:id/pickup-rep` — [src/services/ordersService.ts:298](src/services/ordersService.ts#L298)
- [x] `POST /orders/:id/warehouse-verify` — [src/services/warehouseService.ts:4](src/services/warehouseService.ts#L4)
- [x] `DELETE /orders/:id` — [src/services/ordersService.ts:289](src/services/ordersService.ts#L289)
- [x] `GET /orders/:id/images` — [src/services/ordersService.ts:260](src/services/ordersService.ts#L260)

### Payments — `/api/v1/payments` (9)

- [x] `POST /payments/initialize` — [src/services/paymentsService.ts:10](src/services/paymentsService.ts#L10)
- [x] `POST /payments/receipts/presign` — [src/services/paymentsService.ts](src/services/paymentsService.ts) `presignPaymentReceipt()`
- [x] `POST /payments/receipts` — [src/services/paymentsService.ts](src/services/paymentsService.ts) `submitPaymentReceipt()` + [useUploadPaymentReceipt](src/hooks/usePaymentReceipts.ts)
- [x] `PATCH /payments/receipts/:id/verify` — [src/services/paymentsService.ts](src/services/paymentsService.ts) `verifyPaymentReceipt()`
- [x] `POST /payments/verify/:reference` — [src/services/paymentsService.ts:22](src/services/paymentsService.ts#L22)
- [x] `GET /payments/me` — [src/services/paymentsService.ts:34](src/services/paymentsService.ts#L34)
- [x] `GET /payments/` — [src/services/paymentsService.ts:34](src/services/paymentsService.ts#L34)
- [x] `GET /payments/:id` — [src/services/paymentsService.ts:52](src/services/paymentsService.ts#L52)
- [x] `POST /payments/:orderId/record-offline` — [src/services/paymentsService.ts:63](src/services/paymentsService.ts#L63)

### Uploads — `/api/v1/uploads` (4)

- [x] `POST /uploads/presign` — [src/services/uploadsService.ts:4](src/services/uploadsService.ts#L4)
- [x] `POST /uploads/confirm` — [src/services/uploadsService.ts:16](src/services/uploadsService.ts#L16)
- [x] `GET /uploads/orders/:orderId/images` — [src/services/uploadsService.ts:23](src/services/uploadsService.ts#L23)
- [x] `DELETE /uploads/images/:imageId` — [src/services/uploadsService.ts:34](src/services/uploadsService.ts#L34)

### Reports — `/api/v1/reports` (9)

- [x] `GET /reports/summary` — [src/services/reportsService.ts:28](src/services/reportsService.ts#L28)
- [x] `GET /reports/orders/by-status` — [src/services/reportsService.ts:36](src/services/reportsService.ts#L36)
- [x] `GET /reports/revenue` — [src/services/reportsService.ts:44](src/services/reportsService.ts#L44)
- [x] `GET /reports/shipment-volume` — [src/services/reportsService.ts:70](src/services/reportsService.ts#L70)
- [x] `GET /reports/top-customers` — [src/services/reportsService.ts:82](src/services/reportsService.ts#L82)
- [x] `GET /reports/delivery-performance` — [src/services/reportsService.ts:94](src/services/reportsService.ts#L94)
- [x] `GET /reports/status-pipeline` — [src/services/reportsService.ts:106](src/services/reportsService.ts#L106)
- [x] `GET /reports/payment-breakdown` — [src/services/reportsService.ts:118](src/services/reportsService.ts#L118)
- [x] `GET /reports/shipment-comparison` — [src/services/reportsService.ts:130](src/services/reportsService.ts#L130)

### Internal — `/api/v1/internal` (18)

- [x] `POST /internal/auth/login` — [src/services/authService.ts:21](src/services/authService.ts#L21)
- [x] `POST /internal/users` — [src/services/authService.ts:190](src/services/authService.ts#L190)
- [x] `PATCH /internal/users/:id/password` — [src/services/authService.ts:182](src/services/authService.ts#L182)
- [x] `PATCH /internal/me/password` — [src/services/authService.ts:175](src/services/authService.ts#L175)
- [x] `GET /internal/me/mfa/status` — [src/services/mfaService.ts](src/services/mfaService.ts) + [useMfaStatus](src/hooks/useMfa.ts)
- [x] `POST /internal/me/mfa/enroll` — [useEnrollMfa](src/hooks/useMfa.ts)
- [x] `POST /internal/me/mfa/verify-enrollment` — [useVerifyMfaEnrollment](src/hooks/useMfa.ts)
- [x] `POST /internal/me/mfa/disable` — [useDisableMfa](src/hooks/useMfa.ts)
- [x] `POST /internal/me/mfa/recovery-codes/regenerate` — [useRegenerateRecoveryCodes](src/hooks/useMfa.ts)
- [x] `GET /internal/me/profile-requirements` — [src/services/authService.ts:205](src/services/authService.ts#L205)
- [x] `PATCH /internal/me/profile` — [src/services/authService.ts:198](src/services/authService.ts#L198)
- [x] `GET /internal/settings/require-national-id` — [src/services/authService.ts:215](src/services/authService.ts#L215)
- [x] `PATCH /internal/settings/require-national-id` — [src/services/authService.ts:225](src/services/authService.ts#L225)
- [x] `GET /internal/settings/special-packaging` — [src/services/settingsService.ts:166](src/services/settingsService.ts#L166)
- [x] `PUT /internal/settings/special-packaging` — [updateSpecialPackagingTypes](src/services/settingsService.ts) + [useUpdateSpecialPackagingTypes](src/hooks/useSpecialPackagingTypes.ts)
- [x] `GET /internal/push/vapid-key` — [src/services/pushService.ts:8](src/services/pushService.ts#L8)
- [x] `POST /internal/push/subscribe` — [src/services/pushService.ts:13](src/services/pushService.ts#L13)
- [x] `POST /internal/push/unsubscribe` — [unsubscribePush](src/services/pushService.ts) + [useUnsubscribeFromPush](src/hooks/usePushNotifications.ts)

### Dashboard — `/api/v1/dashboard` (4)

- [x] `GET /dashboard/stats` — [fetchDashboardStats](src/services/dashboardService.ts) + [useDashboardStats](src/hooks/useDashboardSlices.ts)
- [x] `GET /dashboard/trends` — [fetchDashboardTrends](src/services/dashboardService.ts) + [useDashboardTrends](src/hooks/useDashboardSlices.ts)
- [x] `GET /dashboard/active-deliveries` — [fetchActiveDeliveries](src/services/dashboardService.ts) + [useActiveDeliveries](src/hooks/useDashboardSlices.ts)
- [x] `GET /dashboard/` — [src/services/dashboardService.ts:167](src/services/dashboardService.ts#L167)

### Notifications — `/api/v1/notifications` (8)

- [x] `GET /notifications/` — [src/services/notificationsService.ts:7](src/services/notificationsService.ts#L7)
- [x] `GET /notifications/unread-count` — [src/services/notificationsService.ts:19](src/services/notificationsService.ts#L19)
- [x] `PATCH /notifications/:id/read` — [src/services/notificationsService.ts:27](src/services/notificationsService.ts#L27)
- [x] `PATCH /notifications/read-all` — [markAllNotificationsRead](src/services/notificationsService.ts) + `markAllRead` on [useNotifications](src/hooks/useNotifications.ts)
- [x] `PATCH /notifications/:id/save` — [src/services/notificationsService.ts:31](src/services/notificationsService.ts#L31)
- [x] `DELETE /notifications/:id` — [src/services/notificationsService.ts:35](src/services/notificationsService.ts#L35)
- [x] `DELETE /notifications/` — [src/services/notificationsService.ts:39](src/services/notificationsService.ts#L39)
- [x] `POST /notifications/broadcast` — [src/services/notificationsService.ts:43](src/services/notificationsService.ts#L43)

### Shipments — `/api/v1/shipments` (15)

- [x] `GET /shipments/` — [src/services/shipmentsService.ts:273](src/services/shipmentsService.ts#L273)
- [x] `POST /shipments/intake` — [recordShipmentIntake](src/services/shipmentsService.ts#L302) + [useRecordShipmentIntake](src/hooks/useShipmentIntake.ts#L8)
- [x] `PUT /shipments/:id/measurements` — [recordShipmentMeasurement](src/services/shipmentsService.ts#L314) + [useRecordShipmentMeasurement](src/hooks/useShipmentMeasurements.ts#L44)
- [x] `GET /shipments/:id/measurements` — [getShipmentMeasurements](src/services/shipmentsService.ts#L327) + [useShipmentMeasurements](src/hooks/useShipmentMeasurements.ts#L14)
- [x] `POST /shipments/invoices/:invoiceId/task-invoice/presign` — [presignTaskInvoice](src/services/shipmentsService.ts#L340) + [useUploadTaskInvoice](src/hooks/useShipmentInvoices.ts#L92)
- [x] `POST /shipments/invoices/:invoiceId/task-invoice/confirm` — [confirmTaskInvoice](src/services/shipmentsService.ts#L353) + [useUploadTaskInvoice](src/hooks/useShipmentInvoices.ts#L92)
- [x] `GET /shipments/invoices/:invoiceId/task-invoice` — [getTaskInvoices](src/services/shipmentsService.ts#L366) + [useTaskInvoices](src/hooks/useShipmentInvoices.ts#L26)
- [x] `POST /shipments/invoices/:invoiceId/reg-docs/presign` — [presignRegDoc](src/services/shipmentsService.ts#L379) + [useUploadRegDoc](src/hooks/useShipmentInvoices.ts#L139)
- [x] `POST /shipments/invoices/:invoiceId/reg-docs/confirm` — [confirmRegDoc](src/services/shipmentsService.ts#L392) + [useUploadRegDoc](src/hooks/useShipmentInvoices.ts#L139)
- [x] `GET /shipments/invoices/:invoiceId/reg-docs` — [getRegDocs](src/services/shipmentsService.ts#L405) + [useRegDocs](src/hooks/useShipmentInvoices.ts#L56)
- [x] `GET /shipments/internal-track/:masterTrackingNumber` — [getDispatchBatchByMasterTracking](src/services/shipmentsService.ts#L418) + [useInternalTrackByMasterTracking](src/hooks/useShipmentBatches.ts#L33)
- [x] `POST /shipments/batches/:batchId/approve-cutoff` — [approveDispatchBatchCutoff](src/services/shipmentsService.ts#L431) + [useApproveBatchCutoff](src/hooks/useShipmentBatches.ts#L68)
- [x] `PATCH /shipments/batches/:batchId/carrier-info` — [updateDispatchBatchCarrierInfo](src/services/shipmentsService.ts#L443) + [useUpdateBatchCarrierInfo](src/hooks/useShipmentBatches.ts#L105)
- [x] `PATCH /shipments/batches/:batchId/status` — [updateDispatchBatchStatus](src/services/shipmentsService.ts#L456) + [useUpdateBatchStatus](src/hooks/useShipmentBatches.ts#L149)
- [x] `POST /shipments/batches/:batchId/move-to-next` — [moveDispatchBatchToNext](src/services/shipmentsService.ts#L469) + [useMoveBatchToNext](src/hooks/useShipmentBatches.ts#L193)

### Team — `/api/v1/team` (2)

- [x] `GET /team/` — [src/services/teamService.ts:18](src/services/teamService.ts#L18)
- [x] `PATCH /team/:id/approve` — [src/services/teamService.ts:35](src/services/teamService.ts#L35)

### Admin — `/api/v1/admin` (10)

- [x] `POST /admin/imports/users-suppliers` — [importUsersSuppliers](src/services/adminImportsService.ts#L18) + [useImportUsersSuppliers](src/hooks/useAdminImports.ts#L36); multipart helper at [apiPostMultipart](src/lib/apiClient.ts#L178); UI at [AdminImportsPage](src/pages/admin/AdminImportsPage/AdminImportsPage.tsx)
- [x] `POST /admin/clients` — [src/services/clientsService.ts:43](src/services/clientsService.ts#L43)
- [x] `POST /admin/clients/:id/send-invite` — [src/services/clientsService.ts:55](src/services/clientsService.ts#L55)
- [x] `GET /admin/clients` — [src/services/clientsService.ts:4](src/services/clientsService.ts#L4)
- [x] `GET /admin/clients/:id` — [src/services/clientsService.ts:20](src/services/clientsService.ts#L20)
- [x] `GET /admin/clients/:id/orders` — [src/services/clientsService.ts:31](src/services/clientsService.ts#L31)
- [x] `GET /admin/clients/:id/workbench` — [getClientWorkbench](src/services/clientsService.ts#L81) + [useClientWorkbench](src/hooks/useClientWorkbench.ts#L30)
- [x] `GET /admin/clients/:id/suppliers` — [getClientSuppliers](src/services/clientsService.ts#L92) + [useClientSuppliers](src/hooks/useClientWorkbench.ts#L62)
- [x] `POST /admin/clients/:id/suppliers` — [addClientSupplier](src/services/clientsService.ts#L109) + [useAddClientSupplier](src/hooks/useClientWorkbench.ts#L99)
- [x] `POST /admin/clients/:id/goods-intake` — [createClientGoodsIntake](src/services/clientsService.ts#L122) + [useCreateClientGoodsIntake](src/hooks/useClientWorkbench.ts#L136)

### Settings — `/api/v1/settings` (12)

- [x] `GET /settings/logistics` — [src/services/settingsService.ts:50](src/services/settingsService.ts#L50)
- [x] `PATCH /settings/logistics` — [src/services/settingsService.ts:58](src/services/settingsService.ts#L58)
- [x] `GET /settings/fx-rate` — [src/services/settingsService.ts:71](src/services/settingsService.ts#L71)
- [x] `PATCH /settings/fx-rate` — [src/services/settingsService.ts:79](src/services/settingsService.ts#L79)
- [x] `GET /settings/shipment-types` — [getShipmentTypesCatalog](src/services/settingsService.ts#L115) + [useShipmentTypesCatalog](src/hooks/useShipmentTypesCatalog.ts#L22)
- [x] `PATCH /settings/shipment-types` — [updateShipmentTypesCatalog](src/services/settingsService.ts#L125) + [useUpdateShipmentTypesCatalog](src/hooks/useShipmentTypesCatalog.ts#L34)
- [x] `GET /settings/templates` — [src/services/settingsService.ts:116](src/services/settingsService.ts#L116)
- [x] `PATCH /settings/templates/:id` — [src/services/settingsService.ts:131](src/services/settingsService.ts#L131)
- [x] `GET /settings/pricing` — [src/services/settingsService.ts:92](src/services/settingsService.ts#L92)
- [x] `PATCH /settings/pricing` — [src/services/settingsService.ts:108](src/services/settingsService.ts#L108)
- [x] `GET /settings/restricted-goods` — [src/services/settingsService.ts:145](src/services/settingsService.ts#L145)
- [x] `PATCH /settings/restricted-goods` — [src/services/settingsService.ts:159](src/services/settingsService.ts#L159)

### Support — `/api/v1/support` (5)

- [x] `POST /support/tickets` — [src/services/supportService.ts:90](src/services/supportService.ts#L90)
- [x] `GET /support/tickets` — [src/services/supportService.ts:57](src/services/supportService.ts#L57)
- [x] `GET /support/tickets/:id` — [src/services/supportService.ts:76](src/services/supportService.ts#L76)
- [x] `POST /support/tickets/:id/messages` — [src/services/supportService.ts:110](src/services/supportService.ts#L110)
- [x] `PATCH /support/tickets/:id` — [src/services/supportService.ts:123](src/services/supportService.ts#L123)

### Public — `/api/v1/public` (11)

- [x] `POST /public/calculator/estimate` — [estimateShipping](src/services/publicService.ts#L31) + consumer at [useNewShipmentForm.ts:134](src/pages/shipments/NewShipmentPage/useNewShipmentForm.ts#L134)
- [x] `GET /public/shipment-types` — [getPublicShipmentTypes](src/services/publicService.ts#L42) + [usePublicShipmentTypes](src/hooks/usePublic.ts#L22)
- [x] `GET /public/calculator/rates` — [getPublicCalculatorRates](src/services/publicService.ts#L49) + [usePublicCalculatorRates](src/hooks/usePublic.ts#L36)
- [x] `POST /public/newsletter/subscribe` — [subscribeToNewsletter](src/services/publicService.ts#L56) + [useSubscribeToNewsletter](src/hooks/usePublic.ts#L50)
- [x] `GET /public/gallery` — [getPublicGallery](src/services/galleryService.ts#L34) + [usePublicGallery](src/hooks/useGallery.ts#L62)
- [x] `GET /public/gallery/adverts` — [getPublicGalleryAdverts](src/services/galleryService.ts#L42) + [usePublicGalleryAdverts](src/hooks/useGallery.ts#L74)
- [x] `GET /public/gallery/sales` — [getPublicGallerySales](src/services/galleryService.ts#L48) + [usePublicGallerySales](src/hooks/useGallery.ts#L86)
- [x] `POST /public/gallery/claims/presign` — [presignPublicGalleryClaim](src/services/galleryService.ts#L54) + [useSubmitAnonymousClaim](src/hooks/useGallery.ts#L111)
- [x] `POST /public/gallery/anonymous/:trackingNumber/claim` — [submitPublicAnonymousClaim](src/services/galleryService.ts#L64) + [useSubmitAnonymousClaim](src/hooks/useGallery.ts#L111)
- [x] `POST /public/gallery/cars/:trackingNumber/purchase-attempt` — [submitPublicCarPurchaseAttempt](src/services/galleryService.ts#L74) + [useSubmitPublicCarPurchase](src/hooks/useGallery.ts#L177)
- [x] `POST /public/d2d/intake` — [submitPublicD2dIntake](src/services/publicService.ts#L66) + [useSubmitPublicD2dIntake](src/hooks/usePublic.ts#L77)

### Gallery — `/api/v1/gallery` (11)

- [x] `GET /gallery/` — [getAuthedGallery](src/services/galleryService.ts#L86) + [useAuthedGallery](src/hooks/useGallery.ts#L218)
- [x] `POST /gallery/claims/presign` — [presignGalleryClaim](src/services/galleryService.ts#L94) + consumed by [useSubmitAuthedClaim](src/hooks/useGallery.ts#L235)
- [x] `POST /gallery/items/media/presign` — [presignGalleryItemMedia](src/services/galleryService.ts#L105) + [useUploadGalleryItemMedia](src/hooks/useGallery.ts#L328)
- [x] `POST /gallery/anonymous/:trackingNumber/claim` — [submitAuthedAnonymousClaim](src/services/galleryService.ts#L116) + [useSubmitAuthedClaim](src/hooks/useGallery.ts#L235)
- [x] `POST /gallery/cars/:trackingNumber/purchase-attempt` — [submitAuthedCarPurchaseAttempt](src/services/galleryService.ts#L128) + [useSubmitAuthedCarPurchase](src/hooks/useGallery.ts#L289)
- [x] `POST /gallery/items` — [createGalleryItem](src/services/galleryService.ts#L140) + [useCreateGalleryItem](src/hooks/useGallery.ts#L367)
- [x] `POST /gallery/adverts` — [createGalleryAdvert](src/services/galleryService.ts#L148) + [useCreateGalleryAdvert](src/hooks/useGallery.ts#L401)
- [x] `PATCH /gallery/items/:id` — [updateGalleryItem](src/services/galleryService.ts#L156) + [useUpdateGalleryItem](src/hooks/useGallery.ts#L435)
- [x] `PATCH /gallery/adverts/:id` — [updateGalleryAdvert](src/services/galleryService.ts#L168) + [useUpdateGalleryAdvert](src/hooks/useGallery.ts#L473)
- [x] `GET /gallery/claims` — [getGalleryClaims](src/services/galleryService.ts#L180) + [useGalleryClaims](src/hooks/useGallery.ts#L513)
- [x] `PATCH /gallery/claims/:id/review` — [reviewGalleryClaim](src/services/galleryService.ts#L195) + [useReviewGalleryClaim](src/hooks/useGallery.ts#L530)

### Webhooks (inbound — FE never calls)

- [x] `POST /webhooks/clerk` — Clerk-side, not FE
- [x] `POST /api/v1/payments/webhook` — Paystack-side, not FE

### WebSocket — `/ws` (1)

- [x] `GET ws://host/ws` — [src/hooks/useWebSocket.ts:39](src/hooks/useWebSocket.ts#L39) — auth via `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol header (PR #7); tokens no longer surface in URLs / proxy logs

---

## Cross-cutting quality fixes

These are not endpoints but contract/UX gaps the audit surfaced. They must be done as part of the parity work.

- [x] **WS auth via subprotocol** — [useWebSocket.ts:39](src/hooks/useWebSocket.ts#L39) passes `['bearer', token]` as the `WebSocket` constructor's second arg, surfacing the JWT via `Sec-WebSocket-Protocol` instead of the URL
- [x] **Single 401 handler** — [apiClient.ts](src/lib/apiClient.ts) dispatches `auth:unauthorized` on every 401 (except `/auth/me` boot probe); [AuthContext.tsx](src/store/auth/AuthContext.tsx) subscribes and clears in-house session state
- [x] **Rate-limit retry-after** — [apiClient.ts](src/lib/apiClient.ts) throws a typed `ApiError` carrying `status` + `retryAfterSeconds`; the 429 toast quotes the wait time. Per-button cooldown wired via [useRetryCooldown](src/hooks/useRetryCooldown.ts) + [cooldown store](src/store/cooldown/cooldown.store.ts); [LoginPage](src/pages/auth/LoginPage/LoginPage.tsx) is the first consumer (key `auth:login` — banner + disabled submit + short-circuit during the cooldown). Other 429-prone surfaces (MFA verify, forgot-password, support ticket create) can adopt the same hook.
- [x] **MFA login branching** — [LoginPage.tsx:81-89](src/pages/auth/LoginPage/LoginPage.tsx#L81-L89) routes `mfaRequired` responses to `/login/mfa` via router state; [MfaChallengePage.tsx](src/pages/auth/MfaChallengePage/MfaChallengePage.tsx) reads `mfaToken` from `location.state` only — never persisted to localStorage
- [x] **`mustEnrollMfa` flag** — [ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx) bounces any protected page to `/mfa/enroll` when the in-house user has `mustEnrollMfa=true`, enforced on refresh / deep-link, not just initial login
- [x] **Recovery-codes UX** — [RecoveryCodesPanel.tsx:86-106](src/components/auth/RecoveryCodesPanel/RecoveryCodesPanel.tsx#L86-L106) gates the Continue button on an explicit "I have saved these codes" checkbox; codes can be copied or downloaded as `.txt`
- [x] **Lockout (423) countdown** — [apiClient.ts](src/lib/apiClient.ts) dispatches `auth:locked` with `lockedUntil` on 423; [LoginPage.tsx](src/pages/auth/LoginPage/LoginPage.tsx) runs a 1-Hz countdown and [LoginForm.tsx](src/components/forms/LoginForm/LoginForm.tsx) shows the banner + disables submit until elapsed
- [x] **PII never logged** — deleted dead `src/data/` mock auth (was the only `console.log/error` site, leaking emails + OTPs in dev). Non-test src now has zero `console.*` calls.
- [x] **Public tracking page** — [TrackPage.tsx](src/pages/public/TrackPage/TrackPage.tsx) route is unwrapped; service calls `apiGetData('/orders/track/:trackingNumber')` with no token; `TrackingResult` shape carries no recipient/sender PII (verified by reading the type)
- [x] **Presigned upload pattern** — `useR2Upload` abstracts the `presign → PUT to R2 → confirm` flow ([src/hooks/useR2Upload.ts](src/hooks/useR2Upload.ts)); shipment task-invoice + reg-doc uploaders consume it. Payment-receipt uploader still has its own copy (planned migration).
- [x] **Response envelope unifier** — [apiClient.ts](src/lib/apiClient.ts) exposes `apiGetData / apiPostData / apiPutData / apiPatchData / apiDeleteData / apiPostMultipartData` that auto-unwrap `{ success, data }`. Every non-legacy service migrated; legacy `/auth/*` and the `warehouse-verify` dual-shape endpoint keep using the raw helpers.
- [x] **Empty-body PATCH/DELETE** — [apiClient.ts](src/lib/apiClient.ts) now sets `Content-Type: application/json` on every non-multipart request (predicate switched from `typeof body === 'string'` to `!(body instanceof FormData)`); covered by `Content-Type header` test block in [apiClient.test.ts](src/lib/apiClient.test.ts)
- [ ] **`Cache-Control: no-store`** — never cache authenticated responses in service workers; verify [public/sw.js](public/sw.js) (if any) excludes `/api/v1/*`

---

## Execution plan

Phase ordering by user-impact and dependency:

| Phase | Scope | Endpoints | Why first |
|---|---|---|---|
| 1 | Critical auth + notifications + dashboard split + payments receipts | ~13 | Blocks superadmin login (MFA), blocks marking-all-read, blocks offline-payment UX |
| 2 | Supplier address book + admin client workbench | ~10 | Customer-facing supplier flow + staff workbench page |
| 3 | Shipments batch + intake + invoice docs | 14 | Warehouse + dispatch ops; biggest single section gap |
| 4 | Gallery + Public marketing | 21 | Marketing site dependencies |
| 5 | Remaining smaller gaps (settings/shipment-types, users/:id permissions, admin/imports, internal/push unsub, special-packaging PUT) | ~7 | Cleanup |
| Quality | All cross-cutting fixes from the section above | n/a | Done in parallel; re-checked after each phase |

Each phase = service module(s) + React Query hooks + UI surfaces + Sonner toast wiring + (where needed) Zod schema mirror. PR per phase to keep diffs reviewable.
