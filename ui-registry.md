# UI Registry — Global Express Dashboard

Established via `/imprint audit` — 2026-06-24
Updated via `/imprint audit` — 2026-06-28 (radius + shadow corrections confirmed)

Read this before building any component. Every new component must match the baseline below.
Run `/imprint [filepath]` after building to keep this registry current.

---

## Baseline

| Property | Correct class | Notes |
|---|---|---|
| Page background | `bg-gray-50` | App shell wraps all content |
| Card / panel background | `bg-white` | |
| Card / panel border | `border border-gray-200` | |
| Card / panel radius | `rounded-2xl` | Updated 2026-06-28 — most pages already use this |
| Card / panel shadow | none | `shadow-sm` on cards is incorrect — use border only |
| Modal / bottom-sheet background | `bg-white` | Elevated floating surfaces only |
| Modal radius — desktop | `rounded-3xl` | Elevated floating surfaces |
| Modal radius — mobile | `rounded-t-3xl` | Bottom-sheet pattern |
| Input background | `bg-white` | |
| Input border | `border border-gray-200` | No inline styles — use Tailwind class |
| Input radius | `rounded-xl` | Updated 2026-06-28 — consistent with buttons and dropdowns |
| Input focus | `focus:border-brand-500 focus:outline-none` | |
| Button (primary) | `bg-brand-500 hover:bg-brand-600 text-white rounded-xl` | |
| Button (secondary) | `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl` | |
| Button (ghost) | `bg-transparent text-gray-700 hover:bg-gray-100 rounded-xl` | |
| Status badge / pill | `rounded-full` | Never use `rounded-xl` or `rounded-lg` for badges |
| Text — primary | `text-gray-900` | Body copy, headings |
| Text — secondary | `text-gray-500` | Subtitles, helper text |
| Text — muted | `text-gray-400` | Timestamps, labels, captions |
| Text — form label | `text-sm font-medium text-gray-700` | Above every input |
| Focus ring | `focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:outline-none` | |
| Row hover | `hover:bg-gray-50 transition-colors` | List rows, table rows |
| Sidebar active item | `bg-brand-50 text-brand-500` | |
| Section spacing | `space-y-6` (page sections) `space-y-3` (within cards) | |
| Content padding | `px-6 py-6 lg:px-10 lg:py-8` | Set in AppLayout — don't duplicate in pages |

---

## Three-Tier Radius System

| Tier | Class | Use for |
|---|---|---|
| Surface | `rounded-2xl` | Cards, panels, tables, banners, filter bars |
| Input / control | `rounded-xl` | All form inputs, selects, search bars, action buttons |
| Elevated | `rounded-3xl` / `rounded-t-3xl` | Modals, drawers, floating detail panels |
| Badge | `rounded-full` | Status pills, mode badges, progress dots only |

**Retired:** `rounded-md`, `rounded-lg` (for new components — legacy `<Input>` and `<AlertBanner>` components still use `rounded-lg` internally and are exempt until refactored).

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

## Components

### Card

File: `src/components/ui/Card/Card.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Background | `bg-white` |
| Border | `border border-gray-200` |
| Border radius | `rounded-2xl` |
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
Last updated: 2026-06-24 (radius standard updated 2026-06-28)

| Property | Class |
|---|---|
| Background | `bg-white` |
| Border | `border border-gray-200` |
| Border radius | `rounded-xl` |
| Padding | `px-4 py-2.5` |
| Text | `text-sm text-gray-900` |
| Placeholder | `placeholder:text-sm placeholder:text-gray-400` |
| Label | `text-sm font-medium text-gray-700 mb-1.5` |
| Focus | `focus:border-brand-500 focus:outline-none` |
| Error border | `border-red-500` |
| Error message | `text-sm text-red-600 mt-1.5` |
| Hover | `hover:border-gray-400` |

**Pattern notes:**
Radius updated to `rounded-xl` (2026-06-28) to match all other controls. The `<Input>` component handles its own label and error state — do not wrap with external `<label>` tags. Custom inline inputs (search bars, date pickers) should also use `rounded-xl`.

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
Uses the Status / Tone Colours table above. `shadow-sm` is intentional on `AlertBanner` (it floats above content as a notification). Supports `onRetry` and `onClose`. The `referenceId` prop renders a monospace `Ref:` footer for support tickets.

---

### ConfirmModal

File: `src/components/ui/ConfirmModal/ConfirmModal.tsx`
Last updated: 2026-06-24

| Property | Class |
|---|---|
| Overlay | `bg-black/40` |
| Container | `rounded-3xl bg-white p-6 shadow-xl max-w-md` |
| Title | `text-base font-semibold text-gray-900` |
| Body | `text-sm text-gray-500 mt-1` |
| Cancel button | `rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700` |
| Confirm (default) | `rounded-xl bg-brand-500 text-white text-sm font-semibold` |
| Confirm (danger) | `rounded-xl bg-red-600 text-white text-sm font-semibold` |

**Pattern notes:**
`rounded-3xl` is correct here — elevated floating surface. Escape key closes the modal (unless `isLoading`). Clicking the overlay also closes. Danger tone adds a red circle icon with `AlertTriangle`.

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
Always call `isInternalTracking()` first. Padding is `px-4 py-3.5` (tighter than `px-5 py-4` used in staff rows). Links to `${ROUTES.ORDERS}?id=${row.id}`.

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

**Pattern notes:**
Tab strip uses `rounded-xl` outer / `rounded-lg` inner — segmented control pattern. One `useOrders(1, 100)` call shared across tabs.

---

### SupplierRequestsPage

File: `src/pages/supplier/SupplierRequestsPage/SupplierRequestsPage.tsx`
Last updated: 2026-06-25

| Property | Class |
|---|---|
| Page heading | `text-xl font-semibold text-gray-900` (supplier portal uses `xl`, not `2xl`) |
| Tab strip container | `rounded-xl border border-gray-200 bg-white p-1 flex gap-1 w-fit` |
| Tab link — active | `rounded-lg px-3 py-1.5 text-sm font-medium bg-brand-500 text-white shadow-sm` |
| Tab link — inactive | `rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50` |

**Pattern notes:**
Supplier portal pages use `text-xl` headings. Tab strip identical to OperationsPage.

---

### ClientsPage

File: `src/pages/clients/ClientsPage/ClientsPage.tsx`
Last updated: 2026-06-28

| Property | Class |
|---|---|
| KPI cards | `rounded-2xl border border-gray-200 bg-white p-5` |
| Filter panel | `rounded-2xl border border-gray-200 bg-white p-4 sm:p-6` |
| Table wrapper | `rounded-2xl border border-gray-200 bg-white` |
| Table — th divider | `border-r border-gray-200` |
| Table — td divider | `border-r border-gray-100` |
| Table — row hover | `hover:bg-gray-50 transition` |
| Action icons | `h-5 w-5 text-gray-400 hover:text-brand-600` (edit/view) / `hover:text-rose-600` (delete) |
| Detail modal | `rounded-t-3xl sm:rounded-3xl bg-white max-w-lg` |
| Edit modal | `rounded-t-3xl sm:rounded-3xl bg-white max-w-2xl` |
| Drag handle (mobile) | `mx-auto mt-3 h-1 w-10 rounded-full bg-gray-200` |

**Pattern notes:**
Table uses both horizontal (`divide-y divide-gray-100` on tbody) and vertical (`border-r` on cells) dividers. Last column never gets `border-r`. All cells are `whitespace-nowrap` — no truncation. Shipping mark displayed in `font-mono text-xs font-semibold text-brand-600`. Edit modal is `max-w-2xl` (wider than detail modal `max-w-lg`) to accommodate the 2-column field grid.

---

## Known Tech Debt

- `src/components/forms/SupportTicketForm/SupportTicketForm.tsx` — raw `border-[#DDE5E9]` hex inputs
- `src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx` — raw hex inputs
- `src/pages/auth/CompleteProfilePage/CompleteProfilePage.tsx` — raw hex inputs
- `src/pages/profile/ProfilePage/ProfilePage.tsx` — raw hex inputs
- `src/pages/settings/SettingsPage/SettingsPage.tsx` — `SectionShell` uses `shadow-sm` on cards (should be removed per 2026-06-28 baseline)
- `src/pages/reports/ReportsPage/ReportsPage.tsx` — date inputs use `rounded-lg` (should be `rounded-xl`)
- `src/pages/settings/SettingsPage/SettingsPage.tsx` — `FieldInput` uses `rounded-lg` (should be `rounded-xl`)
