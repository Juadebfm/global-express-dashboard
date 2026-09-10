# Implementation Plan — Batch Last-Mile Fulfilment

## What we are building

Add a clear handoff from a finished shared batch journey to the individual shipment work that follows it. Staff will use **View shipment actions** from a qualifying batch to open a batch-filtered Last-mile view in Operations. That view will show each shipment's current status, payment state, and one valid next action. It will support collection for standard air/sea shipments and the existing delivery sequence for door-to-door shipments.

## Language we agreed on

- **Last-mile fulfilment:** Individual-shipment work after the shared batch reaches `IN_TRANSIT_TO_LAGOS_OFFICE`.
- **Ready for pickup:** The shipment has arrived at the Lagos office and can be collected. These are the same operational state, represented by `READY_FOR_PICKUP`.
- **View shipment actions:** The button that opens the batch-filtered Last-mile view. It does not imply that every shipment needs local delivery.
- **Pickup shipment:** A standard air or sea shipment collected at the Lagos office.
- **Door-to-door shipment:** A shipment that follows the backend's local-delivery sequence until `DELIVERED_TO_RECIPIENT`.

## Decisions made

- **Entry points:** Show **View shipment actions** in the completed Batch movement panel and on qualifying rows in the Batches list. The batch-detail button must not depend on `batches.manage`; ordinary staff need to reach the handoff even though they cannot alter batch movement.
- **Qualifying batch-list rows:** Show the list button only when `batch.status === 'closed'` and `batch.movementStatus === 'IN_TRANSIT_TO_LAGOS_OFFICE'`.
- **List data source:** Use `GET /api/v1/batches`, which now supplies nullable `movementStatus` and `movementStatusLabel`. Do not add this behaviour to the intentionally unchanged `/shipments/batches` list endpoint.
- **Destination:** Add a dedicated Last-mile view inside Operations, opened with a batch deep link such as `/operations?queue=last-mile&batch=<batchId>`. This is a new use of the existing Operations URL state; it is not an existing screen.
- **Ready-for-pickup safeguard:** The **Mark ready for pickup** action opens the existing modal pattern. It requires the staff member to confirm that the shipment has arrived at the Lagos office and is ready for collection before sending `READY_FOR_PICKUP`.
- **Pickup completion:** Require the customer's six-digit PIN. Include `collectorName` and `collectorRelationship` as optional fields in the pickup-completion modal.
- **Permissions:** The page remains reachable by authenticated internal staff, but status-changing controls require `local_delivery.manage`, determined from `GET /api/v1/permissions/me`. Hide or disable unavailable controls with a plain permission explanation. Keep backend enforcement as the source of truth.
- **Carrier data:** When a batch has no recorded carrier or routing information, show a modest **Carrier details not recorded** notice beside the existing Edit control. This does not block the handoff or shipment actions.

## Assumptions

- The backend deployment described in the handoff is available to the dashboard: batched shipments at the final shared stage can now use individual post-batch actions, while earlier shipment actions remain batch-controlled.
- `GET /batches/:batchId/roster` continues to provide each shipment's status, shipment type, and payment state as it does now. The existing per-order timeline response supplies the package-level extra-truck requirement needed for a door-to-door shipment's first local action.
- The backend remains read-only from this frontend implementation.

## How to build it

1. Extend the frontend `BatchListItem` type and batch-list service tests for the nullable `movementStatus` and `movementStatusLabel` fields returned by `GET /batches`.

2. Add a reusable predicate for a last-mile-ready batch: its batch status is `closed` and its movement status is `IN_TRANSIT_TO_LAGOS_OFFICE`. Use it for all entry-point visibility rules.

3. Update the Batches list for desktop and mobile layouts. Add **View shipment actions** only to qualifying closed rows/cards; keep the normal batch-detail link available. The action must preserve accessible button/link behaviour rather than nesting one interactive element inside another.

4. Update `BatchMovementPanel` at the final shared stage:
   - Replace the dead-end sentence with the handoff message: **Final transfer in progress. Batch-level tracking ends here. Manage pickup or local delivery for each shipment once it reaches the office.**
   - Add **View shipment actions**, deep-linking to the Last-mile Operations view with the current batch ID.
   - Render this handoff independently of the elevated batch-management capability.

5. Add the Last-mile queue/view to Operations. Parse and preserve the `batch` URL parameter alongside the existing Operations URL state. Load the selected batch's roster and batch movement data, and show a useful loading, unavailable, and empty state.

6. Build a shipment roster for that view with shipment number, customer, shipment type, current status, payment status, and **Next action**. Only list shipments from the requested batch. Keep the existing order detail link available for investigation without treating it as the action workflow.

7. Implement next-action rules without allowing frontend jumps:
   - Standard air/sea at `IN_TRANSIT_TO_LAGOS_OFFICE`: **Mark ready for pickup**. Do not show it when payment is not `PAID_IN_FULL`; instead show that full payment is required.
   - Standard air/sea at `READY_FOR_PICKUP`: **Complete pickup**.
   - Door-to-door: use the existing per-order timeline's `requiresExtraTruckMovement` fact before the first action, then show only the next backend-valid local-delivery step until `DELIVERED_TO_RECIPIENT`.
   - Terminal shipments show their completed status, not an action.

8. Add the required modal flows using the dashboard's existing modal styling:
   - Ready-for-pickup acknowledgement modal that submits `PATCH /orders/:id/status` with `READY_FOR_PICKUP` only after the staff confirmation.
   - Pickup-completion modal that validates a six-digit PIN and submits `POST /orders/:id/complete-pickup`, with optional collector name and relationship.
   - Provide a resend-PIN control for a ready-for-pickup shipment through `POST /orders/:id/resend-pickup-pin` when the staff member has the required capability.

9. Add frontend service functions and focused hooks for pickup completion and PIN resend. Reuse the existing order-status service for valid next-status updates, and invalidate the order, roster, timeline, shipment, and relevant batch queries after success.

10. Handle backend outcomes in the Last-mile view in plain language:
    - `401`: ask the user to sign in again.
    - `403`: remove/disable controls and explain that **Manage local delivery** access is required; refresh the permission matrix.
    - `409`: explain that the shipment is still controlled by batch movement and refresh the batch/roster state.
    - `400`: show the backend's validation message, including a payment requirement or invalid next step.

11. Update the batch carrier panel to display **Carrier details not recorded** beside Edit when all carrier/routing fields are absent.

12. Add unit and component tests for:
    - the qualifying-batch predicate, including nullable movement fields;
    - list and detail entry-point visibility;
    - every standard pickup and door-to-door next-action rule;
    - permission-gated controls and `403` feedback;
    - ready-for-pickup acknowledgement, PIN validation, pickup completion, and PIN resend;
    - `400` and `409` messages; and
    - the empty carrier-data notice.

13. Run the relevant test suite, full type check, lint, and production build before review. After the UI is built, update `ui-registry.md` with the reusable Last-mile visual patterns required by the project workflow.

## Acceptance criteria

- A staff member can reach the correct batch-filtered Last-mile page from both required entry points.
- Only closed batches at `IN_TRANSIT_TO_LAGOS_OFFICE` show the list action.
- A fully paid standard shipment can become ready for pickup only after staff confirmation.
- An unpaid standard shipment cannot be offered that action.
- A ready shipment can be completed with a valid six-digit customer PIN.
- Door-to-door shipments expose only their next valid delivery step.
- The batch remains unchanged while its shipments progress independently.
- Users without `local_delivery.manage` cannot perform post-batch actions and receive a clear access message.
