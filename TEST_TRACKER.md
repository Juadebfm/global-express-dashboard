# FE Route Test Tracker

**FE:** http://localhost:5173  
**Local BE:** http://localhost:3000 (Docker)  
**Deployed BE:** https://global-express-backend-1.onrender.com

Status key: ✅ Pass · ❌ Fail · ⚠️ Partial · ⏳ Not yet tested

---

## Public Routes (unauthenticated)

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Home | `/` | ⏳ | |
| Public tracking | `/track` | ⏳ | |
| Public gallery | `/gallery` | ⏳ | |
| D2D public intake | `/d2d/intake` | ⏳ | |
| Forbidden | `/forbidden` | ⏳ | |

## Auth Routes

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Staff login | `/login` | ⏳ | email + password |
| MFA challenge | `/login/mfa` | ⏳ | requires MFA-enrolled account |
| MFA enrol | `/mfa/enroll` | ⏳ | |
| Customer sign-in | `/sign-in` | ⏳ | Clerk |
| Customer sign-up | `/sign-up` | ⏳ | Clerk |
| Forgot password | `/forgot-password` | ⏳ | |

## Staff Onboarding

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Complete staff profile | `/staff-onboarding` | ⏳ | all fields incl. nationalId clear |
| Complete customer profile | `/complete-profile` | ⏳ | Clerk flow |

## Customer Portal

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Customer dashboard | `/dashboard` | ✅ | Customer admin loads the My Shipments dashboard |
| Shipments list | `/shipments` | ⏳ | |
| Track shipment | `/shipments/track` | ⏳ | |
| New booking | `/bookings/new` | ✅ | Booking form renders for customer admin |
| Shipment detail | `/shipments/:id` | ⏳ | |
| Payments | `/payments` | ⏳ | |
| Payment callback | `/payments/callback` | ⏳ | |
| Notifications | `/notifications` | ⏳ | |
| Profile | `/profile` | ⏳ | customer profile save |
| Support | `/support` | ⏳ | |
| Support ticket | `/support/:ticketId` | ⏳ | |

## Staff / Admin Portal

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Admin dashboard | `/admin/dashboard` | ✅ | KPI bar loads, all 6 stat cards render |
| Operations | `/operations` | ⏳ | |
| Clients list | `/clients` | ⏳ | |
| Client workbench | `/clients/:id` | ⏳ | incl. pricing overrides card |
| Orders | `/orders` | ⏳ | |
| Batches list | `/batches` | ⏳ | |
| Batch detail | `/batches/:batchId` | ⏳ | |
| Delivery schedule | `/delivery-schedule` | ⏳ | |
| Payments (staff) | `/payments` | ⏳ | staff view |
| Team | `/team` | ⏳ | |
| Reports | `/reports` | ⏳ | |
| Audit logs | `/reports/audit-logs` | ⏳ | |
| Profile (staff) | `/profile` | ⏳ | staff profile save + nationalId |
| Settings | `/settings` | ⏳ | all tabs |
| Settings — General | `/settings?tab=general` | ⏳ | |
| Settings — FX | `/settings?tab=fx` | ⏳ | |
| Settings — Pricing | `/settings?tab=pricing` | ⏳ | incl. customer overrides summary |
| Settings — Restricted goods | `/settings?tab=restricted-goods` | ⏳ | |
| Settings — Shipment types | `/settings?tab=shipment-types` | ⏳ | |
| Settings — Logistics | `/settings?tab=logistics` | ⏳ | |
| Settings — Templates (superadmin) | `/settings?tab=notification-templates` | ⏳ | visible only to superadmin |
| Settings — Support | `/settings?tab=support` | ⏳ | |
| Suppliers | `/suppliers` | ⏳ | |
| Supplier notices (staff) | `/supplier-notices` | ⏳ | |
| Supplier notice review | `/supplier-notices/:id` | ⏳ | |
| Admin gallery | `/admin/gallery` | ⏳ | |
| Admin imports | `/admin/imports` | ⏳ | |

## Supplier Portal

| Route | Path | Status | Notes |
|-------|------|--------|-------|
| Supplier login | `/supplier/login` | ⏳ | |
| Supplier dashboard | `/supplier/dashboard` | ⏳ | |
| New goods notice | `/supplier/goods-notices/new` | ✅ | Goods-notice form renders for supplier user |
| Goods notice detail | `/supplier/goods-notices/:id` | ⏳ | |
| Supplier requests | `/supplier/requests` | ⏳ | |

---

## Progress

| Category | Total | Tested | Pass | Fail | Partial |
|----------|-------|--------|------|------|---------|
| Public | 5 | 0 | 0 | 0 | 0 |
| Auth | 6 | 0 | 0 | 0 | 0 |
| Onboarding | 2 | 0 | 0 | 0 | 0 |
| Customer portal | 11 | 2 | 2 | 0 | 0 |
| Staff / Admin portal | 24 | 1 | 1 | 0 | 0 |
| Supplier portal | 5 | 1 | 1 | 0 | 0 |
| **Total** | **53** | **4** | **4** | **0** | **0** |

**Production readiness: 4 / 53 (8%)**

---

## Issues Log

| Route | Severity | Description | Fixed? |
|-------|----------|-------------|--------|
| — | — | — | — |
