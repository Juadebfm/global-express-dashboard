# Phase 1 UX Changes Checklist

## Goal
- Simplify dashboard UX so users can complete core actions faster with less confusion.
- Keep this phase frontend-only (no backend/API contract changes).

## Scope
- In scope: dashboard layout hierarchy, CTA prioritization, KPI simplification, table usability, empty-state guidance, basic navigation cleanup.
- Out of scope: new backend endpoints, data model changes, feature rewrites.

## Principles
- One clear primary action per screen.
- Reduce visual competition.
- Show next best action in every empty state.
- Keep patterns consistent across cards, tabs, and controls.

## Baseline
- [ ] Capture before screenshots (desktop + mobile).
- [ ] Record baseline metrics from beta feedback:
  - [ ] "Could not tell what to do first"
  - [ ] "Too many actions on screen"
  - [ ] "Dashboard feels rigid/confusing"

## Work Checklist

### 1) Header Action Hierarchy
- [ ] Keep one primary CTA in dashboard header (`Create Shipment` / `Pre-Order`).
- [ ] Move secondary actions (`Track Shipment`, `Export`) to ghost/secondary styling.
- [ ] Ensure primary CTA is first in keyboard/tab order.
- [ ] File: `src/pages/dashboard/components/DashboardHeader.tsx`
- [ ] Acceptance: users can identify primary action in under 2 seconds.
 - Note: `DashboardHeader.tsx` was updated, but the screenshoted "Home" experience appears to be a different UI path/component set and still needs targeted work there.

### 2) Dashboard Content Priority
- [ ] Reorder dashboard sections to reflect task flow:
  - [ ] Quick actions / key status
  - [ ] Active items
  - [ ] Historical trends
- [ ] Reduce excessive vertical spacing and dead zones.
- [ ] File: `src/pages/dashboard/DashboardPage/DashboardPage.tsx`
- [ ] Acceptance: top viewport communicates “what now” without scrolling.

### 3) KPI Simplification
- [ ] Limit default KPI cards to highest-value metrics (max 3-4).
- [ ] Hide/soft-deprioritize low-signal zero-value cards where appropriate.
- [ ] Standardize label/value/helper text hierarchy.
- [ ] Files:
  - `src/pages/dashboard/components/KpiGrid.tsx`
  - `src/pages/dashboard/components/KpiCard.tsx`
- [ ] Acceptance: KPI row is scannable in one pass.

### 4) Shipment List Clarity
- [ ] Remove or demote ambiguous global action icons in table header.
- [ ] Keep tab labels clear (`All`, `Pending`, `Active`, `Completed`, `Exception`).
- [ ] Ensure empty state includes clear next action.
- [ ] File: `src/pages/dashboard/components/DashboardShipmentList.tsx`
- [ ] Acceptance: user understands list purpose and next step immediately.

### 5) Navigation Simplification
- [x] Group sidebar items by primary workflow vs utility.
- [x] Keep utility links (support/settings/help) visually separated.
- [x] Preserve existing role-based nav logic.
- [x] File: `src/components/layout/AppLayout/Sidebar.tsx`
- [ ] Acceptance: users find top 3 tasks without trial-and-error clicks.

### 6) Topbar Noise Reduction
- [x] Reduce competing emphasis between search, notifications, language, and avatar.
- [x] Keep controls compact and consistent.
- [x] File: `src/components/layout/AppLayout/Topbar.tsx`
- [ ] Acceptance: header feels clean and not overloaded.

### 7) Empty-State UX Improvements
- [ ] Add action-oriented copy to empty states:
  - [ ] KPI empty
  - [ ] Active deliveries empty
  - [ ] Shipment list empty
- [ ] Files:
  - `src/pages/dashboard/components/KpiGrid.tsx`
  - `src/pages/dashboard/components/ActiveDeliveries.tsx`
  - `src/pages/dashboard/components/DashboardShipmentList.tsx`
- [ ] Acceptance: every empty state tells users exactly what to do next.

### 8) Visual Consistency Pass
- [ ] Standardize card radius, border, and shadows.
- [ ] Standardize heading sizes and section spacing.
- [ ] Ensure button variants are consistent across dashboard widgets.
- [ ] Files: dashboard components + `AppLayout`.
- [ ] Acceptance: interface feels unified (no “mixed styles”).

## QA Checklist
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Desktop QA:
  - [ ] 1280px
  - [ ] 1440px
  - [ ] 1920px
- [ ] Mobile/Tablet QA:
  - [ ] Sidebar open/close
  - [ ] Topbar controls
  - [ ] Table horizontal behavior
- [ ] Verify no regression in role-based routes and nav visibility.

## Rollout Checklist
- [ ] Capture after screenshots (same pages as baseline).
- [ ] Share before/after with beta users.
- [ ] Collect focused UX feedback:
  - [ ] “Can you tell what to do first?”
  - [ ] “Can you find Create Shipment quickly?”
  - [ ] “Is this easier than previous build?”
- [ ] Log follow-up items for Phase 2.

## Progress Tracker
- [x] Phase 1 started
- [x] 25% complete
- [ ] 50% complete
- [ ] 75% complete
- [ ] Phase 1 complete

## Notes
- Use this file as the single execution checklist.
- Check items only after implementation + QA confirmation.
