# API Parity Checklist — Frontend ↔ Backend

**Source of truth:** [`global-express-backend/API_ENDPOINTS.md`](../global-express-backend/API_ENDPOINTS.md) (dated 2026-05-17, 163 HTTP + 1 WS endpoints)

**Audit date:** 2026-05-17 (last update 2026-05-18 — Phase 1 complete)
**Current coverage:** 94 / 164 endpoints (≈57%) + 1 WS connected

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
- **WebSocket:** [src/hooks/useWebSocket.ts](src/hooks/useWebSocket.ts) — currently passes token via `?token=` query param (should move to `Sec-WebSocket-Protocol: bearer, <jwt>` per spec)

---

## Quality standards — every endpoint must satisfy these

### Security
- [ ] Internal JWT only ever lives in memory after first read; localStorage cleared on logout
- [ ] No tokens logged to console, no tokens in URL query strings
- [ ] WS auth uses `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol (NOT query string)
- [ ] CSP-friendly: no `eval`, no inline event handlers
- [ ] All file uploads PUT directly to R2 presigned URL — never proxy file bytes through our API
- [ ] CSRF — we are token-bearer, but cookie-based fallbacks (if added) must be SameSite=Strict
- [ ] PII never logged; error toasts strip server stack traces
- [ ] Tracking number lookup (`/orders/track/:trackingNumber`) renders **read-only** — never expose PII on the public route

### Component architecture
- [ ] One service module per backend route file (`authService`, `usersService`, `ordersService`, …). No fetch calls inside components.
- [ ] All server reads go through TanStack Query `useQuery` hooks under [src/hooks/](src/hooks/)
- [ ] All writes go through `useMutation` with explicit `onSuccess` cache invalidation
- [ ] No prop drilling >2 levels — use Zustand store under [src/store/](src/store/) or React Query cache
- [ ] Page components are thin orchestrators; logic in hooks, presentation in `components/`
- [ ] Forms validated client-side with the same Zod shape the backend uses (mirror the schema, don't reinvent it)

### Optimization
- [ ] React Query `staleTime` set per resource (e.g. 30 s for dashboard, 5 min for settings, 0 for notifications)
- [ ] Lists paginated using the backend's `{ page, limit }` contract — never request `limit: 100` "to be safe"
- [ ] Suspense / skeleton loaders on every async surface — no spinner-only fallbacks
- [ ] Code-split routes via `React.lazy` (admin pages, gallery editor, reports charts)
- [ ] Charts use the smallest possible recharts/visx import (tree-shaken)
- [ ] No `useEffect` for data fetching — that's React Query's job
- [ ] Images served via R2 public URL — no base64 in DOM

### Error handling
- [ ] Every mutation has a toast/Sonner notification on success and failure
- [ ] 401 → trigger logout + redirect to login (single global handler in `apiClient`)
- [ ] 403 → toast "You don't have permission" — do NOT redirect
- [ ] 404 → page-level empty state, not toast
- [ ] 409 → contextual UI ("Already exists", "Already reviewed") — surface backend `message`
- [ ] 422 → form-level field error, mapped from backend `errors[]`
- [ ] 423 → countdown to `lockedUntil` on login screen
- [ ] 429 → toast + disable retry button until `retry-after` seconds elapse
- [ ] 500/503 → toast "Something went wrong" with retry CTA; log the request ID if backend returns one
- [ ] All network errors funnel through a single error boundary at the route level
- [ ] Empty bodies on PATCH/DELETE must be sent with `Content-Type: application/json` (backend override allows it; some HTTP clients strip the header)

### Contract conformance
- [ ] Success envelope: services unwrap `{ success, data }` exactly once
- [ ] Legacy `auth/*` services tolerate the flat shape (no `success` key)
- [ ] Pagination response unwrapping: `{ data, pagination }`
- [ ] MFA branching: `if (response.mfaRequired) → /mfa/verify route`
- [ ] `mustEnrollMfa`, `mustChangePassword`, `mustCompleteProfile` flags on login response all gate the next route

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
- [ ] `GET /users/me/suppliers`
- [ ] `POST /users/me/suppliers`
- [ ] `POST /users/me/suppliers/:supplierId/update-request`
- [ ] `GET /users/me/suppliers/update-requests`
- [ ] `GET /users/me/suppliers/validation-requests`
- [ ] `PATCH /users/me/suppliers/validation-requests/:id`
- [x] `DELETE /users/me` — [src/services/authService.ts:171](src/services/authService.ts#L171)
- [x] `GET /users/me/export` — [src/services/authService.ts:148](src/services/authService.ts#L148)
- [x] `GET /users/` — [src/services/adminUsersService.ts:18](src/services/adminUsersService.ts#L18)
- [ ] `GET /users/suppliers` (admin-scoped supplier list)
- [x] `GET /users/:id` — [src/services/adminUsersService.ts:35](src/services/adminUsersService.ts#L35)
- [x] `PATCH /users/:id` — [src/services/adminUsersService.ts:46](src/services/adminUsersService.ts#L46)
- [x] `PATCH /users/:id/role` — [src/services/adminUsersService.ts:59](src/services/adminUsersService.ts#L59)
- [ ] `PATCH /users/:id/client-login-permission`
- [ ] `PATCH /users/:id/shipment-batch-permission`
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
- [ ] `POST /shipments/intake`
- [ ] `PUT /shipments/:id/measurements`
- [ ] `GET /shipments/:id/measurements`
- [ ] `POST /shipments/invoices/:invoiceId/task-invoice/presign`
- [ ] `POST /shipments/invoices/:invoiceId/task-invoice/confirm`
- [ ] `GET /shipments/invoices/:invoiceId/task-invoice`
- [ ] `POST /shipments/invoices/:invoiceId/reg-docs/presign`
- [ ] `POST /shipments/invoices/:invoiceId/reg-docs/confirm`
- [ ] `GET /shipments/invoices/:invoiceId/reg-docs`
- [ ] `GET /shipments/internal-track/:masterTrackingNumber`
- [ ] `POST /shipments/batches/:batchId/approve-cutoff`
- [ ] `PATCH /shipments/batches/:batchId/carrier-info`
- [ ] `PATCH /shipments/batches/:batchId/status`
- [ ] `POST /shipments/batches/:batchId/move-to-next`

### Team — `/api/v1/team` (2)

- [x] `GET /team/` — [src/services/teamService.ts:18](src/services/teamService.ts#L18)
- [x] `PATCH /team/:id/approve` — [src/services/teamService.ts:35](src/services/teamService.ts#L35)

### Admin — `/api/v1/admin` (10)

- [ ] `POST /admin/imports/users-suppliers` — bulk CSV upload (dry-run + real)
- [x] `POST /admin/clients` — [src/services/clientsService.ts:43](src/services/clientsService.ts#L43)
- [x] `POST /admin/clients/:id/send-invite` — [src/services/clientsService.ts:55](src/services/clientsService.ts#L55)
- [x] `GET /admin/clients` — [src/services/clientsService.ts:4](src/services/clientsService.ts#L4)
- [x] `GET /admin/clients/:id` — [src/services/clientsService.ts:20](src/services/clientsService.ts#L20)
- [x] `GET /admin/clients/:id/orders` — [src/services/clientsService.ts:31](src/services/clientsService.ts#L31)
- [ ] `GET /admin/clients/:id/workbench`
- [ ] `GET /admin/clients/:id/suppliers`
- [ ] `POST /admin/clients/:id/suppliers`
- [ ] `POST /admin/clients/:id/goods-intake`

### Settings — `/api/v1/settings` (12)

- [x] `GET /settings/logistics` — [src/services/settingsService.ts:50](src/services/settingsService.ts#L50)
- [x] `PATCH /settings/logistics` — [src/services/settingsService.ts:58](src/services/settingsService.ts#L58)
- [x] `GET /settings/fx-rate` — [src/services/settingsService.ts:71](src/services/settingsService.ts#L71)
- [x] `PATCH /settings/fx-rate` — [src/services/settingsService.ts:79](src/services/settingsService.ts#L79)
- [ ] `GET /settings/shipment-types`
- [ ] `PATCH /settings/shipment-types`
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

- [x] `POST /public/calculator/estimate` — [src/services/ordersService.ts:333](src/services/ordersService.ts#L333) *(verify this hits the public route, not the authed one)*
- [ ] `GET /public/shipment-types`
- [ ] `GET /public/calculator/rates`
- [ ] `POST /public/newsletter/subscribe`
- [ ] `GET /public/gallery`
- [ ] `GET /public/gallery/adverts`
- [ ] `GET /public/gallery/sales`
- [ ] `POST /public/gallery/claims/presign`
- [ ] `POST /public/gallery/anonymous/:trackingNumber/claim`
- [ ] `POST /public/gallery/cars/:trackingNumber/purchase-attempt`
- [ ] `POST /public/d2d/intake`

### Gallery — `/api/v1/gallery` (11)

- [ ] `GET /gallery/`
- [ ] `POST /gallery/claims/presign`
- [ ] `POST /gallery/items/media/presign`
- [ ] `POST /gallery/anonymous/:trackingNumber/claim`
- [ ] `POST /gallery/cars/:trackingNumber/purchase-attempt`
- [ ] `POST /gallery/items`
- [ ] `POST /gallery/adverts`
- [ ] `PATCH /gallery/items/:id`
- [ ] `PATCH /gallery/adverts/:id`
- [ ] `GET /gallery/claims`
- [ ] `PATCH /gallery/claims/:id/review`

### Webhooks (inbound — FE never calls)

- [x] `POST /webhooks/clerk` — Clerk-side, not FE
- [x] `POST /api/v1/payments/webhook` — Paystack-side, not FE

### WebSocket — `/ws` (1)

- [~] `GET ws://host/ws` — [src/hooks/useWebSocket.ts:39](src/hooks/useWebSocket.ts#L39) — works but auth must move from `?token=` query to `Sec-WebSocket-Protocol: bearer, <jwt>` subprotocol header (spec requirement, security concern: tokens in URLs land in logs/proxies)

---

## Cross-cutting quality fixes

These are not endpoints but contract/UX gaps the audit surfaced. They must be done as part of the parity work.

- [ ] **WS auth via subprotocol** — rewrite [useWebSocket.ts](src/hooks/useWebSocket.ts) to pass `['bearer', token]` as the `WebSocket` constructor's second arg instead of `?token=`
- [ ] **Single 401 handler** — when `apiClient` sees 401, dispatch a global logout event and route to `/login`. Today this is per-caller.
- [ ] **Rate-limit retry-after** — current 429 toast doesn't honor `retry-after`; disable the originating button for N seconds
- [ ] **MFA login branching** — `/internal/auth/login` and `/auth/login` responses with `mfaRequired: true` must route to a new `/login/mfa` screen that holds the `mfaToken` in memory only (never localStorage)
- [ ] **`mustEnrollMfa` flag** — when present on a login response, gate dashboard access behind the MFA enrollment flow
- [ ] **Recovery-codes UX** — when `/mfa/verify-enrollment` returns codes, force user to confirm download/copy before the modal can close. Codes are shown ONCE.
- [ ] **Lockout (423) countdown** — show `lockedUntil` as a live countdown on the login screen; disable submit until elapsed
- [ ] **PII never logged** — audit all `console.log/error` for token, email, address values
- [ ] **Public tracking page** — confirm `/orders/track/:trackingNumber` page does not require auth and does not render PII (recipient address, phone)
- [ ] **Presigned upload pattern** — abstract `presign → PUT to R2 → confirm` into a single `useR2Upload` hook so every uploader uses identical retry/timeout/progress logic
- [ ] **Response envelope unifier** — move `{ success, data }` unwrap into `apiClient` instead of each service re-implementing it (legacy `auth/*` exceptions still possible via a flag)
- [ ] **Empty-body PATCH/DELETE** — verify `apiClient` always sends `Content-Type: application/json` even when body is `undefined`, so backend's empty-body override applies
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
