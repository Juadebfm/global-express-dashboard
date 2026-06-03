# Old documents — archived 2026-06-03

This file is the consolidated archive of four legacy markdown documents that lived in the FE repo before the backend-state rewrite. Each section below is the verbatim content of the original file. Once we confirm we've extracted everything we still care about into [BACKEND_API_STATE.md](BACKEND_API_STATE.md), all four originals will be deleted.

Originals merged here:

1. [`API_PARITY_CHECKLIST.md`](#1-api_parity_checklistmd) — endpoint-by-endpoint FE/BE parity tracker
2. [`BACKEND_INTEGRATION.md`](#2-backend_integrationmd) — PR A–E plan for the BE handover changes
3. [`REFACTOR_PLAN.md`](#3-refactor_planmd) — original FE-rewrite plan against backend v2
4. [`docs/PHASE_1_UX_CHANGES_CHECKLIST.md`](#4-phase_1_ux_changes_checklistmd) — Phase-1 dashboard UX checklist

> Note: `README.md` is intentionally **not** included — it is the live project readme and is not slated for deletion.

---

## 1. `API_PARITY_CHECKLIST.md`

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

> The endpoint checklist itself (163 / 163 ticked) is omitted from this archive — it duplicates the spec covered in [BACKEND_API_STATE.md](BACKEND_API_STATE.md). Pull the original from git history if you need the per-line FE → BE pointers.

---

## 2. `BACKEND_INTEGRATION.md`

# Backend Integration Tracker — REST standards + ASVS L2 pass

**Source handover:** received from backend team, 2026-05-20.
**Backend live at:** `https://global-express-backend-1.onrender.com` — contract verified stable.
**Spec source of truth:** [`global-express-backend/API_ENDPOINTS.md`](../global-express-backend/API_ENDPOINTS.md) (single source of truth) + live OpenAPI 3 at `https://global-express-backend-1.onrender.com/openapi.json`.
**Estimated FE effort:** 1–2 dev-days, ~6 PRs.

**Status (2026-06-02):** All 8 BE changes shipped. PRs #15–#19 (A–E) merged + cleanup PR follow-up. Test suite: 174/174.

---

## Status at a glance

| # | BE change | Status | PR |
|---|---|---|---|
| 1 | RFC 7807 Problem Details on every error | ✅ **Shipped** | [#15 (PR A)](https://github.com/Juadebfm/global-express-dashboard/pull/15) |
| 2 | `/auth/*` now wrapped in `{ success, data }` | ✅ **Shipped** | [#16 (PR B)](https://github.com/Juadebfm/global-express-dashboard/pull/16) |
| 3 | `Idempotency-Key` header on payment / order / ticket POST | ✅ **Shipped** | [#17 (PR C)](https://github.com/Juadebfm/global-express-dashboard/pull/17) |
| 4 | Cloudflare Turnstile on 5 public POST endpoints | ✅ **Shipped** | [#18 (PR D)](https://github.com/Juadebfm/global-express-dashboard/pull/18) |
| 5 | `X-Request-ID` shown in error UIs | ✅ **Shipped** (toasts in #15, `RouteErrorBoundary` in cleanup PR) | [#15](https://github.com/Juadebfm/global-express-dashboard/pull/15) + cleanup |
| 6 | File-scan gating before opening uploaded files | ✅ **Shipped** | [#19 (PR E)](https://github.com/Juadebfm/global-express-dashboard/pull/19) |
| 7 | MFA branches in login flow (now envelope-wrapped) | ✅ **Shipped** (folded into PR B) | [#16](https://github.com/Juadebfm/global-express-dashboard/pull/16) |
| 8 | `?sort=` query param — not yet wired | ⏸ **Deferred** — informational only; revisit when a sortable column is needed | n/a |

> The full per-PR implementation notes (action lists, acceptance criteria, dependency graphs) are preserved in the merged PRs and in git history of this file. The archived version above only carries the status table — pull the original from git if you need the original prose.

---

## 3. `REFACTOR_PLAN.md`

# Refactor Plan: Align Frontend with Backend API Manual (v2)

## Context

The backend has been rewritten. The frontend (~35% implemented against the full API surface) has mismatched endpoint paths, wrong data shapes, a simplified 3-status model vs the backend's 22-status V2 pipeline, and is missing entire modules (payments, bulk orders, warehouse verification, settings, reports, uploads, internal notifications, admin user management). This plan aligns all existing code and builds every missing module.

**Support tickets module is left completely untouched.**
**Inventory page has been deleted (was dead code with no backend).**

> All 15 phases below are complete as of the 2026-05-17 API parity audit. Granular ticked checkboxes preserved in git history; this archive carries only the phase headers + intent so future readers know the original sequencing.

---

- **Phase 0** — Foundation: V2 Status System + Utilities (✅)
- **Phase 1** — Auth Alignment (✅)
- **Phase 2** — Orders & Shipments Alignment (✅)
- **Phase 3** — Dashboard Data Shape Alignment (✅)
- **Phase 4** — Notification Type & Service Alignment (✅)
- **Phase 5** — Clients Service Alignment (✅)
- **Phase 6** — Team Service Alignment (✅)
- **Phase 7** — Warehouse Verification (✅)
- **Phase 8** — Payments (Paystack) (✅)
- **Phase 9** — Bulk Orders (✅)
- **Phase 10** — Reports (✅)
- **Phase 11** — Settings (Logistics, FX, Pricing, Templates, Restricted Goods) (✅)
- **Phase 12** — Uploads (Presigned R2 Flow) (✅)
- **Phase 13** — Internal Notifications (Admin Feed) (✅)
- **Phase 14** — Admin User Management (✅)
- **Phase 15** — Routing & Barrel Export Cleanup (✅)

## Implementation Order (original)

- Phases **0 → 1 → 2 → 3** must be sequential (each depends on the prior)
- Phase **4** (notifications) can run after Phase 0
- Phases **5, 6** (clients, team) can run after Phase 0
- Phases **7–14** (new modules) can run in any order after Phase 2
- Phase **15** (routing) runs last

## Verification gate (per phase)

- Run `npx tsc --noEmit` to verify type safety
- Run `npx vite build` to verify no build errors
- Manually test affected pages against the live backend

---

## 4. `PHASE_1_UX_CHANGES_CHECKLIST.md`

# Phase 1 UX Changes Checklist

## Goal
- Simplify dashboard UX so users can complete core actions faster with less confusion.
- Keep this phase frontend-only (no backend/API contract changes).

## Scope
- In scope: dashboard layout hierarchy, CTA prioritization, KPI simplification, table usability, empty-state guidance, basic navigation cleanup.
- Out of scope: new backend endpoints, data model changes, feature rewrites.

## Principles
- One clear primary action per screen.
- Reduce visual competition.
- Show next best action in every empty state.
- Keep patterns consistent across cards, tabs, and controls.

## Work Checklist (summary)

1. **Header Action Hierarchy** — one primary CTA in dashboard header, secondaries demoted (ghost/secondary). File: `src/pages/dashboard/components/DashboardHeader.tsx`. Note: `DashboardHeader.tsx` was updated, but the screenshoted "Home" experience appears to be a different UI path/component set and still needs targeted work there.
2. **Dashboard Content Priority** — reorder sections (quick actions / key status → active items → historical trends), reduce dead space. File: `src/pages/dashboard/DashboardPage/DashboardPage.tsx`.
3. **KPI Simplification** — limit default KPI cards to 3–4 highest-value, hide low-signal zero-value cards. Files: `KpiGrid.tsx`, `KpiCard.tsx`.
4. **Shipment List Clarity** — remove ambiguous global action icons, keep tabs clear (All / Pending / Active / Completed / Exception), action-oriented empty state. File: `DashboardShipmentList.tsx`.
5. **Navigation Simplification** ✅ — group sidebar items by workflow vs utility, preserve role-based logic. File: `src/components/layout/AppLayout/Sidebar.tsx`.
6. **Topbar Noise Reduction** ✅ — reduce competing emphasis between search/notifications/language/avatar. File: `src/components/layout/AppLayout/Topbar.tsx`.
7. **Empty-State UX Improvements** — action-oriented copy on KPI empty, active deliveries empty, shipment list empty.
8. **Visual Consistency Pass** — standardize card radius/border/shadow, heading sizes, button variants.

## QA Checklist (carried over)

- `npm run lint`
- `npm run typecheck`
- Desktop QA at 1280 / 1440 / 1920 px
- Mobile/Tablet QA — sidebar open/close, topbar controls, table horizontal behavior
- Verify no regression in role-based routes and nav visibility.

## Progress Tracker (as of archive)

- ✅ Phase 1 started
- ✅ 25% complete
- ◯ 50% complete
- ◯ 75% complete
- ◯ Phase 1 complete

---
