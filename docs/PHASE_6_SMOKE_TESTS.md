# Phase 6 — Post-deploy smoke tests

Manual click-through checklist for the 8 BE-handover verifications. Take this into a real browser against staging — these can't be automated meaningfully because they involve human-driven flows (MFA, captchas, kill-network mid-request, AV scans).

## Pre-flight (already passing as of 2026-06-03)

| ✅ | Check | How |
|---|---|---|
| ✅ | BE liveness | `curl https://global-express-backend-1.onrender.com/health` → 200 |
| ✅ | BE readiness (DB ping) | `curl https://global-express-backend-1.onrender.com/readiness` → 200 |
| ✅ | OpenAPI spec served | `curl https://global-express-backend-1.onrender.com/openapi.json` → 200 |
| ✅ | **Test #8** — error envelope | `curl -X POST /api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke@test","password":"bad"}'` returns `Content-Type: application/problem+json` with `type / title / status / detail / instance / requestId / errors[]` + `X-Request-ID` header. Verified [2026-06-03] — `requestId: req-aw`, type `/problems/validation`. |

## Preconditions you'll need

- **Staging dashboard URL** (production deploy at `app.globalexpress.kr` or the Vercel preview URL of this branch).
- **Test accounts** — list them out before starting so you don't bail out mid-test:
  - One **no-MFA operator** account (staff role, `mustEnrollMfa: false`).
  - One **TOTP-MFA operator** account (already enrolled). Have the authenticator app open.
  - One **superadmin** account with **MFA not yet enrolled** (clean state — will be forced through enrollment). Don't reuse a real superadmin; create a throwaway via `/internal/users` first.
  - One **customer** account (Clerk session) for the payment-idempotency test.
- **A Korean warehouse staff** session OR superadmin session for the file-scan tests.
- **DevTools open with Network tab** for every test. Filter to `/api/v1/*`.

---

## 1. No-MFA login → dashboard

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #15 (A) + PR #16 (B) |

**Steps**
1. Go to `/login` (operator login).
2. Enter the no-MFA operator's email + password.
3. Submit.

**Expected**
- Single `POST /internal/auth/login` request, 200 response wrapped as `{ success: true, data: { user, tokens } }`.
- `data.mfaRequired` is absent / false.
- Navigates straight to `/dashboard`.
- No console errors, no toast.

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 2. TOTP login → dashboard

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #16 (B) |

**Steps**
1. Go to `/login`.
2. Enter the TOTP-MFA operator's email + password.
3. Submit.
4. On the MFA challenge screen, enter the 6-digit code from the authenticator app.

**Expected**
- First call: `POST /internal/auth/login` → 200, body `{ success: true, data: { mfaRequired: true, mfaToken: "…", userId: "…" } }`.
- FE navigates to `/login/mfa` with `mfaToken` in router state (NOT in localStorage — check Application → Local Storage; nothing called `mfaToken`).
- Code entry → `POST /auth/mfa/verify` → 200, body `{ success: true, data: { user, tokens } }`.
- Land on dashboard.

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 3. Recovery-code login

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #16 (B) |

**Steps**
1. Log in as the TOTP-MFA operator, get to the MFA challenge screen.
2. Click "Use a recovery code".
3. Enter one of the 10 saved recovery codes for that account.

**Expected**
- `POST /auth/mfa/recovery` → 200, body `{ success: true, data: { user, tokens, remainingRecoveryCodes: N } }`.
- Dashboard loads.
- If `remainingRecoveryCodes ≤ 2`, a visible warning prompts the user to regenerate codes.

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 4. Superadmin first-login → forced MFA enrollment

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #9 + PR #16 (B) |

**Steps**
1. Log in as the throwaway superadmin (MFA not enrolled).
2. After the regular login response, FE should auto-redirect.
3. Scan the QR code into an authenticator app (or copy the `secret` displayed beside it).
4. Type the first 6-digit code.
5. The next screen shows 10 recovery codes.
6. Try clicking "Continue" without checking the "I've saved them" box → it should be disabled.
7. Check the box, then click Continue.

**Expected**
- After login: navigation to `/mfa/enroll` (the user's `mustEnrollMfa` flag is true; `ProtectedRoute` enforces this on every protected page, so deep-linking elsewhere also redirects here).
- `POST /internal/me/mfa/enroll` → 200 with `{ secret, otpauthUri }`.
- After entering the code: `POST /internal/me/mfa/verify-enrollment` → 200 with `{ enabled: true, recoveryCodes: [10 codes], warning }`.
- Continue button is **disabled** until the ack checkbox is ticked.
- Codes can be copied AND downloaded as `.txt`.
- After ack: lands on dashboard.

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 5. Payment-init kill-network mid-request → retry replays

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #17 (C) |

**Steps**
1. As a customer with at least one order needing payment, navigate to checkout.
2. Open DevTools → Network → enable "Slow 3G" throttle (or "Offline" right after submit).
3. Click "Pay" / "Initialize payment".
4. **Immediately** kill the network (Offline mode) before the response arrives.
5. Re-enable network.
6. Click "Pay" again.

**Expected**
- First call: `POST /api/v1/payments/initialize` with an `Idempotency-Key: <uuid>` request header (visible in DevTools → Request Headers).
- Second call uses the **same** `Idempotency-Key` (the FE must reuse the key on retry — check the value).
- Second response carries `Idempotent-Replayed: true` response header.
- Only one Paystack transaction exists (check Paystack dashboard for that order's reference).

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 6. Staff opens unscanned receipt → pending placeholder

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #19 (E) |

**Steps**
1. As staff/superadmin, upload a brand-new file (e.g. an order image or claim proof) — pick something the VT cache hasn't seen.
2. Immediately try to open / view it.

**Expected**
- FE makes `GET /api/v1/internal/file-scans/status?r2Key=<key>`.
- Initial response: `{ status: 'pending', scannedAt: null }`.
- UI shows an **amber pulsing pill** "Scan in progress" and a **placeholder** (NOT the file).
- FE polls the endpoint every ~10 s.
- When VT terminal verdict arrives (`clean` / `skipped`), the file viewer mounts and the pill turns green/gray.

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 7. Staff opens malicious receipt → red warning

| Field | |
|---|---|
| **Status** | ⬜ |
| **Wired in** | PR #19 (E) |

**Steps**
1. Get the BE/QA team to seed a file with `status: malicious` (or upload the [EICAR test signature](https://www.eicar.org/download-anti-malware-testfile/) — it's the standard non-harmful AV test string that every scanner flags).
2. As staff, try to open it.

**Expected**
- `GET /file-scans/status` → `{ status: 'malicious' }`.
- UI shows a **red banner** "Flagged — file removed".
- The file is **not rendered**. No `<img>`, no download link.
- If the user clicks anyway, no R2 fetch happens.
- (Verify in R2 admin: the underlying object is actually deleted server-side after the verdict.)

**Result** ⬜ pass · ⬜ fail
**Notes:**

---

## 8. Any error response in DevTools → problem+json envelope

| Field | |
|---|---|
| **Status** | ✅ Pre-flighted via curl (see top of file) |
| **Wired in** | PR #15 (A) |

**Steps (browser side, for completeness)**
1. Open DevTools → Network.
2. Trigger any failing request (e.g. bad login, profile update with too-long field, etc.).
3. Inspect the response.

**Expected**
- `Content-Type: application/problem+json; charset=utf-8`.
- Body: `{ type, title, status, detail, instance, requestId }` (+ `errors[]` on 400 validations, + `lockedUntil` on 423, + `code` on 422 CAPTCHA).
- Response headers include `X-Request-ID: req-…`.
- The same `requestId` value appears as both the header AND the body field.
- FE shows the error toast with the `Ref: req-…` line visible.

**Result** ✅ pass · ⬜ fail
**Notes:** Curl-verified 2026-06-03: `req-aw`, `/problems/validation`.

---

## Bonus checks (not in original handover but worth eyeballing)

| ⬜ | Check |
|---|---|
| ⬜ | After login, `X-Request-ID` is visible on every `/api/v1/*` response. |
| ⬜ | A 5xx error from any mutation surfaces a toast with the **Retry** button (Phase 4 PR 3). Click it → mutation re-fires with the same payload. |
| ⬜ | Shipping mark editor on `/profile`: editable when `shippingMarkUserEditedAt` is null, locked otherwise (Phase 1). |
| ⬜ | Pagination controls on ShipmentsPage / OrdersPage / BulkOrdersPage actually fire `?page=N` (URL also reflects it). Refresh on page 3 stays on page 3. |
| ⬜ | Skeleton rows show on ShipmentsPage during initial load (Phase 4 PR 2). |
| ⬜ | Tab refocus on the dashboard does NOT fire a flood of refetches within 30 s (Phase 5). |

---

## When done

- For each ⬜ row above, fill in pass/fail + notes.
- Anything failing → file an issue in this repo with the test number and the network response.
- Once 1–7 are all ✓, flip the row in [docs/IMPLEMENTATION_PLAN.md § Phase 6](IMPLEMENTATION_PLAN.md#phase-6--manual-post-deploy-verification-you-not-me) to ✅.
- That officially closes out the BE handover delta: every item from the original handover doc is shipped + verified end-to-end.



