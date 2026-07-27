# Global Express Dashboard — Current Status

Last updated: 2026-07-27

This is the current implementation reference for the dashboard. It supersedes
the previous rebuild specification and cross-repository handover notes in this
folder. The backend remains the source of truth for API contracts and status
transitions; this repository contains the frontend only.

## Product areas delivered

### Customer account and profile

- Customer signup validates the complete local form, then checks primary email
  and E.164 phone availability before Turnstile or Clerk signup begins.
- Availability failures are shown beside the relevant field. Rate-limit,
  validation, network, and duplicate-after-verification cases have distinct
  user-facing messages.
- Clerk signup still receives the complete customer form and `/auth/sync` still
  runs after Clerk verification.
- Authenticated users can preview, upload, replace, and remove their own
  avatar from their role-specific profile/settings screen. The UI validates
  JPEG, PNG, and WebP files up to 2 MB before requesting an upload URL.
- `avatarUrl` is used anywhere an avatar is rendered, with the established
  initials/default fallback when it is absent.

### Customer booking and supplier directory

- Customers can search the Supplier Directory, inspect a supplier's approved
  public contact details, and select that supplier for a booking.
- A directory selection sends `sourcingSupplier.supplierId`; the existing
  external-supplier path remains available and sends a name with optional phone
  and email.
- Supplier Directory selection does not edit a shared supplier profile.
- Supplier self-service directory-profile UI and staff/admin directory review
  UI are present. Verification is display-only and does not override the
  supplier's discoverability choice.

### Customer shipments dashboard

- Desktop shipment lists use an accessible table; mobile retains compact rows.
- Selecting a shipment opens an on-demand detail modal rather than navigating
  away from the list.
- The modal presents goods, timeline, supplier information, and applicable
  warehouse context using the data returned by the existing order endpoints.

### Staff order operations

- Staff+ new-order notifications resolve the order ID from either the normal
  `orderId` field or role-notification metadata, then show **View order** only
  while the order is `PREORDER_SUBMITTED`.
- That action opens the normal staff Orders workspace for the exact order;
  it does not open the legacy shipment-measurement utility.
- The Orders workspace has explicit queues for **New orders**, **Awaiting
  arrival**, **To verify**, holds, batches, payments, and supervisor review.
- A new booking has two real-world outcomes:
  - **Await warehouse arrival** advances it to
    `AWAITING_WAREHOUSE_RECEIPT` and leaves it in the visible Awaiting arrival
    queue.
  - **Goods received — verify now** follows the required sequential statuses
    through `WAREHOUSE_RECEIVED`, then opens the established package-verification
    screen for that same order.
- The verification workflow is where staff record package weight, dimensions or
  CBM, images, transport mode, and the authoritative warehouse quote.
- Once an order leaves `PREORDER_SUBMITTED`, its new-order notification remains
  historical and cannot lead back into the new-order handling flow.
- Warehouse verification pricing uses
  `POST /api/v1/orders/warehouse-pricing-quote`. D2D quotes follow the
  staff-selected dispatch mode, and the rate owner follows the shipment-payer
  precedence defined by the backend contract.

### Other application support

- Avatar-aware layouts are in place for customer, supplier, and internal
  experiences.
- Responsive Gallery work preserves the existing information architecture at
  mobile, tablet, and desktop widths.
- The UI design registry is maintained in the repository-root `ui-registry.md`.
  Read it before adding or changing UI components.

## Active frontend contracts

The following backend endpoints are integrated in the dashboard. Do not change
their contracts in this repository.

| Area | Endpoint(s) |
| --- | --- |
| Account availability | `POST /api/v1/public/account-availability` |
| Auth sync | `POST /api/v1/auth/sync` |
| Avatar | `POST /api/v1/users/me/avatar/presign`, `POST` / `DELETE /api/v1/users/me/avatar` |
| Supplier directory, customer | `GET /api/v1/supplier-directory`, `GET /api/v1/supplier-directory/:id` |
| Supplier directory, supplier | `GET` / `PATCH /api/v1/supplier/directory-profile` |
| Supplier directory, staff | `GET /api/v1/admin/suppliers/:supplierId/directory-profile`, `PATCH /api/v1/admin/suppliers/:supplierId/directory-profile/verification` |
| Orders | `GET /api/v1/orders`, `GET /api/v1/orders/:id`, `PATCH /api/v1/orders/:id/status` |
| Warehouse quote | `POST /api/v1/orders/warehouse-pricing-quote` |

## Order status rule

Staff operations must preserve the backend's sequential intake flow:

```text
PREORDER_SUBMITTED
  → AWAITING_WAREHOUSE_RECEIPT
  → WAREHOUSE_RECEIVED
  → warehouse verification and pricing
```

Do not use the generic shipping-mark intake modal as the handling path for a
customer-created order: it is a separate workflow and can create or append a
different shipment. Use the exact-order queues in Orders instead.

## Local development and verification

Required environment values are documented by `.env.example`; never add real
credentials to source control or documentation.

```bash
npm install
npm run dev
npm test -- --run
npm run typecheck
npm run build
npm run lint
```

Latest verification on 2026-07-27:

- 40 Vitest files and 386 tests pass.
- TypeScript typecheck passes.
- Production Vite build passes.
- `git diff --check` passes.
- ESLint reports no errors. It retains 15 existing warnings in unrelated
  legacy files, mainly React Compiler compatibility and synchronous state
  updates inside effects.

## Current limitations and follow-up work

- Production deployment and browser smoke testing remain separate from local
  build verification.
- The Vite build reports large generated chunks; code splitting can be assessed
  separately as a performance task.
- Existing lint warnings should be addressed deliberately, not bundled into
  feature work without a scoped plan.
- Backend changes, migrations, and deployment remain outside this repository's
  scope. Read backend contracts when needed, but do not modify them from here.
