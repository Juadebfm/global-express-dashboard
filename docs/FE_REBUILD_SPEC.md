# Frontend Rebuild Specification

> **Status:** Pre-launch — no live users, clean slate, no backwards-compatibility constraints.
>
> **Before writing any component:** Read `ui-registry.md` first. Every class used in
> new components must match the baseline defined there.
>
> **Backend is live and ready.** All endpoints described here are implemented and tested.
> The FE is the only thing left.

---

## How to read this document

Four layers. Each layer is independently shippable. Start Layer 1, finish it completely, then move to Layer 2. Layers 2–4 can be parallelised once Layer 1 is done.

Each section specifies: what file(s) to touch, the exact types/interfaces, the API call signature, and what the UI must render — including states (loading, empty, error).

---

## Layer 1 — Foundation

No UI changes. This sets up types, routes, services, and hooks that every other layer depends on. Ship this first.

---

### 1.1 Types

#### `src/types/order.types.ts` — full replacement

```typescript
export type OrderDirection = 'outbound' | 'inbound';

// The object a customer passes when naming their supplier
export interface SourcingSupplier {
  supplierId?: string;       // UUID — GEX-registered supplier account
  name?: string;             // External supplier — mutually exclusive with supplierId
  phone?: string;
  email?: string;
}

export interface CreateOrderPayload {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  orderDirection: OrderDirection;
  weight: string;             // "10kg" (air) or "0.5cbm" (sea)
  declaredValue: string;
  description: string;
  shipmentType: 'air' | 'sea' | 'ocean';
  senderId?: string;          // Staff creating on behalf of a customer
  pickupRepName?: string;
  pickupRepPhone?: string;
  sourcingSupplier?: SourcingSupplier;  // NEW — Flow 1
}

export interface ApiOrder {
  id: string;
  trackingNumber: string;     // TEMP-{16hex} — never display to customers
  status?: string;
  statusV2: string;
  statusLabel: string;
  // sourcingSupplier fields — populated when customer named a supplier
  sourcingSupplierId: string | null;
  sourcingSupplierName: string | null;
  sourcingSupplierPhone: string | null;
  sourcingSupplierEmail: string | null;
  [key: string]: unknown;
}

export interface ApiCreateOrderResponse {
  success: boolean;
  message: string;
  data: ApiOrder;
}

export interface OrderListItem {
  id: string;
  trackingNumber: string;
  senderName?: string | null;
  status: string;
  statusV2: string;
  statusLabel: string;
  origin: string | null;
  destination: string | null;
  createdAt: string | null;
  amount: number | null;
  transportMode: string;
  paymentCollectionStatus: string;
  paymentDetailsSentAt?: string | null;
  flaggedForAdminReview: boolean;
  raw: Record<string, unknown>;
}

export interface OrdersListResult {
  data: OrderListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

#### `src/types/shipmentOps.types.ts` — add to existing file

Add these to the existing interfaces and types:

```typescript
// Add to existing Batch interface
export interface Batch {
  // ...existing fields stay...
  billOfLadingNumber: string | null;  // ADD
  vesselName: string | null;          // ADD
}

// Add to existing DispatchBatchCarrierInfoPayload
export interface DispatchBatchCarrierInfoPayload {
  // ...existing fields stay...
  billOfLadingNumber?: string | null;  // ADD
  vesselName?: string | null;          // ADD
}

// ADD — new types for batch documents
export type BatchDocumentType =
  | 'mawb'
  | 'bill_of_lading'
  | 'container_photo'
  | 'vessel_photo'
  | 'other';

export interface BatchDocument {
  id: string;
  batchId: string;
  documentType: BatchDocumentType;
  fileUrl: string;
  fileName: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface BatchDocumentPresignResult {
  uploadUrl: string;
  r2Key: string;
}
```

---

#### `src/types/supplierPortal.types.ts` — add to existing file

```typescript
// ADD — customer booking requests visible to supplier
export interface SupplierOrderRequest {
  id: string;
  description: string | null;
  weight: string | null;
  declaredValue: string | null;
  shipmentType: 'air' | 'ocean' | 'd2d' | null;
  statusV2: string | null;
  sourcingSupplierName: string | null;
  sourcingSupplierPhone: string | null;
  sourcingSupplierEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 1.2 Tracking utilities

**New file:** `src/lib/trackingUtils.ts`

```typescript
// Returns true for internal-only tracking numbers (TEMP-* and legacy GEX-*)
// These must never be displayed to customers
export function isInternalTracking(trackingNumber: string): boolean {
  return (
    trackingNumber.startsWith('TEMP-') ||
    trackingNumber.startsWith('GEX-')
  );
}

// Returns a display-safe string for any tracking number
// Use this everywhere a tracking number is rendered
export function formatTrackingDisplay(trackingNumber: string): string {
  if (isInternalTracking(trackingNumber)) return 'Awaiting assignment';
  return trackingNumber; // YYYYMMDD-NNNN or batch master AIR/SEA-YYYYMMDD-NNNN
}

// Returns true when the tracking number is a slot tracking (YYYYMMDD-NNNN)
// i.e. the order has been placed in a dispatch batch
export function isSlotTracking(trackingNumber: string): boolean {
  return /^\d{8}-\d{4}$/.test(trackingNumber);
}
```

---

### 1.3 Routes

**`src/constants/routes.ts`** — add these constants:

```typescript
export const ROUTES = {
  // ...existing routes stay...
  BOOKINGS_NEW: '/bookings/new',                    // ADD — customer booking form
  SUPPLIER_REQUESTS: '/supplier/requests',          // ADD — supplier sees customer requests
} as const;
```

---

### 1.4 Services

#### `src/services/ordersService.ts`

Update `createOrder()` to pass `sourcingSupplier`:

```typescript
export async function createOrder(
  payload: CreateOrderPayload,
  token: string,
  idempotencyKey: string
): Promise<ApiCreateOrderResponse> {
  // payload now includes sourcingSupplier — pass it through as-is
  return apiPostData('/orders', payload, token, { idempotencyKey });
}
```

No other changes to this file.

---

#### `src/services/batchesService.ts` — add three functions

```typescript
// 1. Get a presigned URL to upload a batch document to R2
export async function presignBatchDocument(
  batchId: string,
  params: { contentType: string; fileName?: string },
  token: string
): Promise<{ uploadUrl: string; r2Key: string }> {
  return apiPostData(
    `/batches/${batchId}/documents/presign`,
    params,
    token
  );
}

// 2. Confirm the upload after the client has PUT to R2
export async function confirmBatchDocument(
  batchId: string,
  params: {
    r2Key: string;
    documentType: BatchDocumentType;
    fileName?: string;
  },
  token: string
): Promise<BatchDocument> {
  return apiPostData(
    `/batches/${batchId}/documents/confirm`,
    params,
    token
  );
}

// 3. List all documents on a batch
export async function getBatchDocuments(
  batchId: string,
  token: string
): Promise<BatchDocument[]> {
  return apiGetData(`/batches/${batchId}/documents`, token);
}
```

Also update `updateBatchCarrierInfo()` to include the new fields:

```typescript
export async function updateBatchCarrierInfo(
  batchId: string,
  payload: DispatchBatchCarrierInfoPayload,  // now includes billOfLadingNumber, vesselName
  token: string
): Promise<Batch> {
  return apiPatchData(`/batches/${batchId}/carrier-info`, payload, token);
}
```

---

#### `src/services/supplierPortalService.ts` — add one function

```typescript
export async function getSupplierOrderRequests(
  token: string
): Promise<SupplierOrderRequest[]> {
  return apiGetData('/supplier/orders/requests', token);
}
```

---

### 1.5 Hooks

#### `src/hooks/useBatchDocuments.ts` (new file)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getBatchDocuments,
  presignBatchDocument,
  confirmBatchDocument,
} from '@/services/batchesService';
import type { BatchDocumentType } from '@/types';

export function useBatchDocuments(batchId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['batches', batchId, 'documents'],
    queryFn: () => getBatchDocuments(batchId, token!),
    enabled: !!token && !!batchId,
  });
}

export function useUploadBatchDocument(batchId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      documentType: BatchDocumentType;
    }) => {
      // Step 1: presign
      const { uploadUrl, r2Key } = await presignBatchDocument(
        batchId,
        { contentType: params.file.type, fileName: params.file.name },
        token!
      );
      // Step 2: PUT to R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: params.file,
        headers: { 'Content-Type': params.file.type },
      });
      // Step 3: confirm
      return confirmBatchDocument(
        batchId,
        { r2Key, documentType: params.documentType, fileName: params.file.name },
        token!
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['batches', batchId, 'documents'],
      });
    },
  });
}
```

#### `src/hooks/useSupplierOrderRequests.ts` (new file)

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { getSupplierOrderRequests } from '@/services/supplierPortalService';

export function useSupplierOrderRequests() {
  const token = useSupplierAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['supplier', 'order-requests'],
    queryFn: () => getSupplierOrderRequests(token!),
    enabled: !!token,
  });
}
```

---

## Layer 2 — Customer Experience

All UI. Uses the baseline from `ui-registry.md` throughout.

---

### 2.1 Fix two hardcoded values immediately

These two fixes must happen before any new UI is built — they affect components that appear on every screen.

**`src/components/layout/AppLayout/Sidebar.tsx` line 115** — active nav item background:
```tsx
// BEFORE
active ? 'bg-[#FFF7F2] text-brand-500' : 'text-gray-700 hover:bg-gray-50',

// AFTER
active ? 'bg-brand-50 text-brand-500' : 'text-gray-700 hover:bg-gray-50',
```

---

### 2.2 Fix ActiveDeliveries.tsx immediately

**`src/pages/dashboard/components/ActiveDeliveries.tsx` lines 20–22, 71**

Replace the raw hex values:
```typescript
// BEFORE
on_time: { bg: 'bg-[#0000FF]', text: 'text-white' },
delayed:  { bg: 'bg-[#FF0000]', text: 'text-white' },
completed:{ bg: 'bg-[#008000]', text: 'text-white' },
// line 71: bg-[#F4EBFF]

// AFTER
on_time: { bg: 'bg-blue-600',    text: 'text-white' },
delayed:  { bg: 'bg-red-500',     text: 'text-white' },
completed:{ bg: 'bg-emerald-600', text: 'text-white' },
// line 71: bg-purple-50
```

---

### 2.2 Navigation — customer

**`src/components/layout/AppLayout/navConfig.ts`**

Replace `CUSTOMER_NAV`:

```typescript
export const CUSTOMER_NAV: SidebarItem[] = [
  { id: 'myShipments', icon: 'clipboard', href: ROUTES.DASHBOARD },   // was 'dashboard'
  { id: 'payments',    icon: 'wallet',    href: ROUTES.PAYMENTS },
  { id: 'notification',icon: 'bell',      href: ROUTES.NOTIFICATIONS },
];
```

- Remove: `orders`, `deliverySchedule`
- Rename: `dashboard` → `myShipments` (same route, different label)
- The customer now has 3 nav items: My Shipments, Payments, Notifications

Update i18n key in `src/i18n/locales/en/nav.json` — add `"myShipments": "My Shipments"`.

---

### 2.3 Navigation — staff

**`src/components/layout/AppLayout/Sidebar.tsx`** — add `Layers` to the icon map

The `'layers'` icon ID used in the staff nav below does not exist in the map yet. Add it:

```tsx
// Add to imports at top of file:
import {
  // ...existing imports...
  Layers,    // ADD
} from 'lucide-react';

// Add to iconMap:
const iconMap: Record<string, ReactElement> = {
  // ...existing entries...
  layers: <Layers className="h-5 w-5" />,   // ADD — Operations nav item
};
```

---

**`src/components/layout/AppLayout/navConfig.ts`**

Replace `STAFF_NAV`, `ADMIN_NAV`, `SUPERADMIN_NAV`:

```typescript
export const STAFF_NAV: SidebarItem[] = [
  { id: 'operations',     icon: 'layers',   href: ROUTES.OPERATIONS },     // NEW — the pipeline
  { id: 'supplierNotices',icon: 'package',  href: ROUTES.SUPPLIER_NOTICES },
  { id: 'notification',   icon: 'bell',     href: ROUTES.NOTIFICATIONS },
];

export const ADMIN_NAV: SidebarItem[] = [
  { id: 'operations',     icon: 'layers',   href: ROUTES.OPERATIONS },
  { id: 'clients',        icon: 'users',    href: ROUTES.CLIENTS },
  { id: 'supplierNotices',icon: 'package',  href: ROUTES.SUPPLIER_NOTICES },
  { id: 'notification',   icon: 'bell',     href: ROUTES.NOTIFICATIONS },
  { id: 'team',           icon: 'team',     href: ROUTES.TEAM },
  { id: 'reports',        icon: 'chart',    href: ROUTES.REPORTS },
];

export const SUPERADMIN_NAV: SidebarItem[] = [
  { id: 'operations',     icon: 'layers',   href: ROUTES.OPERATIONS },
  { id: 'clients',        icon: 'users',    href: ROUTES.CLIENTS },
  { id: 'supplierNotices',icon: 'package',  href: ROUTES.SUPPLIER_NOTICES },
  { id: 'payments',       icon: 'wallet',   href: ROUTES.PAYMENTS },
  { id: 'notification',   icon: 'bell',     href: ROUTES.NOTIFICATIONS },
  { id: 'team',           icon: 'team',     href: ROUTES.TEAM },
  { id: 'reports',        icon: 'chart',    href: ROUTES.REPORTS },
  { id: 'auditLogs',      icon: 'shield',   href: ROUTES.AUDIT_LOGS },
];
```

Removed from all staff nav: `dashboard` (admin dashboard removed pre-launch), `batches` (now accessed from within Operations), `orders` (replaced by Operations pipeline).

Add to routes: `OPERATIONS: '/operations'`

---

### 2.4 Customer dashboard — replace with "My Shipments"

**`src/pages/dashboard/DashboardPage/DashboardPage.tsx`** — full replacement

The page becomes a simple list of the customer's bookings with a prominent "New Booking" CTA. No KPI grid, no active deliveries component (the delivery schedule info surfaces inline on each row instead).

```tsx
// What this page renders:

// 1. Header
//    "My Shipments"  (h1, text-2xl font-semibold text-gray-900)
//    "New Booking" button (Button size="sm", navigates to ROUTES.BOOKINGS_NEW)

// 2. Incomplete profile banner (keep existing logic — the amber banner)

// 3. Shipment list (Card className="p-0 divide-y divide-gray-100")
//    Each row: ShipmentRow component (see below)
//    Loading: 5× skeleton rows
//    Empty: empty state card with "New Booking" CTA
//    Error: AlertBanner tone="error"

// Pagination: keep existing Pagination component at bottom
```

**ShipmentRow** — new component, lives in `src/pages/dashboard/DashboardPage/components/ShipmentRow.tsx`:

Each row renders:
```
[Mode icon]  [Description truncated]             [Status badge]
             [Tracking display]  ·  [Date]       [>]
```

- Mode icon: `<Plane>` (air) or `<Ship>` (sea) — `h-4 w-4 text-gray-400`
- Description: `text-sm font-medium text-gray-900 truncate`
- Status badge: `rounded-full px-2.5 py-0.5 text-xs font-semibold` + tone colour from ui-registry
- Tracking display: `formatTrackingDisplay(row.trackingNumber)` — never show raw `TEMP-*`
  - If internal: `<span className="text-xs text-gray-400 italic">Awaiting assignment</span>`
  - If assigned: `<span className="text-xs font-mono text-gray-600">{trackingNumber}</span>`
- Date: `text-xs text-gray-400`
- Row is a `<Link>` to order detail (existing `/orders` page or a new detail route)
- Hover: `hover:bg-gray-50 transition-colors`

Data: `GET /orders` with the existing `useOrders()` hook. No new hook needed.

---

### 2.5 New booking form

**New page:** `src/pages/bookings/NewBookingPage/NewBookingPage.tsx`

Route: `ROUTES.BOOKINGS_NEW = '/bookings/new'`

**Two-step form, not a wizard.** Steps rendered inline on one page separated by a divider, not as separate route steps.

---

**Step 1 — What are you shipping?**

Fields (all use `<Input>` component from ui-registry):

| Field | Type | Validation | Notes |
|---|---|---|---|
| Description | textarea | required, min 3 chars | "What goods are you sending?" |
| Shipment type | radio/button group | required | Air / Sea (no d2d for customer flow) |
| Weight | text input | required | Placeholder: "e.g. 5kg" (air) or "0.3cbm" (sea). Label changes with type selection |
| Declared value (USD) | number input | required, > 0 | |

---

**Step 2 — Who is involved?**

Fields:

| Field | Type | Validation | Notes |
|---|---|---|---|
| Recipient name | text | required | |
| Recipient phone | phone input | required | Use existing `react-phone-number-input` |
| Recipient email | email | optional | |

**Sourcing supplier section (optional toggle):**

```
[ ] I have a supplier sending these goods to GEX Korea

— when checked, show: —

◉ Select from my saved suppliers    ○ Someone new

[Supplier combobox — GET /users/me/suppliers]

— or if "Someone new" selected: —

Supplier name  [text input, required]
Supplier phone [phone input, optional]
Supplier email [email input, optional]
```

Rules enforced by form validation (mirrors backend):
- Cannot have both `supplierId` and `name` — the radio enforces this
- If "Someone new" is selected, `name` is required; phone/email optional

---

**No CAPTCHA needed.** `POST /orders` requires authentication (`authenticate` middleware) — not a public endpoint. Do not add `<TurnstileGate>` to this form.

**Submit behaviour:**

1. Call `POST /orders` with idempotency key
2. On success: show confirmation card (not a separate page):
   ```
   ✓ Booking received
   We'll notify your supplier and update your tracking once
   your goods are assigned to a dispatch.
   [View my shipments]  [Book another]
   ```
3. On error: `<AlertBanner tone="error" />` inline below the form

---

**Form schema** (`src/pages/bookings/NewBookingPage/schema.ts`):

```typescript
import { z } from 'zod';

export const newBookingSchema = z.object({
  description: z.string().min(3, 'Please describe what you are shipping'),
  shipmentType: z.enum(['air', 'sea']),
  weight: z.string().min(1, 'Weight is required'),
  declaredValue: z.string().min(1, 'Declared value is required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhone: z.string().min(1, 'Recipient phone is required'),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  hasSourcingSupplier: z.boolean(),
  sourcingSupplierType: z.enum(['saved', 'new']).optional(),
  sourcingSupplierId: z.string().uuid().optional(),
  sourcingSupplierName: z.string().optional(),
  sourcingSupplierPhone: z.string().optional(),
  sourcingSupplierEmail: z.string().email().optional().or(z.literal('')),
}).superRefine((val, ctx) => {
  if (!val.hasSourcingSupplier) return;
  if (val.sourcingSupplierType === 'saved' && !val.sourcingSupplierId) {
    ctx.addIssue({ code: 'custom', path: ['sourcingSupplierId'], message: 'Select a supplier' });
  }
  if (val.sourcingSupplierType === 'new' && !val.sourcingSupplierName) {
    ctx.addIssue({ code: 'custom', path: ['sourcingSupplierName'], message: 'Supplier name is required' });
  }
});
```

---

### 2.6 Tracking display — global fix

Anywhere `trackingNumber` is rendered, apply `formatTrackingDisplay()` from `src/lib/trackingUtils.ts`.

Files to update:
- `src/pages/orders/OrdersPage/components/OrderDetailHeader.tsx` — the tracking row at top
- `src/pages/public/TrackPage/TrackPage.tsx` — public tracking page input hint text
- Any table or list column that renders `item.trackingNumber`

In `OrderDetailHeader.tsx` specifically — replace the raw `{view.trackingNumber}` with:

```tsx
{isInternalTracking(view.trackingNumber) ? (
  <span className="text-sm italic text-gray-400">Awaiting batch assignment</span>
) : (
  <span className="truncate text-sm font-semibold text-gray-900 font-mono">
    {view.trackingNumber}
  </span>
)}
```

The copy button should be hidden when the tracking number is internal (nothing useful to copy).

---

### 2.7 Language sweep

Replace every instance of "pre-order" / "preorder" / "Pre-order" in UI strings and i18n files with "shipment" or "booking" as appropriate:

- "Submit a pre-order" → "Place a booking"
- "Pre-order submitted" → "Booking received"
- "View pre-orders" → "View my shipments"
- `isPreorder` — do not surface this field in any UI. It is a backend technical flag.

Run this search to find all instances:
```bash
grep -r "pre.order\|preorder\|isPreorder" src/ --include="*.tsx" --include="*.ts" --include="*.json" -l
```

---

### 2.8 Order detail — sourcing supplier section

In `src/pages/orders/OrdersPage/components/` (the detail panel), add a "Sourcing Supplier" card when the order has sourcing supplier data.

Render condition: `order.sourcingSupplierId || order.sourcingSupplierName`

```tsx
// Card uses bg-gray-50 border border-gray-200 rounded-xl p-4
<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
    Sourcing Supplier
  </p>
  <p className="text-sm font-medium text-gray-900">
    {order.sourcingSupplierName ?? 'GEX Registered Supplier'}
  </p>
  {order.sourcingSupplierPhone && (
    <p className="text-sm text-gray-500">{order.sourcingSupplierPhone}</p>
  )}
  {order.sourcingSupplierEmail && (
    <p className="text-sm text-gray-500">{order.sourcingSupplierEmail}</p>
  )}
</div>
```

---

## Layer 3 — Staff Operations Pipeline

Replaces `/shipments` + `/batches` as the primary staff view.

---

### 3.1 New route and page

Add to `src/constants/routes.ts`:
```typescript
OPERATIONS: '/operations',
```

Add to `src/App.tsx` router: `<Route path="/operations" element={<OperationsPage />} />`

**New page:** `src/pages/operations/OperationsPage/OperationsPage.tsx`

---

### 3.2 What the Operations page renders

**Four tabs.** Each tab shows a filtered list of shipments at that stage. Tabs are rendered as a pill group (matches the supplier dashboard tab pattern from ui-registry).

```
[ Today's Arrivals ]  [ Needs Action ]  [ In Batch ]  [ Dispatched ]
```

Tab pill group pattern (from SupplierDashboardPage — matches ui-registry):
```tsx
<div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
  {TABS.map(tab => (
    <button
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active === tab.id
          ? 'bg-brand-500 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-50'
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

**Tab: Today's Arrivals**

What it shows: orders with `statusV2 = AWAITING_WAREHOUSE_RECEIPT` AND `createdAt >= today 00:00:00 UTC`, sorted by `createdAt` desc.

"Today" is derived client-side: `new Date().toISOString().split('T')[0]` → pass as `?createdAfter=YYYY-MM-DD` query param to `GET /orders`. If the backend does not yet support `createdAfter` filtering, fetch all `AWAITING_WAREHOUSE_RECEIPT` orders and filter client-side by `createdAt >= startOfToday`.

Each row:
```
[Shipping mark]    [Description]        [Mode badge]    [Action button]
[Customer name]    [Declared value]                     "Record intake →"
```

"Record intake →" opens the existing `ShipmentIntakeModal` inline — no page navigation.

---

**Tab: Needs Action**

What it shows: orders that require staff to do something. This means:
- `statusV2 = WAREHOUSE_RECEIVED` (needs measurement)
- `statusV2 = WAREHOUSE_VERIFIED_PRICED` and not in a batch yet (needs to be batched)
- `statusV2 = ON_HOLD` (needs resolution)
- `flaggedForAdminReview = true`

Each row:
```
[Tracking display]   [Description]   [Status badge]   [What to do next label]
[Customer name]      [Mode]                           [Action button]
```

"What to do next" label — plain text, not a badge:
- `WAREHOUSE_RECEIVED` → "Add measurements"
- `WAREHOUSE_VERIFIED_PRICED` → "Add to batch"
- `ON_HOLD` → "Review hold reason"
- `flaggedForAdminReview` → "Review flag"

Action buttons open the relevant modal inline. Staff never leave this page to complete an action.

---

**Tab: In Batch**

What it shows: orders with a `dispatchBatchId` and `statusV2` between `DISPATCHED_FROM_ORIGIN` and `IN_TRANSIT_TO_LAGOS_OFFICE`.

Grouped by batch. Each group header:
```
[Batch tracking number]   [Mode]   [X orders]   [Batch status badge]   [Manage batch →]
```

"Manage batch →" is a link to `/batches/:batchId` (existing batch detail page).

Orders within the group are collapsed by default, expandable.

---

**Tab: Dispatched**

What it shows: orders with `statusV2` in the Nigeria delivery stages (`CUSTOMS_CLEARED_LAGOS` through `DELIVERED`).

Simple list, same row pattern as Needs Action. Paginated.

---

### 3.3 Simplified action labels in staff UI

Throughout all staff components, replace jargon labels:

| Old label | New label |
|---|---|
| "Dispatch batch" | "Batch" |
| "Approve cutoff" | "Lock batch" |
| "Batch customer slot" | (never show in UI) |
| "Shipment payer: USER / SUPPLIER" | "Who pays shipping: Customer / Supplier" |
| "MAWB" (standalone) | "MAWB (Airway Bill)" |
| "Record intake" | "Mark as received" |
| "Warehouse verified + priced" | "Ready to batch" |

---

### 3.4 Carrier info form — mode-aware fields

**`src/components/forms/ShipmentForms/shipmentOpsSchemas.ts`** — add to carrier info schema:

```typescript
export const batchCarrierInfoSchema = z.object({
  // existing fields...
  billOfLadingNumber: z.string().min(1).nullable().optional(),
  vesselName: z.string().min(1).nullable().optional(),
});
```

**`src/pages/shipments/components/BatchOpsModal.tsx`** (or wherever the carrier info form lives):

Gate fields by `batch.transportMode`:

```tsx
{/* Air-only fields */}
{batch.transportMode === 'air' && (
  <>
    <Input label="MAWB (Airway Bill)" {...register('airlineTrackingNumber')} />
    <Input label="Flight number" {...register('voyageOrFlightNumber')} />
  </>
)}

{/* Sea-only fields */}
{batch.transportMode === 'sea' && (
  <>
    <Input label="Ocean tracking number" {...register('oceanTrackingNumber')} />
    <Input label="Voyage number" {...register('voyageOrFlightNumber')} />
    <Input label="Bill of Lading number" {...register('billOfLadingNumber')} />
    <Input label="Vessel name" {...register('vesselName')} />
  </>
)}

{/* Shared fields — always shown */}
<Input label="Carrier name" {...register('carrierName')} />
<Input label="Estimated departure" type="datetime-local" {...register('estimatedDepartureAt')} />
<Input label="Estimated arrival" type="datetime-local" {...register('estimatedArrivalAt')} />
<Input label="Notes" {...register('notes')} />
```

---

### 3.5 Batch documents section

**`src/pages/batches/BatchDetailPage/BatchDetailPage.tsx`** — add a "Documents" section after the roster.

This section is visible to `staff`, `admin`, `superadmin` only.

**Document type labels and transport mode gating:**

```typescript
const DOCUMENT_TYPE_OPTIONS: {
  value: BatchDocumentType;
  label: string;
  modes: ('air' | 'sea')[];
}[] = [
  { value: 'mawb',            label: 'MAWB (Master Airway Bill)', modes: ['air'] },
  { value: 'bill_of_lading',  label: 'Bill of Lading',            modes: ['sea'] },
  { value: 'container_photo', label: 'Container Photo',           modes: ['sea'] },
  { value: 'vessel_photo',    label: 'Vessel Photo',              modes: ['sea'] },
  { value: 'other',           label: 'Other Document',            modes: ['air', 'sea'] },
];

// Filter by batch.transportMode when rendering the upload dropdown
const availableTypes = DOCUMENT_TYPE_OPTIONS.filter(
  opt => opt.modes.includes(batch.transportMode)
);
```

**Document list** (using `useBatchDocuments(batchId)`):

Each row:
```
[File icon]  [Document type label]  [Filename]  [Date]  [Download]
```
- Download link: `<a href={doc.fileUrl} target="_blank">Download</a>` — styled as a small ghost button

**Upload UI:**

```
[Select document type ▾]  [Choose file]  [Upload]

States:
  - idle: show the controls above
  - uploading: disable controls, show spinner
  - success: flash green banner "Document uploaded", refresh list
  - error: AlertBanner tone="error"
```

Uses `useUploadBatchDocument(batchId)` from Layer 1.

---

## Layer 4 — Supplier Portal

---

### 4.1 New page: Customer Requests

**New file:** `src/pages/supplier/SupplierRequestsPage/SupplierRequestsPage.tsx`

Route: `ROUTES.SUPPLIER_REQUESTS = '/supplier/requests'`
Auth: `requireSupplier` (same guard as other supplier routes)

Uses `useSupplierOrderRequests()` from Layer 1.

**What it renders:**

Header:
```
"Customer Requests"                           (h1, text-xl font-semibold text-gray-900)
"Orders where a customer named you as their supplier."   (p, text-sm text-gray-500)
```

List (Card `className="p-0 divide-y divide-gray-100"`):

Each row:
```tsx
<div className="flex items-center gap-3 px-4 py-4">
  <div className="flex-1 min-w-0">
    <div className="flex flex-wrap items-center gap-2 mb-1">
      {/* Mode badge */}
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        {modeIcon(request.shipmentType)}
        {modeLabel(request.shipmentType)}
      </span>
      {/* Status */}
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        {request.statusV2 ?? 'Pending'}
      </span>
    </div>
    <p className="text-sm font-medium text-gray-900 truncate">
      {request.description ?? 'No description provided'}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">
      {request.weight && `${request.weight}`}
      {request.declaredValue && ` · USD ${request.declaredValue}`}
      {` · ${new Date(request.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
    </p>
  </div>
</div>
```

**States:**

Loading: 4× skeleton rows (matches pattern in SupplierDashboardPage)

Empty:
```tsx
<Card className="p-12 flex flex-col items-center gap-4 text-center">
  <Inbox className="h-10 w-10 text-gray-300" />
  <div>
    <p className="font-medium text-gray-700">No requests yet</p>
    <p className="mt-1 text-sm text-gray-400">
      When a customer names you as their supplier, their request will appear here.
    </p>
  </div>
</Card>
```

Error: `<AlertBanner tone="error" message="Failed to load requests. Please refresh." />`

**No click-through detail page needed yet.** Requests are read-only at this stage.

---

### 4.2 Supplier dashboard — add navigation

**`src/pages/supplier/SupplierDashboardPage/SupplierDashboardPage.tsx`**

Add a two-tab nav above the declarations list:

```tsx
const SUPPLIER_TABS = [
  { id: 'declarations', label: 'My Goods Notices', href: ROUTES.SUPPLIER_DASHBOARD },
  { id: 'requests',     label: 'Customer Requests', href: ROUTES.SUPPLIER_REQUESTS },
];
```

Style matches the existing status filter tabs — same `rounded-xl border border-gray-200 bg-white p-1` pill group, but these are `<Link>` elements (navigation), not `<button>` elements (filter).

Active state is derived from `location.pathname`.

---

### 4.3 Supplier layout nav

**`src/components/supplier/SupplierLayout.tsx`** (or wherever the supplier sidebar/header is defined)

Add a navigation link to `ROUTES.SUPPLIER_REQUESTS` labelled "Customer Requests" with an `Inbox` icon from lucide-react.

---

## Appendix — What does NOT change

These exist and stay as-is. Do not touch:

| What | Why |
|---|---|
| `/batches/:batchId` detail page | Still needed — Operations pipeline links to it |
| `/shipments/new` intake wizard | Staff intake wizard — separate from customer booking form |
| `/supplier/goods-notices/*` detail pages | Existing declaration flow unchanged |
| `/clients`, `/team`, `/settings`, `/reports` | Staff CRM and admin pages — untouched |
| `/support/*` | Support ticket flow — unchanged |
| `/profile` | User profile — unchanged |
| `/track` public page | Public tracking — unchanged |
| Auth flows | Login, MFA, complete profile — unchanged |
| Payment flow | `/payments`, `/payments/callback` — unchanged |
| `ui-registry.md` component classes | All new components must match — don't drift |

---

## Appendix — Run before shipping each layer

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint src/ --ext .ts,.tsx

# Unit tests
npx vitest run

# Find remaining hardcoded hex values
grep -r "bg-\[#\|border-\[#\|text-\[#" src/ --include="*.tsx" --include="*.ts"

# Find remaining pre-order language
grep -ri "pre.order\|preorder\|isPreorder" src/
```
