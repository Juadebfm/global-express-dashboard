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
| ✅ | `feat(shipments): paginate ShipmentsPage list` (commit `813b0d5`) | [ShipmentsPage.tsx:92](../src/pages/shipments/ShipmentsPage/ShipmentsPage.tsx#L92) currently passes `limit: 100`. Replace with proper `{ page, limit }` state + pagination controls (Prev/Next + page indicator). Default `limit=20`. Wire to existing `pagination` field on the response. | ① First load fetches `?page=1&limit=20`. ② Prev/Next change `page` query and refetch. ③ Page indicator reads `pagination.totalPages`. ④ URL reflects page (querystring) so refresh keeps position. | ~1–2h |
| ✅ | `feat(orders): paginate OrdersPage list` (commit `2ba6f6a`) | Same pattern for [OrdersPage.tsx:88](../src/pages/orders/OrdersPage/OrdersPage.tsx#L88). | Same as above, for the orders list. | ~1–2h |
| ✅ | `feat(bulk-orders): paginate BulkOrdersPage list` (commit `fe62eb2`) | Same pattern for [BulkOrdersPage.tsx:153](../src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx#L153). | Same as above, for bulk orders. | ~1–2h |
| ✅ | `fix(shipmentsService): respect default limit on getShipments` | Already addressed in PR 1 (commit `813b0d5`) — `DEFAULT_SHIPMENTS_PAGE_SIZE = 20` lives in the service, both customer + operator paths route through it, `limit: 100` is gone. **Audit also surfaced two more `limit=100` defaults in `teamService.getTeam` and `clientsService.getClients` that weren't in the original gap list** — their consumers (TeamPage, ClientsPage, the new-shipment customer picker) need pagination/search before the defaults can drop. See follow-ups below. | ① Service no longer mentions `limit: 100`. ② Default applied at call site, not in the service. ③ All callers compile. | done in PR 1 |

> The 4 page PRs land in any order. If the same engineer happens to do two in a row, a single combined PR is fine.

### Phase 3 follow-ups (discovered during audit)

These weren't in the original gap list but surfaced when I swept the codebase for `limit=100` in PR 4. They depend on their consumers being paginated first.

| Status | PR title | Scope | Effort |
|---|---|---|---|
| ⬜ | `feat(team): paginate TeamPage list` | Add `?page=N` + Pagination chrome to [TeamPage.tsx](../src/pages/team/TeamPage/TeamPage.tsx). Wire `useTeam` to surface `pagination` (same shape as `useOrders` after Phase 3 PR 2). Once landed, drop `getTeam`'s default `limit ?? 100` → `?? 20`. | ~1–2h |
| ⬜ | `feat(clients): paginate ClientsPage + replace customer picker with search-on-type` | Two halves: (a) paginate [ClientsPage](../src/pages/clients/ClientsPage/ClientsPage.tsx); (b) replace the customer-picker dropdowns in [BulkOrdersPage:185](../src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx#L185) and [useNewShipmentForm](../src/pages/shipments/NewShipmentPage/useNewShipmentForm.ts) with an async search hitting `/admin/clients?search=...`. Once landed, drop `getClients`'s default `limit ?? 100` → `?? 20`. | ~3–4h |

---

## Phase 4 — UX polish

**Goal:** ship the patterns that should have been there from day one. These touch many files but each PR is mechanical.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| ✅ | `ui(skeleton): add Skeleton primitive` (commit `3885aee`) | New `src/components/ui/Skeleton/` — animated placeholder block, accepts `width`/`height`/`className`. Storybook-equivalent demo on a single page. Adds to `ui/index.ts` barrel. | ① Component exports cleanly with TS types. ② Lint + typecheck pass. ③ Used at least once (smoke usage on a list-loading state). | ~30min |
| ✅ | `ui(skeleton): adopt on ShipmentsPage list load` (commit `990051e`) | Replace `<PageLoader />` spinners on Shipments, Orders, BulkOrders, Reports, Notifications list-loading paths with `Skeleton` rows that match the final row layout. **Depends on the previous PR.** **Scoped down to ShipmentsPage in the first cut** — the other four pages pipe list-loading through `AppShell.isLoading`, a different (more invasive) refactor that's better as its own follow-up per page. | ① No flicker between skeleton and real data. ② Pages no longer show centre-screen spinners on initial load. ③ Empty-state path still works (skeleton → empty state, not skeleton → infinite). | ~2h |
| ✅ | `feedback(retry): add retry callback to 500/503 toasts` (commit `58e2e33`) | Extend the feedback-message shape with `retry?: () => void`. Mutation `onError` hooks pass `() => mutation.mutate(lastVariables)` for transient errors (`status >= 500`). Toast renders an inline "Retry" button when `retry` is set. Centralised via `buildErrorFeedback` in `lib/feedback.ts` — the gate (only 5xx) lives in the helper so call sites just pass `err` + `retry` blindly. Adopted in `useRecordShipmentIntake` as the exemplar; other mutation hooks can swap in one-line at a time. | ① 500-class error from a mutation surfaces a toast with a Retry button. ② Click → mutation re-fires with the same variables. ③ Non-500 errors don't render the button. | ~1h |

---

## Phase 5 — Cache tuning

**Goal:** stop relying on React Query's defaults where they don't match our backend's caching semantics.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| ✅ | `perf(query): per-resource staleTime defaults` | Audit all `useQuery` call sites. Group by resource type and set explicit `staleTime` via the new `STALE_TIME` constants in [src/lib/queryDefaults.ts](../src/lib/queryDefaults.ts) — `ALWAYS_FRESH` (notifications), `REAL_TIME` 30 s (dashboard, lists, detail views, reports, support), `SLOW_MOVING` 5 min (settings + catalogs + user prefs), `STATIC` 30 min (public catalogs). 100% coverage: 0 `useQuery` sites without an explicit `staleTime`. | ① 100% of `useQuery` sites set `staleTime` explicitly. ② Bumping settings page → no refetch within 5 min. ③ Notifications still poll the way the bell expects. | ~2–3h |

---

## Phase 6 — Manual post-deploy verification (you, not me)

**Goal:** sign off the BE handover end-to-end against staging. These are click-throughs, not code — I can write the test plans but **you have to do them**.

**Printable checklist:** [docs/PHASE_6_SMOKE_TESTS.md](PHASE_6_SMOKE_TESTS.md) — full step-by-step with preconditions, expected results, and bonus checks. Test #8 is already pre-flighted via curl (see top of that doc).

| Status | Test | Expected outcome | Wired in |
|---|---|---|---|
| ⬜ | No-MFA login → dashboard | Reaches dashboard without prompts | PR #15 (A) + PR #16 (B) |
| ⬜ | TOTP login → dashboard | MFA challenge screen → enter 6-digit code → dashboard | PR #16 (B) |
| ⬜ | Recovery-code login | Login with recovery code → dashboard + "9 codes left" warning if at ≤2 | PR #16 (B) |
| ⬜ | Superadmin first-login | Forced through MFA enrollment, scans QR, sees 10 recovery codes, must check "I've saved them" before proceeding | PR #9 + PR #16 (B) |
| ⬜ | Payment-init kill-network mid-request, retry | Single Paystack transaction created; retry response carries `Idempotent-Replayed: true` header | PR #17 (C) |
| ⬜ | Staff opens unscanned receipt | Pending placeholder + auto-refresh, file not displayed | PR #19 (E) |
| ⬜ | Staff opens malicious receipt | Red warning, file not displayed | PR #19 (E) |
| ✅ | Any error response in DevTools | `Content-Type: application/problem+json`, body has `type/title/status/detail/instance/requestId` | PR #15 (A) — curl-verified 2026-06-03 |

---

## Out of scope (deferred)

| Item | Why deferred |
|---|---|
| `?sort=` query param adoption | BE shipped the parser but no endpoint has opted in. Revisit when a sortable column UI is queued. |
| OpenAPI codegen for a typed FE client | Worthwhile follow-up to retire hand-written types, but orthogonal to launch. Track separately. |
| Replacing per-call `token` parameter with a fetch interceptor | Pure refactor, no contract change. Pick up when the auth surface is next opened. |

---

## Phase 7 — RBAC hardening

**Goal:** close the gaps surfaced by the 2026-06-03 RBAC audit. Three real risks + a deferred set of smaller items.

**Surfaced from the audit:**

1. 🔴 React Query cache **not cleared on logout** — user-B can briefly see user-A's cached data on a same-browser switch (most query keys don't include `user.id`).
2. 🔴 **Zero RBAC tests.** 188 tests today, none cover route guards / nav gating / 403 handling.
3. 🟡 **145 scattered `user?.role === '…'` checks** across `src/`. No `can(action)` helper. Maintenance bomb.
4. 🟡 **Role demote mid-session** — FE doesn't refresh role on 403, user keeps seeing stale UI until reload.
5. 🟡 **Role upgrade mid-session** — new nav items don't appear until log out / in.
6. 🟢 **Supplier ≡ customer in the FE** — no distinct flow yet. Verify with PM before adding one.
7. 🟢 **"Must X" order is pwd/profile → MFA** (deliberate, but undocumented). Add an inline comment + acceptance.

| Status | PR title | Scope | Acceptance | Effort |
|---|---|---|---|---|
| 🟡 | `chore(auth): clear react-query cache on logout` | `AuthContext.logout` calls `queryClient.clear()` before clearing local state. Same on the `auth:unauthorized` (401) handler — token was revoked, all cached data is stale. Add a unit test asserting cache is empty after logout. | ① After logout, `queryClient.getQueryCache().getAll()` returns empty. ② After 401 dispatch, same. ③ Existing logout flow (BE `/auth/logout` call, localStorage clear, navigate) unchanged. | ~30min |
| 🟡 | `feat(auth): can(action) capability helper` | New `src/lib/permissions.ts` — a single capability map keyed by action (e.g. `orders.deleteImage`, `shipments.batch.manage`, `clients.invite`). Export `can(role, action)` + `useCan(action)` hook. Migrate ~5 high-traffic exemplars (OrdersPage, ShipmentsPage, AppLayout, ProfilePage, BulkOrdersPage). Other 140 call sites migrate piecemeal as their surfaces get touched — establishing the helper is what closes the gap. Add an ESLint rule (or doc note) discouraging new raw `role === '…'` checks. | ① `can()` covers every action mentioned in the audit. ② 5+ call sites migrated. ③ Unit tests cover the truth table (every role × every action). ④ Plan doc notes the migration debt for the remaining ~140 sites. | ~2–3h |
| ⬜ | `test(auth): RBAC route + nav + 403 coverage` | Add the missing test layer. ① `ProtectedRoute` — `user` accessing `allowedRoles=['staff']` → redirects to `redirectTo`. Customer accessing admin route → redirects. Missing role → /login. Must-enroll-MFA → /mfa/enroll. ② `AppLayout` — nav items rendered for each role match the per-role NAV arrays. ③ `AuthContext` — logout clears state + query cache. ④ Mutation 403 → `feedback.forbidden` toast + requestId. | ① ProtectedRoute test file with ≥6 cases. ② AppLayout nav-per-role test. ③ AuthContext logout test (depends on PR 1). ④ Mutation 403 test. ⑤ Suite stays green. | ~2–3h |

### Phase 7 follow-ups (deferred — smaller, less critical)

| Status | PR title | Scope |
|---|---|---|
| ⬜ | `feat(auth): refresh role on 403` | `apiClient` dispatches `auth:forbidden` on 403 (excluding the auth boot probe). `AuthContext` subscribes and calls `refreshUser()`. Demoted users catch up without a reload. |
| ⬜ | `feat(auth): periodic refreshUser` | Refresh on `document.visibilitychange` (when tab regains focus after >5 min idle). Role upgrades / status flag changes propagate without log-out/in. |
| ⬜ | `feat(supplier): distinct nav + onboarding (if PM wants)` | Verify with product first. If yes: separate `SUPPLIER_NAV` array + a supplier-specific landing. |

---

## Suggested execution order

If you want a "do this next" rule of thumb, work top-down through phases. Within each phase, PRs are independent — pick whatever's most ergonomic given what's already in your head.

1. **Phase 1** — ship the shipping-mark editor and close the handover for good.
2. **Phase 2** — bundle the three quick wins into a single afternoon (each is its own PR).
3. **Phase 3** — pagination fixes; happy place for a focused day or two.
4. **Phase 4** — UX polish; touches a lot but mechanical.
5. **Phase 5** — staleTime audit; bigger investment, lower urgency.
6. **Phase 6** — manual smokes against staging once Phases 1–4 are live.
7. **Phase 7** — RBAC hardening; do PR 1 (cache clear) FIRST since it's a one-liner with real security value, then PR 2 (capability helper), then PR 3 (tests) which builds on both.

After each PR, update this file (tick the Status column) so the next session can pick up cleanly.
