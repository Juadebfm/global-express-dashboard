# UI Registry — Global Express Dashboard

Established via `/imprint audit` — 2026-06-24

Read this before building any component. Every new component must match the baseline below.
Run `/imprint [filepath]` after building to keep this registry current.

---

## Baseline

| Property | Correct class | Notes |
|---|---|---|
| Page background | `bg-gray-50` | App shell wraps all content |
| Card / panel background | `bg-gray-50` | Replaces legacy `bg-[#F5F7FA]` |
| Card / panel border | `border border-gray-200` | Replaces legacy `border-[#DDE5E9]` |
| Card / panel radius | `rounded-xl` | Surface-level containers |
| Modal / drawer background | `bg-white` | Elevated floating surfaces only |
| Modal / drawer radius | `rounded-2xl` | Elevated floating surfaces only |
| Input background | `bg-white` | |
| Input border | `border border-gray-200` | No inline styles — use Tailwind class |
| Input radius | `rounded-lg` | Intentional — inputs sit slightly softer than cards |
| Button (primary) | `bg-brand-500 hover:bg-brand-600 text-white rounded-xl` | |
| Button (secondary) | `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl` | `gray-300` border is intentional — needs to read on `bg-white` |
| Button (ghost) | `bg-transparent text-gray-700 hover:bg-gray-100 rounded-xl` | |
| Status badge / pill | `rounded-full` | Never use `rounded-xl` or `rounded-lg` for badges |
| Text — primary | `text-gray-900` | Body copy, headings |
| Text — secondary | `text-gray-500` | Subtitles, helper text |
| Text — muted | `text-gray-400` | Timestamps, labels, captions |
| Text — form label | `text-sm font-medium text-gray-700` | Above every input |
| Focus ring | `focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:outline-none` | |
| Row hover | `hover:bg-gray-50 transition-colors` | List rows, table rows |
| Sidebar active item | `bg-brand-50 text-brand-500` | Replaces legacy `bg-[#FFF7F2]` |
| Section spacing | `space-y-6` (page sections) `space-y-3` (within cards) | |
| Content padding | `px-6 py-6 lg:px-10 lg:py-8` | Set in AppLayout — don't duplicate in pages |

---

## Three-Tier Radius System

| Tier | Class | Use for |
|---|---|---|
| Surface | `rounded-xl` | Cards, panels, tabs, chips, action buttons, banners |
| Input | `rounded-lg` | All form inputs (intentionally softer) |
| Elevated | `rounded-2xl` | Modals, drawers, floating detail panels |
| Badge | `rounded-full` | Status pills, mode badges, progress dots only |

**Retired:** `rounded-md`, `rounded-3xl` — do not use in new components.

---

## Status / Tone Colours

Always use semantic Tailwind scales. Never hardcode hex.

| State | Background | Text | Border |
|---|---|---|---|
| Success | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| Error | `bg-red-50` | `text-red-700` | `border-red-200` |
| Warning | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Info | `bg-blue-50` | `text-blue-800` | `border-blue-200` |
| Brand / active | `bg-brand-50` | `text-brand-700` | `border-brand-100` |
| Neutral | `bg-gray-100` | `text-gray-600` | `border-gray-200` |

---

---

## Components

### Card

File: `src/components/ui/Card/Card.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Background | `bg-gray-50` |
| Border | `border border-gray-200` |
| Border radius | `rounded-xl` |
| Padding | `p-6` |
| Shadow | none |

**Pattern notes:**
`className` prop is spread via `cn()` — callers can override padding with `p-0` for flush list layouts (e.g. `<Card className="p-0 divide-y divide-gray-100">`). Background and border come from the baseline; do not override them in page-level usage.

---

### Button

File: `src/components/ui/Button/Button.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Border radius | `rounded-xl` |
| Font weight | `font-medium` (not semibold) |
| Shadow | `shadow-sm` (disappears on ghost/secondary) |
| Focus ring | `focus:ring-2 focus:ring-brand-500 focus:ring-offset-2` |
| Disabled | `opacity-60 cursor-not-allowed shadow-none` |
| Size sm | `px-3.5 py-2.5 text-sm` (~40px tall) |
| Size md | `px-5 py-3 text-base` (~48px tall) |
| Size lg | `px-7 py-4 text-base` (~56px tall) |

**Pattern notes:**
Page-level CTAs use `size="sm"` throughout the app. `size="lg"` is reserved for sticky footer confirms and modal primary actions. Loading state replaces `leftIcon` with a spinner — never show both.

---

### Input

File: `src/components/ui/Input/Input.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Background | `bg-white` |
| Border | `border border-gray-200` (no inline style) |
| Border radius | `rounded-lg` |
| Padding | `px-4 py-2.5` |
| Text | `text-sm text-gray-900` |
| Placeholder | `placeholder:text-sm placeholder:text-gray-400` |
| Label | `text-sm font-medium text-gray-700 mb-1.5` |
| Focus | `focus:ring-2 focus:ring-brand-500 focus:border-transparent` |
| Error border | `border-red-500 focus:ring-red-500` |
| Error message | `text-sm text-red-600 mt-1.5` |
| Hover | `hover:border-gray-400` |

**Pattern notes:**
`rounded-lg` is intentional — inputs read slightly softer than `rounded-xl` cards. Do not "fix" this to `rounded-xl`. The `<Input>` component handles its own label and error state — do not wrap it with external `<label>` tags.

---

### AlertBanner

File: `src/components/ui/AlertBanner/AlertBanner.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Border radius | `rounded-lg` |
| Padding | `px-4 py-3` |
| Shadow | `shadow-sm` |
| Border | `border` + tone-specific colour |
| Text size | `text-sm` |
| Icon size | `h-4 w-4` |

**Pattern notes:**
Uses the Status / Tone Colours table above. Supports `onRetry` and `onClose` — always provide `onClose` when used in `FeedbackCenter` (toast context). The `referenceId` prop renders a monospace `Ref:` footer for support tickets.

---

### ConfirmModal

File: `src/components/ui/ConfirmModal/ConfirmModal.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Overlay | `bg-black/40` |
| Container | `rounded-2xl bg-white p-6 shadow-xl max-w-md` |
| Title | `text-base font-semibold text-gray-900` |
| Body | `text-sm text-gray-500 mt-1` |
| Cancel button | `rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700` |
| Confirm (default) | `rounded-xl bg-brand-500 text-white text-sm font-semibold` |
| Confirm (danger) | `rounded-xl bg-red-600 text-white text-sm font-semibold` |

**Pattern notes:**
`rounded-2xl` is correct here — this is an elevated floating surface. Escape key closes the modal (unless `isLoading`). Clicking the overlay also closes. Danger tone adds a red circle icon with `AlertTriangle`.

---

### Status Badge (inline pattern)

No dedicated component — applied inline wherever a status pill is needed.

| Property | Class |
|---|---|
| Border radius | `rounded-full` |
| Padding | `px-2.5 py-0.5` |
| Text | `text-xs font-semibold` |
| Dot indicator | `h-1.5 w-1.5 rounded-full` (same colour as text, one shade darker) |

**Pattern notes:**
Always use the Status / Tone Colours table above. Never hardcode a hex. The dot + label pattern is established in `OrderDetailHeader` — follow it.

---

### ShipmentRow

File: `src/pages/dashboard/DashboardPage/components/ShipmentRow.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Row link | `flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors` |
| Mode icon | `h-4 w-4` inside `shrink-0 text-gray-400` wrapper |
| Description | `text-sm font-medium text-gray-900 truncate` |
| Status badge | `rounded-full px-2.5 py-0.5 text-xs font-semibold` + dynamic bg/text from `getStatusStyle()` |
| Status dot | `h-1.5 w-1.5 rounded-full` + dynamic dot class from `getStatusStyle()` |
| Tracking (assigned) | `text-xs font-mono text-gray-600` |
| Tracking (internal) | `text-xs text-gray-400 italic` |
| Date / separator | `text-xs text-gray-400` / `text-xs text-gray-300` |

**Pattern notes:**
Always call `isInternalTracking()` first — render the italic gray path for internal tracking, `font-mono text-gray-600` for real numbers. Never call `formatTrackingDisplay()` and render the result in `font-mono` — the fallback string `'Awaiting assignment'` must use the italic/muted path. Padding is `px-4 py-3.5` (tighter than the `px-5 py-4` used in staff operation rows — intentionally more compact for the customer list). Links to `${ROUTES.ORDERS}?id=${row.id}`.

---

### NewBookingPage

File: `src/pages/bookings/NewBookingPage/NewBookingPage.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Page container | `max-w-lg mx-auto space-y-6` |
| Page heading | `text-2xl font-semibold text-gray-900` |
| Page subtitle | `mt-1 text-sm text-gray-500` |
| Step card | standard `<Card className="space-y-4">` — inherits `rounded-xl border border-gray-200 bg-gray-50 p-6` |
| Section label | `text-sm font-semibold text-gray-700` |
| Form label | `text-sm font-medium text-gray-700 mb-1.5 block` |
| Textarea / select | `rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900` + focus: `focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none` |
| Textarea hover | `hover:border-gray-400` |
| Radio / checkbox accent | `accent-brand-500` |
| Field error | `text-sm text-red-600 mt-1.5` |
| Section divider | `border-t border-gray-200` |
| Submit button | `size="md" w-full` (full-width, medium height — unique to form-page CTAs) |
| Success card | `<Card className="flex flex-col items-center gap-4 p-10 text-center">` |
| Success icon | `h-12 w-12 text-emerald-500` (`CheckCircle`) |
| Success heading | `text-lg font-semibold text-gray-900` |

**Pattern notes:**
Two-card layout (shipment details then recipient) separated by a `border-t border-gray-200` divider. Textarea and select share the same `rounded-lg border border-gray-200 bg-white px-4 py-2.5` base as `<Input>` — they are manually styled to match since they can't use the Input component. Success state replaces the form in-place (no redirect) and uses a centred `p-10` card — the only place in the app with that much interior padding. Idempotency key lives in a `useRef` and is regenerated on "Book another" before calling `reset()`.

---

### OperationsPage

File: `src/pages/operations/OperationsPage/OperationsPage.tsx`
Last updated: 2026-06-25

| Property | Class |
|---|---|
| Page heading | `text-2xl font-semibold text-gray-900` |
| Tab strip container | `rounded-xl border border-gray-200 bg-white p-1 flex gap-1 w-fit` |
| Tab button — active | `rounded-lg px-3 py-1.5 text-sm font-medium bg-brand-500 text-white shadow-sm` |
| Tab button — inactive | `rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50` |
| List card | `<Card className="p-0 divide-y divide-gray-100">` |
| Empty state card | `<Card className="p-8 text-center">` + `text-sm text-gray-500` |
| OperationRow | `flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors` |
| Row — primary text | `text-sm font-medium text-gray-900 truncate` |
| Row — secondary text | `text-xs text-gray-500 truncate` |
| Row — tracking (real) | `text-xs font-mono text-gray-400` |
| Row — tracking (internal) | `text-xs italic text-gray-400` |
| Row — status badge | `rounded-full px-2 py-0.5 text-xs font-semibold` + dynamic tone from `getStatusStyle()` |
| Row action link | `text-xs font-medium text-brand-600 hover:text-brand-700` |
| Skeleton row | `flex items-center gap-3 px-4 py-3.5 animate-pulse` with `h-4 w-4 rounded bg-gray-200` icon + `h-3.5 w-2/3 / h-3 w-1/3 rounded bg-gray-200/bg-gray-100` lines |

**Pattern notes:**
Tab strip uses `rounded-xl` for the outer pill container and `rounded-lg` for individual tab buttons — this is the correct three-tier radius pattern for a segmented control. The `OperationRow` tracking number is always passed through `formatTrackingDisplay()` — staff see real values, but the helper is mandatory to maintain a single render path. One `useOrders(1, 100)` call shared across needs-action / in-batch / dispatched tabs; arrivals keeps its own `AWAITING_WAREHOUSE_RECEIPT` query. Status badge uses `px-2 py-0.5` (slightly tighter than customer-facing `px-2.5 py-0.5`) — this was intentional for the denser staff row.

---

### SupplierRequestsPage

File: `src/pages/supplier/SupplierRequestsPage/SupplierRequestsPage.tsx`
Last updated: 2026-06-25

| Property | Class |
|---|---|
| Page heading | `text-xl font-semibold text-gray-900` (supplier portal uses `xl`, not `2xl`) |
| Page subtitle | `mt-0.5 text-sm text-gray-500` |
| Tab strip container | `rounded-xl border border-gray-200 bg-white p-1 flex gap-1 w-fit` |
| Tab link — active | `rounded-lg px-3 py-1.5 text-sm font-medium bg-brand-500 text-white shadow-sm` |
| Tab link — inactive | `rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50` |
| List card | `<Card className="divide-y divide-gray-100 overflow-hidden p-0">` |
| Empty state card | `<Card className="p-12 flex flex-col items-center gap-4 text-center">` |
| Empty icon | `h-10 w-10 text-gray-300` (`Inbox`) |
| Empty heading | `font-medium text-gray-700` |
| Empty body | `mt-1 text-sm text-gray-400` |
| RequestRow | `flex items-center gap-3 px-4 py-4` (no hover — read-only list) |
| Row — primary text | `text-sm font-medium text-gray-900 truncate` |
| Row — meta text | `text-xs text-gray-400 mt-0.5` |
| Mode badge | `rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600` with icon |
| Status badge | `rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700` |
| Skeleton badge | `h-5 w-28 rounded-full bg-gray-100 animate-pulse` |
| Skeleton line | `h-4 w-48 rounded bg-gray-100 animate-pulse` / `h-3 w-32 rounded bg-gray-100 animate-pulse` |

**Pattern notes:**
Supplier portal pages use `text-xl` headings (one step smaller than the `text-2xl` used in the main app). The tab strip is identical to `OperationsPage`'s tab strip — `rounded-xl` outer / `rounded-lg` inner — and is the shared supplier-portal nav pattern: both `SupplierDashboardPage` and `SupplierRequestsPage` must render the same `SUPPLIER_TABS` array so both tabs appear on both pages. `RequestRow` has no hover state — rows are not clickable. Skeleton badges use `rounded-full` to mirror the real badge shape they stand in for.

---

## Known Tech Debt

These files still use raw `border-[#DDE5E9]` hex on native HTML inputs instead of `border-gray-200`. Not blocking. Swap when each page is next touched — replace raw inputs with `<Input>` component or at minimum replace the hex class.

- `src/components/forms/SupportTicketForm/SupportTicketForm.tsx`
- `src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx`
- `src/pages/auth/CompleteProfilePage/CompleteProfilePage.tsx`
- `src/pages/profile/ProfilePage/ProfilePage.tsx`
