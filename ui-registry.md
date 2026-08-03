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
Always call `isInternalTracking()` first. Padding is `px-4 py-3.5` (tighter than `px-5 py-4` used in staff rows). The row is a full-width button which opens the customer shipment-detail modal; preserve the same hover and inset brand focus treatment.

### Dashboard Shipment Table

File: `src/pages/dashboard/DashboardPage/components/ShipmentTable.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Wrapper | `hidden md:block overflow-x-auto` |
| Header | `bg-gray-50 text-xs font-medium text-gray-400` |
| Header dividers | `border-r border-gray-200` |
| Cell dividers | `border-r border-gray-100` |
| Cell spacing | `px-5 py-4` |
| Row | `bg-white cursor-pointer hover:bg-gray-50 transition-colors` |
| Keyboard state | `focus-visible:bg-brand-50` |
| Status | `rounded-full px-2.5 py-0.5 text-xs font-semibold` |
| Shadow | none |
| Accent usage | `bg-brand-50` for keyboard focus only |

**Pattern notes:**
Desktop customer shipment lists use five columns: goods, tracking number, shipment type, booked date, and status. Entire rows open the shipment detail modal. Preserve `ShipmentRow` as the mobile-only alternative instead of forcing horizontal scrolling on narrow viewports.

### Customer Shipment Details Modal

File: `src/pages/dashboard/DashboardPage/components/ShipmentDetailsModal.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Overlay | `bg-black/40` |
| Container | `bg-white shadow-xl rounded-t-3xl sm:rounded-3xl` |
| Section surface | `rounded-2xl border border-gray-200 bg-white p-4` |
| Warehouse state | `rounded-2xl border border-brand-100 bg-brand-50 p-4` |
| Heading | `text-lg font-semibold text-gray-900` |
| Body text | `text-sm text-gray-500` |
| Spacing | `p-6` with `space-y-5` sections |
| Interactive state | `hover:bg-gray-100` with `focus:ring-2 focus:ring-brand-500` |
| Shadow | `shadow-xl` on modal only |
| Accent usage | `bg-brand-50 text-brand-700` for warehouse and shipment mode |

**Pattern notes:**
Use this detail-on-demand pattern for customer list rows: open a scrollable desktop modal or mobile bottom sheet, load detailed data after selection, and keep the list in place behind the overlay. Goods remain separate bordered cards; semantic amber is reserved for additional handling notices.

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

### Responsive public modal

File: `src/pages/public/GalleryPage/GalleryPage.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Overlay | `bg-black/40` |
| Container — mobile | `rounded-t-3xl bg-white max-h-[calc(100dvh-1rem)] overflow-y-auto` |
| Container — desktop | `sm:rounded-3xl sm:max-h-[calc(100dvh-3rem)]` |
| Spacing | `p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]` for form sheets |
| Input | `rounded-xl border border-gray-200 bg-white px-4 py-2.5` |
| Focus | `focus:border-brand-500 focus:ring-2 focus:ring-brand-500` |
| Primary action | `<Button variant="primary">` |
| Secondary action | `<Button variant="secondary">` |
| Shadow | `shadow-xl` |

**Pattern notes:**
Public forms use a bottom sheet on mobile and a centred modal from `sm` upward. The scrollable container and safe-area-aware bottom padding keep actions reachable on short screens. Do not introduce blue or dark-mode-only control classes in the otherwise light dashboard UI.

---

### Supplier directory picker and details

File: `src/pages/bookings/NewBookingPage/NewBookingPage.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Search input | `rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4` |
| Supplier result row | `border-b border-gray-100 px-3 py-3 hover:bg-gray-50` |
| Result title | `text-sm font-medium text-gray-900` |
| Result metadata | `text-xs text-gray-500` |
| Selected state | `rounded-xl border border-brand-200 bg-brand-50 px-3 py-3` |
| Details modal | `rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl` |
| Contact channel | `rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50` |
| Service tag | `rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700` |

**Pattern notes:**
Directory results are detail-first: opening a row reveals location, display-only verification status, services, and approved public contacts before the primary “Use this supplier” action. On mobile, the detail view is a safe-area-aware bottom sheet; on desktop it is a centred modal. Keep the selected supplier in a brand-tinted confirmation panel and use a plain text “Change” action to clear it.

---

### Supplier directory profile forms

Files: `src/pages/supplier/SupplierDirectoryProfilePage/SupplierDirectoryProfilePage.tsx`, `src/pages/admin/AdminSupplierDirectoryProfilePage/AdminSupplierDirectoryProfilePage.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Information panel | `rounded-xl border border-gray-200 bg-gray-50 px-4 py-3` |
| Form fields | `<Input>` / `rounded-xl border border-gray-200 bg-white px-4 py-2.5` |
| Opt-in control | `rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50` |
| Status pill | `rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700` |
| Service tag | `rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700` |
| Visibility on | `text-emerald-600` |
| Staff action | `<Button size="sm">` with primary/secondary variants |

**Pattern notes:**
Supplier-controlled discoverability and staff-managed verification must remain visually and conceptually separate. Explain that verification is informational and never make a staff action imply it can publish a supplier. Use a bordered neutral information panel for requirements and semantic amber/red feedback for incomplete or failed saves.

---

### Signup identity availability gate

File: `src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Inline field error | Input error state: `border-red-500` / `text-red-600` |
| Progress copy | `text-sm text-gray-600` |
| Primary action | `<Button size="lg" className="auth-cta-btn w-full">` |
| Action loading state | Built-in `Loader2 h-4 w-4 animate-spin` with disabled opacity |
| CAPTCHA target | `space-y-2` wrapper with `aria-live="polite"` |

**Pattern notes:**
Identity availability is an in-place progress state, never a new screen or modal. Keep entered values visible but lock the fieldset during the request so results cannot apply to stale data. Put duplicate and validation feedback beside the relevant identity field; reserve the red form banner for retryable rate-limit and service failures. Do not mount Clerk's CAPTCHA target until the backend confirms both primary email and phone are available.

---

### Self-service avatar uploader

File: `src/components/profile/AvatarUploader.tsx`
Last updated: 2026-07-26

| Property | Class |
|---|---|
| Avatar image | `h-28 w-28 rounded-full border-2 border-brand-500 object-cover` |
| Initials fallback | `h-28 w-28 rounded-full bg-brand-50 text-5xl font-semibold text-brand-500` |
| File actions | `<Button size="sm">`; choose/remove use `variant="secondary"` |
| Helper text | `text-center text-xs text-gray-500` |
| Error feedback | `text-center text-sm text-red-600` |
| Success feedback | `text-center text-sm text-emerald-700` |

**Pattern notes:**
Keep profile images circular and preserve initials when no image is available or loading fails. A selected local image previews in the same circle before it is saved. Avatar upload is a self-service control only: do not surface a user identifier, and keep removal beside upload rather than hiding it in a menu.

---

### Actionable notification detail

File: `src/pages/notifications/NotificationsPage/NotificationsPage.tsx`
Last updated: 2026-07-27

| Property | Class |
|---|---|
| Primary order action | `rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white` |
| Hover / focus | `hover:bg-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2` |
| Icon | `ArrowUpRight h-4 w-4` |
| Action placement | `mr-auto` in the modal footer, ahead of destructive/close actions |

**Pattern notes:**
Only staff+ users see an order action, and only when a `new_order` notification resolves to an order still in `PREORDER_SUBMITTED`. The primary label is “View order”; it closes the notification detail and opens the normal Orders new-order queue using `?select=<orderId>`. Once staff starts warehouse handling, the order moves to `AWAITING_WAREHOUSE_RECEIPT` and this action is intentionally absent; the notification remains historical. Customer notifications remain informational.

---

### New-order queue

File: `src/pages/orders/OrdersPage/components/PreorderQueueStep.tsx`
Last updated: 2026-07-27

| Property | Class |
|---|---|
| Booking context | `rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4` |
| Awaiting-arrival context | `rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4` |
| Details surface | `rounded-2xl border border-gray-200 bg-white` |
| Section heading | `text-base font-semibold text-gray-900` |
| Body text | `text-sm text-gray-500` |
| Primary action | QueueShell `rounded-xl bg-brand-500` action |
| Spacing | `space-y-4` between queue sections |
| Shadow | none |

**Pattern notes:**
New bookings enter the existing staff Orders workflow through a dedicated queue, not a standalone shipment utility. Staff choose between “Await warehouse arrival” and “Goods received — verify now.” The latter carries the order through its required sequential status updates and opens the established package-verification form. Use blue for new booking review and brand tone for the awaiting-arrival state; emerald remains reserved for confirmed completion.

### Awaiting-arrival queue

File: `src/pages/orders/OrdersPage/components/AwaitingArrivalQueueStep.tsx`
Last updated: 2026-07-27

| Property | Class |
|---|---|
| Arrival context | `rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4` |
| Details surface | `rounded-2xl border border-gray-200 bg-white` |
| Section heading | `text-base font-semibold text-gray-900` |
| Body text | `text-sm text-gray-500` |
| Primary action | QueueShell `rounded-xl bg-brand-500` action |
| Spacing | `space-y-4` between queue sections |
| Shadow | none |

**Pattern notes:**
This is the durable staff holding area for a booking whose goods are not yet physically at the warehouse. Its only action moves the exact order into the existing verification workspace, where package dimensions, weight, images and pricing are handled.

### Staff profile and team invite phone/select controls

Files: `src/pages/profile/ProfilePage/ProfilePage.tsx`, `src/pages/team/TeamPage/TeamPage.tsx`
Last updated: 2026-07-30

| Property | Class |
|---|---|
| Control background | `bg-white` |
| Control border | `border border-gray-200` |
| Control radius | `rounded-2xl` in team invite modal; `rounded-lg` in legacy profile form |
| Control text | `text-sm text-gray-900` |
| Focus state | `focus:ring-2 focus:ring-brand-500` |
| Select chevron | `h-4 w-4 text-gray-400`, positioned inside the right padding |
| Phone country marker | `h-4 w-5 rounded-sm` flag with dial code selector |

**Pattern notes:**
Profile and team invite selects use `appearance-none` with a positioned Lucide chevron so the arrow does not sit against the browser control edge. Phone country selectors show the flag and dial code in the compact control; country names remain available in the native option list. Team invites validate and submit canonical E.164 phone numbers, with field-level API errors for phone conflicts and invalid formats.

---

### Gallery price controls

Files: `src/pages/admin/AdminGalleryPage/AdminGalleryPage.tsx`, `src/pages/public/GalleryPage/GalleryPage.tsx`
Last updated: 2026-07-30

| Property | Class |
|---|---|
| Price input | Shared `<Input>` — `rounded-xl border border-gray-200 bg-white px-4 py-2.5` |
| Label | `text-sm font-medium text-gray-700` (from `<Input>`) |
| Validation | Shared inline input error — `text-sm text-red-600 mt-1.5` |
| Public price | `text-sm font-semibold text-brand-700` |
| Spacing | Create form `space-y-4`; edit form `space-y-3` |

**Pattern notes:**
Car prices use NGN and for-sale prices use USD. Both are decimal strings at the API boundary to preserve precision. Price fields stay visible and editable for every Gallery-management role; drafts may omit a price, while client validation appears beside the field before a listing can be published.

---

### Team access management panel

File: `src/pages/team/TeamPage/TeamAccessPanel.tsx`
Last updated: 2026-08-03

| Property | Class |
|---|---|
| List and detail panels | `rounded-2xl border border-gray-200 bg-white` |
| Search input | `rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3` |
| Selected member row | `bg-brand-50` |
| Unselected member row | `hover:bg-gray-50 transition-colors` |
| Role badge | `rounded-full bg-gray-100` / `bg-brand-50` for Super Admin |
| Permission switch | `rounded-full` with `bg-brand-500` when enabled |
| Role-ineligible notice | `rounded-full bg-amber-50 text-amber-700` |
| Super Admin notice | `border-b border-blue-200 bg-blue-50 text-blue-800` |
| Change-role control | `rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50` |

**Pattern notes:**
The Team page is the single Superadmin workspace for both team records and individual permissions. Roles & access is a tab within that page, not a route or sidebar destination. Its staff list has its own server-backed search and pagination; it must not reuse the Team members table's current page. State the reason for a disabled permission in plain language: it applies to the selected team member's role, not the person managing the page. Keep the selected team member in a brand-tinted list row, while role badges remain compact pills. Permission changes use one five-second toast at a time so the newest result is always visible.

---

## Known Tech Debt

- `src/components/forms/SupportTicketForm/SupportTicketForm.tsx` — raw `border-[#DDE5E9]` hex inputs
- `src/pages/auth/ExternalSignUpPage/ExternalSignUpPage.tsx` — raw hex inputs
- `src/pages/auth/CompleteProfilePage/CompleteProfilePage.tsx` — raw hex inputs
- `src/pages/profile/ProfilePage/ProfilePage.tsx` — raw hex inputs
- `src/pages/settings/SettingsPage/SettingsPage.tsx` — `SectionShell` uses `shadow-sm` on cards (should be removed per 2026-06-28 baseline)
- `src/pages/reports/ReportsPage/ReportsPage.tsx` — date inputs use `rounded-lg` (should be `rounded-xl`)
- `src/pages/settings/SettingsPage/SettingsPage.tsx` — `FieldInput` uses `rounded-lg` (should be `rounded-xl`)
