# Refactor Plan: Align Frontend with Backend API Manual (v2)

## Context

The backend has been rewritten. The frontend (~35% implemented against the full API surface) has mismatched endpoint paths, wrong data shapes, a simplified 3-status model vs the backend's 22-status V2 pipeline, and is missing entire modules (payments, bulk orders, warehouse verification, settings, reports, uploads, internal notifications, admin user management). This plan aligns all existing code and builds every missing module.

**Support tickets module is left completely untouched.**
**Inventory page has been deleted (was dead code with no backend).**

---

## Phase 0 — Foundation: V2 Status System + Utilities

- [x] Create `src/types/status.types.ts` with `StatusV2` union (22 values), `StatusCategory`, `StatusConfig`
- [x] Create `src/lib/statusUtils.ts` with `getStatusCategory()`, `getStatusStyle()`, `STATUS_FILTER_OPTIONS`
- [x] Export status types from `src/types/index.ts`

---

## Phase 1 — Auth Alignment

- [x] **1a.** Fix login path in `src/services/authService.ts`: change `'/auth/login'` to `'/internal/auth/login'`
- [x] **1b.** Fix `AuthResponse` in `src/types/user.types.ts`: change to `{ token: string; user: User }`, remove `AuthTokens` interface
- [x] **1b.** Fix `src/store/auth/AuthContext.tsx`: change `response.tokens.accessToken` to `response.token`, remove refresh token storage (lines 65-69)
- [x] **1c.** Add `updateMyProfile(token, data)` to `src/services/authService.ts` — calls `PATCH /users/me`
- [x] **1d.** Wire `CompleteProfilePage` to use `updateMyProfile()` instead of raw `fetch()` (line 327)
- [x] **1e.** Add `changeMyPassword(token, payload)` to authService — calls `PATCH /internal/me/password`
- [x] **1e.** Add `adminResetPassword(token, userId, payload)` to authService — calls `PATCH /internal/users/:id/password`
- [x] **1e.** Add `createInternalUser(token, payload)` to authService — calls `POST /internal/users`
- [x] **1f.** Create `src/hooks/useChangePassword.ts` — mutation wrapping `changeMyPassword`
- [x] **1f.** Create `src/hooks/useCreateInternalUser.ts` — mutation wrapping `createInternalUser`
- [x] **1g.** Update barrel exports: remove `AuthTokens` from `types/index.ts`, add new functions to `services/index.ts`, add new hooks to `hooks/index.ts`

---

## Phase 2 — Orders & Shipments Alignment

- [x] **2a.** Fix `CreateOrderPayload` in `src/types/order.types.ts`: remove `origin`/`destination`, add `shipmentType`, `priority`, `departureDate?`, `eta?`
- [x] **2a.** Add `statusV2: string`, `statusLabel: string` to `OrderListItem` and `ApiOrder`; add `isPreorder: boolean` to `ApiOrder`
- [x] **2b.** Fix `src/types/shipment.types.ts`: change `ShipmentFilterTab.value` to `StatusCategory | 'all'`, change `ShipmentStatusSummary.status` to `StatusCategory`
- [x] **2b.** Add `statusV2: string`, `statusLabel: string` to `ShipmentRecord`; change `ShipmentRecord.status` to `StatusCategory`
- [x] **2b.** Replace `ApiShipmentStatus` with `statusV2`/`statusLabel` on `ApiShipmentRecord`
- [x] **2c.** Fix `createOrder()` payload fields in `src/services/ordersService.ts`
- [x] **2c.** Add `statusV2`/`statusLabel` extraction to `mapOrderRow()`
- [x] **2c.** Add `statusV2` query param support to `getOrders()`
- [x] **2c.** Add `getOrderById(token, id)` — `GET /orders/:id`
- [x] **2c.** Add `getOrderImages(token, id)` — `GET /orders/:id/images`
- [x] **2c.** Add `updateOrderStatus(token, id, statusV2)` — `PATCH /orders/:id/status`
- [x] **2c.** Add `deleteOrder(token, id)` — `DELETE /orders/:id`
- [x] **2d.** Fix `src/services/shipmentsService.ts`: replace 3-value `mapStatus()` with `getStatusCategory()`, set `statusV2`/`statusLabel` from API
- [x] **2d.** Group shipments by 4 `StatusCategory` values instead of 3
- [x] **2d.** Add `statusV2` and `senderId` query params to shipments API call
- [x] **2e.** Fix `TrackingResult.status` in `src/services/trackingService.ts`: change to `string`
- [x] **2f.** Fix `NewShipmentPage`: build payload with `shipmentType`, `priority`, `departureDate`, `eta`; remove `origin`/`destination`
- [x] **2g.** Fix `ShipmentsTable.tsx` — use `getStatusStyle(statusV2)` + `statusLabel`
- [x] **2g.** Fix `ShipmentsFilters.tsx` — use `STATUS_FILTER_OPTIONS` (4 categories)
- [x] **2g.** Fix `ShipmentsPage.tsx` — update summary grouping to 4 categories, CSV export, status labels
- [x] **2g.** Fix `DashboardShipmentList.tsx` — update TABS and STATUS_STYLES
- [x] **2g.** Fix `DeliverySchedulePage.tsx` — use `getStatusStyle()` + `statusLabel`
- [x] **2g.** Fix `TrackPage.tsx` — use `getStatusStyle()` for badge, `statusLabel` for text
- [x] **2g.** Fix `OrdersPage.tsx` — use `statusLabel` from data
- [x] **2g.** Fix `TrackShipmentPage.tsx` — update mock data status types
- [x] **2h.** Create `src/hooks/useOrderDetail.ts` — query for single order by ID
- [x] **2h.** Create `src/hooks/useUpdateOrderStatus.ts` — mutation for status update

---

## Phase 3 — Dashboard Data Shape Alignment

Dashboard API types (`ApiDashboardStats`, `ApiTrend`, `ApiActiveDelivery`) already match the backend. Work is in the service mapping layer.

- [x] **3a.** Verify/fix `mapKpis()` in `src/services/dashboardService.ts` — uses `totalOrders`, `totalOrdersChange`, `activeShipments`, `activeShipmentsChange`, `pendingOrders`, `deliveredTotal`, `deliveredTotalChange`, `revenueMtd`/`totalSpent` by role
- [x] **3a.** Verify/fix `mapTrends()` — uses `month` (1-12), `deliveredWeight` (string), `activeWeight` (string), two series
- [x] **3a.** Verify/fix `mapActiveDeliveries()` — uses `destination`, `shipmentType`, `activeCount`, `nextEta`, `status`
- [x] **3b.** Verify `ShipmentTrendsChart.tsx` handles two data series (`deliveredWeight` + `activeWeight`)
- [x] **3b.** Verify `ActiveDeliveries.tsx` handles `shipmentType`, `nextEta`, `status` fields

---

## Phase 4 — Notification Type & Service Alignment

- [x] **4a.** Fix `NotificationType` in `src/types/notification.types.ts`: change to `string`
- [x] **4a.** Add `subtitle?: string`, `body?: string`, `isBroadcast?: boolean` to `ApiNotification`
- [x] **4b.** Add `deleteNotification(id, token)` to `src/services/notificationsService.ts` — `DELETE /notifications/:id`
- [x] **4b.** Add `deleteNotificationsBulk(ids, token)` — `DELETE /notifications/` with body `{ ids }`
- [x] **4b.** Add `sendBroadcast(token, payload)` — `POST /notifications/broadcast`
- [x] **4c.** Fix `NotificationsPage.tsx`: use `n.body ?? n.message` for content, use `n.subtitle` for subtitle
- [x] **4c.** Wire delete buttons to actual service calls (currently client-side only)
- [x] **4d.** Add `deleteNotification` and `bulkDelete` mutations to `src/hooks/useNotifications.ts`

---

## Phase 5 — Clients Service Alignment

- [x] **5a.** Fix `ApiClient` in `src/types/client.types.ts`: replace `name` with `firstName`/`lastName`, `totalShipments` with `totalOrders`, `totalSpent` with `totalPayments` (string), `lastActivity` with `lastOrderAt`, remove `address`/`country`
- [x] **5a.** Add `CreateClientPayload { email; firstName?; lastName?; businessName?; phone? }`
- [x] **5b.** Fix `src/services/clientsService.ts`: change query params to `{ page?, limit?, isActive? }` (remove `aggregate`)
- [x] **5b.** Add `getClientById(token, id)` — `GET /admin/clients/:id`
- [x] **5b.** Add `getClientOrders(token, id, params?)` — `GET /admin/clients/:id/orders`
- [x] **5b.** Add `createClient(token, payload)` — `POST /admin/clients`
- [x] **5b.** Add `sendClientInvite(token, id)` — `POST /admin/clients/:id/send-invite`
- [x] **5c.** Update `src/hooks/useClients.ts` — fix query params and mapping
- [x] **5c.** Create `src/hooks/useCreateClient.ts` — mutation hook
- [x] **5c.** Fix `ClientsPage.tsx` — update field references (`name` -> `firstName + lastName`, etc.), wire create/invite actions

---

## Phase 6 — Team Service Alignment

- [x] **6a.** Fix `ApiTeamMember` in `src/types/team.types.ts`: replace `name` with `firstName`/`lastName`/`displayName`, remove `avatar`
- [x] **6a.** Update `ApiTeamResponse` to paginated shape `{ data: [...], pagination: {...} }`
- [x] **6a.** Fix `TeamMember`: map `displayName` -> `fullName`, map `isActive` -> `approvalStatus`
- [x] **6b.** Fix `src/services/teamService.ts`: add query params (`role?`, `isActive?`, `page?`, `limit?`), update return type
- [x] **6c.** Add `approveTeamMember(token, id)` to teamService — `PATCH /team/:id/approve`
- [x] **6d.** Fix `TeamPage.tsx`: wire Approve button, wire Remove button to `PATCH /users/:id`, map permission toggles to role changes, wire Add Team modal to `POST /internal/users`
- [x] **6e.** Fix `src/hooks/useTeam.ts`: update for paginated response, add `approveMember` mutation, add filter params

---

## Phase 7 — NEW: Warehouse Verification

- [x] **7a.** Create `src/types/warehouse.types.ts` — `WarehousePackage`, `WarehouseVerifyPayload`
- [x] **7b.** Create `src/services/warehouseService.ts` — `verifyOrder(token, orderId, payload)` -> `POST /orders/:id/warehouse-verify`
- [x] **7c.** Create `src/hooks/useWarehouseVerify.ts` — mutation with cache invalidation
- [x] **7d.** Add barrel exports to `types/index.ts`, `services/index.ts`, `hooks/index.ts`

---

## Phase 8 — NEW: Payments (Paystack)

- [x] **8a.** Create `src/types/payment.types.ts` — `InitializePaymentPayload`, `PaystackInitResponse`, `ApiPayment`, `RecordOfflinePayload`
- [x] **8b.** Create `src/services/paymentsService.ts` — `initializePayment`, `verifyPayment`, `getPayments`, `getPaymentById`, `recordOfflinePayment`
- [x] **8c.** Create `src/hooks/usePayments.ts` — paginated list query
- [x] **8c.** Create `src/hooks/useInitializePayment.ts` — mutation
- [x] **8c.** Create `src/hooks/useRecordOfflinePayment.ts` — mutation
- [x] **8d.** Create `src/pages/payments/PaymentsPage/PaymentsPage.tsx` — admin payment list
- [x] **8d.** Create `src/pages/payments/PaymentCallbackPage/PaymentCallbackPage.tsx` — Paystack redirect handler
- [x] **8d.** Add routes `PAYMENTS` and `PAYMENT_CALLBACK` to `routes.ts` and `App.tsx`

---

## Phase 9 — NEW: Bulk Orders

- [x] **9a.** Create `src/types/bulkOrder.types.ts` — `BulkOrderItem`, `CreateBulkOrderPayload`, `ApiBulkOrder`
- [x] **9b.** Create `src/services/bulkOrdersService.ts` — `createBulkOrder`, `getBulkOrders`, `getBulkOrderById`, `updateBulkOrderStatus`, `addBulkOrderItem`, `removeBulkOrderItem`, `deleteBulkOrder`
- [x] **9c.** Create `src/hooks/useBulkOrders.ts`
- [x] **9c.** Create `src/pages/bulkOrders/BulkOrdersPage/BulkOrdersPage.tsx`
- [x] **9c.** Add route `BULK_ORDERS: '/bulk-orders'` (Staff+ protected)

---

## Phase 10 — NEW: Reports

- [x] **10a.** Create `src/types/report.types.ts` — `ReportSummary`, `OrdersByStatusEntry`, `RevenueEntry`
- [x] **10b.** Create `src/services/reportsService.ts` — `getReportSummary`, `getOrdersByStatus`, `getRevenueReport`
- [x] **10c.** Create `src/hooks/useReports.ts` — 3 query hooks
- [x] **10c.** Create `src/pages/reports/ReportsPage/ReportsPage.tsx` — summary cards + charts
- [x] **10c.** Add route `REPORTS: '/reports'` (Admin+ protected)

---

## Phase 11 — NEW: Settings (Logistics, FX, Pricing, Templates, Restricted Goods)

- [x] **11a.** Create `src/types/settings.types.ts` — `LogisticsSettings`, `FxRateSettings`, `PricingRule`, `CustomerPricingOverride`, `NotificationTemplate`, `RestrictedGood`
- [x] **11b.** Create `src/services/settingsService.ts` — logistics GET/PATCH, fx-rate GET/PATCH, pricing GET/PATCH, templates GET/PATCH, restricted-goods GET/PATCH
- [x] **11c.** Create `src/hooks/useLogisticsSettings.ts`
- [x] **11c.** Create `src/hooks/useFxRate.ts`
- [x] **11c.** Create `src/hooks/usePricingRules.ts`
- [x] **11c.** Create `src/hooks/useNotificationTemplates.ts`
- [x] **11c.** Create `src/hooks/useRestrictedGoods.ts`
- [x] **11d.** Expand `SettingsPage.tsx` — add admin-only sections/tabs for each settings area, add change password section for operators

---

## Phase 12 — NEW: Uploads (Presigned R2 Flow)

- [x] **12a.** Create `src/types/upload.types.ts` — `PresignPayload`, `PresignResponse`, `ConfirmPayload`, `OrderImage`
- [x] **12b.** Create `src/services/uploadsService.ts` — `presignUpload`, `confirmUpload`, `getOrderImages`, `deleteImage`
- [x] **12c.** Create `src/hooks/useUpload.ts` — orchestrates presign -> PUT to R2 -> confirm
- [x] **12c.** Create `src/hooks/useOrderImages.ts` — query for order images

---

## Phase 13 — NEW: Internal Notifications (Admin Feed)

- [x] **13a.** Create `src/types/internalNotification.types.ts` — `ApiInternalNotification`
- [x] **13b.** Create `src/services/internalNotificationsService.ts` — `getInternalNotifications`, `getInternalUnreadCount`, `markAllInternalRead`, `markInternalRead`
- [x] **13c.** Create `src/hooks/useInternalNotifications.ts` — query + mutations
- [x] **13c.** Create `src/hooks/useInternalNotificationCount.ts` — polling query (30s)
- [x] **13d.** Wire Topbar: operator users use `useInternalNotificationCount` instead of customer `useNotificationCount`
- [x] **13d.** Optionally add admin notifications tab in existing NotificationsPage

---

## Phase 14 — NEW: Admin User Management

- [x] **14a.** Create `src/types/adminUser.types.ts` — `AdminUserListParams`, `UpdateUserPayload`, `ChangeUserRolePayload`
- [x] **14b.** Create `src/services/adminUsersService.ts` — `getUsers`, `getUserById`, `updateUser`, `changeUserRole`, `deleteUser`
- [x] **14c.** Create `src/hooks/useAdminUsers.ts` — paginated list
- [x] **14c.** Create `src/hooks/useUpdateUser.ts` — mutation
- [x] **14c.** Create `src/hooks/useChangeUserRole.ts` — mutation
- [x] **14d.** Refactor `UsersPage.tsx`: switch from `useClients()` to `useAdminUsers()`, wire Unlock to `updateUser(id, { isActive: true })`, wire Refresh to refetch

---

## Phase 15 — Routing & Barrel Export Cleanup

- [x] **15a.** Add `PAYMENTS`, `PAYMENT_CALLBACK`, `BULK_ORDERS`, `REPORTS` to `src/constants/routes.ts`
- [x] **15a.** Remove dead route `SHIPMENT_INVOICE` from `routes.ts`
- [x] **15b.** Add route entries in `src/App.tsx`: `/payments`, `/payments/callback`, `/bulk-orders`, `/reports` with correct role guards
- [x] **15c.** Update sidebar nav in `AppLayout.tsx`: add Payments to CUSTOMER_NAV and OPERATOR_NAV, add Bulk Orders to OPERATOR_NAV, add Reports to ADMIN_EXTRA_NAV
- [x] **15d.** Final barrel export sweep: ensure all new types, services, hooks are exported from their index files

---

## Implementation Order

- Phases **0 -> 1 -> 2 -> 3** must be sequential (each depends on the prior)
- Phase **4** (notifications) can run after Phase 0
- Phases **5, 6** (clients, team) can run after Phase 0
- Phases **7-14** (new modules) can run in any order after Phase 2
- Phase **15** (routing) runs last

## Verification

After each phase:

- [ ] Run `npx tsc --noEmit` to verify type safety
- [ ] Run `npx vite build` to verify no build errors
- [ ] Manually test affected pages against the live backend
