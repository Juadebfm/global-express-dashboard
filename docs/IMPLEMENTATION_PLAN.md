# FE implementation plan — backend-state alignment (2026-06-03)

Companion doc to [BACKEND_API_STATE.md](BACKEND_API_STATE.md). Captures the open FE gaps as a phased, PR-sized backlog so we can land them in reviewable chunks without thrash.

**Source of items:** [BACKEND_API_STATE.md § Open FE gaps](BACKEND_API_STATE.md#open-fe-gaps-to-close) + [§ Backend handover delta](BACKEND_API_STATE.md#backend-handover-delta).

**How to use:**

- Phases are roughly user-impact ordered. Within a phase, PRs can land in any order unless an explicit dependency is noted.
- One PR per row, scoped tight on purpose — easier to review, easier to revert.
- Tick the `Status` column as work lands. Quote the merged PR # next to each item once shipped.

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Shipped (+ PR#) · ⏸ Deferred (with reason)

---

## Phase 1 — BE handover loose ends

**Goal:** close out the only items from the BE handover that aren't fully shipped. Highest priority — backend contract already supports them; FE is the only thing missing.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| ✅ | `feat(profile): editable shipping mark with one-time lock` (commit `e4d0a8e`) | On `GET /users/me` show `shippingMark` and branch on `shippingMarkUserEditedAt`: `null` → editable input + client-side regex `^[a-z][a-z0-9]{2,19}$` validation; non-null → read-only chip + "Contact support" link. On 409 from `PATCH /users/me { shippingMark }`, refetch profile and re-render the locked UI. Auto-lowercase user input. | ① Customer with `shippingMarkUserEditedAt: null` sees editable field pre-filled with current mark. ② Submit valid mark → 200, field becomes read-only, server reflects updated timestamp. ③ Submit again → 409, FE refetches and shows locked UI. ④ Submit invalid format → client error surface (no round-trip). ⑤ Lowercase normalisation on `JUADEB` → `juadeb`. | ~1–2h |

> Once Phase 1 is shipped, the BE handover delta in `BACKEND_API_STATE.md` flips to "all shipped except `?sort=` (deferred)".

---

## Phase 2 — Quick wins

**Goal:** independent ~30-min improvements that close real gaps without touching cross-cutting code.

**Status (audited 2026-06-03):** all three items resolved with no new code — the BACKEND_API_STATE.md gap list was stale at the time it was authored. See findings below; the doc has been corrected.

| Status | PR title | Resolution |
|---|---|---|
| ✅ | `refactor(auth): move /auth/sync into authService` | Already done. [ExternalSignUpPage.tsx](../src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx) imports `syncClerkAccount` from `@/services` and calls it with proper `ApiError` handling (including 422 `problem.errors[].path` walking). The remaining bare `fetch()` call sites in `src/hooks/` are all R2 presigned-URL PUTs — those are intentional (file bytes must not be proxied through our API). |
| ✅ | `perf(reports): lazy-load ReportsPage` | Already done. `ReportsPage` is `React.lazy`-imported in [App.tsx:87](../src/App.tsx#L87) with a comment explaining recharts is the reason. Build output shows it in its own chunk. |
| ✅ | `chore(sw): cache-control no-store guard on /api/v1/*` | N/A. [public/sw.js](../public/sw.js) is a push-only worker (`push` + `notificationclick` listeners). It has no `fetch` event listener and intercepts no network requests, so there's nothing to cache and nothing to guard. Revisit if a caching SW is ever added. |

---

## Phase 3 — Pagination compliance

**Goal:** stop asking for `limit=100`. Four pages today ignore the backend's `{ page, limit }` contract; each gets its own PR so we can review independently and ship as the surface owners get free.

**Dependency:** none — each PR is isolated to its own page + service call site.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| 🟡 | `feat(shipments): paginate ShipmentsPage list` | [ShipmentsPage.tsx:92](../src/pages/shipments/ShipmentsPage/ShipmentsPage.tsx#L92) currently passes `limit: 100`. Replace with proper `{ page, limit }` state + pagination controls (Prev/Next + page indicator). Default `limit=20`. Wire to existing `pagination` field on the response. | ① First load fetches `?page=1&limit=20`. ② Prev/Next change `page` query and refetch. ③ Page indicator reads `pagination.totalPages`. ④ URL reflects page (querystring) so refresh keeps position. | ~1–2h |
| 🟡 | `feat(orders): paginate OrdersPage list` | Same pattern for [OrdersPage.tsx:88](../src/pages/orders/OrdersPage/OrdersPage.tsx#L88). | Same as above, for the orders list. | ~1–2h |
| ⬜ | `feat(bulk-orders): paginate BulkOrdersPage list` | Same pattern for [BulkOrdersPage.tsx:153](../src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx#L153). | Same as above, for bulk orders. | ~1–2h |
| ⬜ | `fix(shipmentsService): respect default limit on getShipments` | [shipmentsService.ts:276](../src/services/shipmentsService.ts#L276) hard-codes `limit: 100`. Remove the default; let callers pass `{ page, limit }`. Update any internal caller that relied on the implicit 100. | ① Service no longer mentions `limit: 100`. ② Default applied at call site, not in the service. ③ All callers compile. | ~30min |

> The 4 page PRs land in any order. If the same engineer happens to do two in a row, a single combined PR is fine.

---

## Phase 4 — UX polish

**Goal:** ship the patterns that should have been there from day one. These touch many files but each PR is mechanical.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| ⬜ | `ui(skeleton): add Skeleton primitive` | New `src/components/ui/Skeleton/` — animated placeholder block, accepts `width`/`height`/`className`. Storybook-equivalent demo on a single page. Adds to `ui/index.ts` barrel. | ① Component exports cleanly with TS types. ② Lint + typecheck pass. ③ Used at least once (smoke usage on a list-loading state). | ~30min |
| ⬜ | `ui(skeleton): adopt across list/table pages` | Replace `<PageLoader />` spinners on Shipments, Orders, BulkOrders, Reports, Notifications list-loading paths with `Skeleton` rows that match the final row layout. **Depends on the previous PR.** | ① No flicker between skeleton and real data. ② Pages no longer show centre-screen spinners on initial load. ③ Empty-state path still works (skeleton → empty state, not skeleton → infinite). | ~2h |
| ⬜ | `feedback(retry): add retry callback to 500/503 toasts` | Extend the feedback-message shape with `retry?: () => void`. Mutation `onError` hooks pass `() => mutation.mutate(lastVariables)` for transient errors (`status >= 500`). Toast renders an inline "Retry" button when `retry` is set. | ① 500-class error from a mutation surfaces a toast with a Retry button. ② Click → mutation re-fires with the same variables. ③ Non-500 errors don't render the button. | ~1h |

---

## Phase 5 — Cache tuning

**Goal:** stop relying on React Query's defaults where they don't match our backend's caching semantics.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| ⬜ | `perf(query): per-resource staleTime defaults` | Audit all 81 `useQuery` call sites. Group by resource type and set explicit `staleTime`: settings → 5 min, dashboard → 30 s, notifications → 0, reports → 30 s, lists → 30 s, detail views → 30 s. Document the convention in the touched hooks. | ① ≥95% of `useQuery` sites set `staleTime` explicitly. ② Bumping settings page → no refetch within 5 min. ③ Notifications still poll the way the bell expects. | ~2–3h |

---

## Phase 6 — Manual post-deploy verification (you, not me)

**Goal:** sign off the BE handover end-to-end against staging. These are click-throughs, not code — I can write the test plans but **you have to do them**.

| Status | Test | Expected outcome | Wired in |
|---|---|---|---|
| ⬜ | No-MFA login → dashboard | Reaches dashboard without prompts | PR #15 (A) + PR #16 (B) |
| ⬜ | TOTP login → dashboard | MFA challenge screen → enter 6-digit code → dashboard | PR #16 (B) |
| ⬜ | Recovery-code login | Login with recovery code → dashboard + "9 codes left" warning if at ≤2 | PR #16 (B) |
| ⬜ | Superadmin first-login | Forced through MFA enrollment, scans QR, sees 10 recovery codes, must check "I've saved them" before proceeding | PR #9 + PR #16 (B) |
| ⬜ | Payment-init kill-network mid-request, retry | Single Paystack transaction created; retry response carries `Idempotent-Replayed: true` header | PR #17 (C) |
| ⬜ | Staff opens unscanned receipt | Pending placeholder + auto-refresh, file not displayed | PR #19 (E) |
| ⬜ | Staff opens malicious receipt | Red warning, file not displayed | PR #19 (E) |
| ⬜ | Any error response in DevTools | `Content-Type: application/problem+json`, body has `type/title/status/detail/instance/requestId` | PR #15 (A) |

---

## Out of scope (deferred)

| Item | Why deferred |
|---|---|
| `?sort=` query param adoption | BE shipped the parser but no endpoint has opted in. Revisit when a sortable column UI is queued. |
| OpenAPI codegen for a typed FE client | Worthwhile follow-up to retire hand-written types, but orthogonal to launch. Track separately. |
| Replacing per-call `token` parameter with a fetch interceptor | Pure refactor, no contract change. Pick up when the auth surface is next opened. |

---

## Suggested execution order

If you want a "do this next" rule of thumb, work top-down through phases. Within each phase, PRs are independent — pick whatever's most ergonomic given what's already in your head.

1. **Phase 1** — ship the shipping-mark editor and close the handover for good.
2. **Phase 2** — bundle the three quick wins into a single afternoon (each is its own PR).
3. **Phase 3** — pagination fixes; happy place for a focused day or two.
4. **Phase 4** — UX polish; touches a lot but mechanical.
5. **Phase 5** — staleTime audit; bigger investment, lower urgency.
6. **Phase 6** — manual smokes against staging once Phases 1–4 are live.

After each PR, update this file (tick the Status column) so the next session can pick up cleanly.
