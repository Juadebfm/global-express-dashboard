# GlobalExpress Dashboard — UI Actions & RBAC

Last updated: 2026-02-18

## Overview
- Inventory route has been removed from navigation and routing.
- Access control summary:
- Clients: Super Admin only.
- Team: Admin + Super Admin.
- Users: Admin + Super Admin.
- All other pages: authenticated users.

## Global (Topbar)
- Search input (global query via `useSearch`).
- Theme icon button (UI only).
- Notifications icon button (UI only).
- Language icon button (UI only).
- User avatar (display only).

## Auth — Login
- Email input.
- Password input with show/hide toggle.
- Remember password checkbox.
- Forgot password link.
- Login button.
- Create account link.

## Auth — Register
- First name input.
- Last name input.
- Email input.
- Password input with show/hide toggle.
- Confirm password input with show/hide toggle.
- Create account button.
- Login link.

## Auth — Forgot Password (multi-step)
- Step 1: Email input + Continue button + Back to login link.
- Step 2: OTP input + Continue button + Back button.
- Step 3: New password input + Confirm password input + Continue button + Back button.
- Step 4: Success screen + Continue button to Login.

## Dashboard
- Header action buttons (from `mockDashboardData.ui.actions`):
- Export.
- Track Shipment.
- New Order.

## Shipments
- Filter tabs: All, In-Transit, Delivered, Pending.
- Actions toolbar:
- Copy rows.
- Download CSV.
- Delete rows.
- Edit rows (set status via prompt).

## Clients (Super Admin only)
- Summary cards (display only): Total Clients, Active Clients, Total Revenue.
- Search input.
- Filters (custom dropdowns): Status, Priority, Type.
- Client directory row actions menu:
- View Details (opens client detail view).
- Copy Email (copies to clipboard).
- Suspend (sets status to In-Active).
- Detail view toolbar icons:
- Copy (UI only).
- Share (UI only).
- Delete (opens custom confirmation modal; deletes client).
- Edit (UI only).
- Detail view order tabs: All, Processing, Transit, Delivered, Cancelled.
- Detail view orders table (no per-row actions beyond the kebab icon placeholder).

## Users (Admin + Super Admin)
- Search input.
- Row actions:
- Refresh (shows action message).
- Resolve (for Issue status).
- Unlock (for Locked status).

## Orders
- Placeholder list only (no actions beyond global search).

## Notifications
- Header actions:
- Refresh (resets mock list).
- Save selected.
- Mark selected read.
- Delete selected.
- Row interactions:
- Checkbox select.
- Click row to open details modal (marks as read).
- Modal actions:
- Delete notification.
- Close.
- Sticky selection action bar (appears when selections exist): Save, Mark read, Delete, Clear selection.

## Team (Admin + Super Admin)
- Search input.
- Add team button (opens invite modal).
- Tabs: All team, Admin, Non Admin.
- Row actions:
- Approve (Super Admin only; pending users).
- Remove (Super Admin only; cannot remove superadmin).
- Row click opens profile modal.
- Profile modal actions:
- Remove (Super Admin only).
- Edit (Super Admin can edit all; Admin can edit staff only).
- Approve (Super Admin for pending).
- Invite/Edit modal actions:
- Save.
- Cancel.
- Permission toggles (Make Admin, Can transfer, Can view only).

## Settings
- Placeholder list only (no actions beyond global search).

## Support
- Placeholder list only (no actions beyond global search).

---

# Checklist — Remaining Work

## Frontend
- [ ] Wire Clients detail toolbar actions: Copy, Share, Edit.
- [ ] Add real per-row actions in client orders (kebab menu).
- [ ] Replace placeholder pages (Orders, Settings, Support) with final UI and actions.
- [ ] Add keyboard navigation for custom dropdowns (Status/Priority/Type).
- [ ] Add empty states and error handling for Clients, Team, Notifications.
- [ ] Add success/error toasts for copy/share/suspend/delete actions.

## Backend / Integration
- [ ] Auth API integration (login/register/forgot/reset/password/OTP).
- [ ] Role-based access enforcement on server.
- [ ] Clients endpoints: list, detail, update, suspend, delete.
- [ ] Orders endpoints (client-specific + global).
- [ ] Notifications endpoints: list, mark read, save, delete, bulk actions.
- [ ] Team endpoints: invite, approve, edit, remove, permissions.
- [ ] Users endpoints: list, status changes, unlock/resolve.
- [ ] Shipments endpoints: list, filters, bulk actions, export.
- [ ] Audit logging for destructive actions (delete/suspend).
- [ ] Pagination and server-side search for large lists.
