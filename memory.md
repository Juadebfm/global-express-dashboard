# Memory — Supplier Directory and Warehouse Pricing Integration

Last updated: 2026-07-26 05:55 WAT

## What was built

- Completed customer Supplier Directory selection in the booking flow. Customers can search and paginate discoverable suppliers, open a details modal, select a directory supplier for the booking payload, or use the separate booking-only external supplier path.
- Added the supplier self-service Directory Profile page and route, including discoverability, public contact channels, services, location, and display-only verification status.
- Added the staff Directory Profile review page and a link from Supplier Notices. Staff can inspect a supplier's public profile and mark its verification status without changing discoverability.
- Replaced warehouse verification's frontend pricing calculation with the authoritative `POST /orders/warehouse-pricing-quote` integration. D2D air quotes use actual package weight; D2D sea quotes use total CBM. The rate owner follows shipment payer/billing supplier precedence.
- Added supplier-directory payload/service tests and warehouse-pricing quote tests.
- Removed the now-unused public calculator-rates client, hook, types, exports, and test; there are no remaining frontend references to `/public/calculator/rates`.

## Decisions made

- Customer supplier selection is browse-only: directory suppliers are shared, discoverable supplier profiles; a customer who cannot find one enters an external supplier only for that booking. Customers do not create or approve shared profiles.
- Supplier discoverability is controlled solely by the supplier. Staff verification is a display-only trust signal and must not enable discoverability.
- Warehouse quote results from the backend are authoritative. Never derive pricing from public calculator rates or use a sourcing supplier as the pricing rate owner.
- The existing external supplier booking contract remains `{ name, phone?, email? }`; directory selection uses `{ supplierId }`.

## Problems solved

- Corrected D2D pricing behavior: the UI previously described D2D pricing as always CBM-based, although D2D air is priced by actual package weight. The wording and quote payload now match backend verification behavior.
- Retained `shipmentPayer` and `billingSupplierId` in the order view so rate-owner precedence can be computed correctly.
- Kept the Supplier Layout usable on mobile by hiding long navigation labels at narrow widths while retaining accessible labels.

## Current state

- The Supplier Directory and warehouse pricing integration is implemented locally but uncommitted. The prior Gallery responsive modal change is committed locally on `main` as `7953a4a fix(gallery): improve responsive modal layout`.
- Full verification passes: lint has 15 existing warnings and no errors; TypeScript checks pass; 39 test files / 376 tests pass; production build passes; `git diff --check` passes.
- The working tree contains the intended uncommitted supplier-directory, warehouse-pricing, and cleanup changes. No backend contracts were changed.

## Next session starts with

- Review the uncommitted integration changes and commit them when ready. If product validation is desired first, manually exercise: customer directory selection/external fallback, supplier profile save/discoverability, staff verification, and warehouse air/sea/D2D quote states against the live backend.

## Open questions

- None blocking. The remaining choice is whether to commit and push the completed dashboard integration after any desired live-backend smoke testing.
