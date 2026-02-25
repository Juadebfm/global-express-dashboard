# Frontend-BE Compatibility Checklist

Use this as the implementation tracker. Mark an item only when the frontend flow is wired and validated against the listed backend endpoint(s).

## User View (Customer)

- [x] Sync Clerk account into backend user record  
  Endpoint: `POST /api/v1/auth/sync`
- [x] Get own profile  
  Endpoint: `GET /api/v1/users/me`
- [x] Check profile completeness before ordering  
  Endpoint: `GET /api/v1/users/me/completeness`
- [x] Update own profile, contact, and address  
  Endpoint: `PATCH /api/v1/users/me`
- [x] Get notification preferences  
  Endpoint: `GET /api/v1/users/me/notification-preferences`
- [x] Update notification preferences  
  Endpoint: `PATCH /api/v1/users/me/notification-preferences`
- [x] Export own account data  
  Endpoint: `GET /api/v1/users/me/export`
- [x] Delete own account (soft delete)  
  Endpoint: `DELETE /api/v1/users/me`
- [x] Public tracking by tracking number  
  Endpoint: `GET /api/v1/orders/track/:trackingNumber`
- [x] Create shipment order  
  Endpoint: `POST /api/v1/orders`
- [x] See own unified shipments (solo + bulk items)  
  Endpoint: `GET /api/v1/orders/my-shipments`
- [x] List own orders  
  Endpoint: `GET /api/v1/orders`
- [ ] View order detail  
  Endpoint: `GET /api/v1/orders/:id`
- [ ] View order images (order route)  
  Endpoint: `GET /api/v1/orders/:id/images`
- [ ] View order images (uploads route)  
  Endpoint: `GET /api/v1/uploads/orders/:orderId/images`
- [ ] Initialize payment  
  Endpoint: `POST /api/v1/payments/initialize`
- [ ] Verify payment  
  Endpoint: `POST /api/v1/payments/verify/:reference`
- [x] Notification inbox list  
  Endpoint: `GET /api/v1/notifications`
- [x] Notification unread count  
  Endpoint: `GET /api/v1/notifications/unread-count`
- [x] Mark notification read  
  Endpoint: `PATCH /api/v1/notifications/:id/read`
- [x] Save/unsave notification  
  Endpoint: `PATCH /api/v1/notifications/:id/save`
- [x] Dashboard cards/charts/schedule (aggregated endpoint)  
  Endpoint: `GET /api/v1/dashboard`
- [ ] Dashboard stats endpoint (if required by FE flow)  
  Endpoint: `GET /api/v1/dashboard/stats`
- [ ] Dashboard trends endpoint (if required by FE flow)  
  Endpoint: `GET /api/v1/dashboard/trends`
- [ ] Dashboard active deliveries endpoint (if required by FE flow)  
  Endpoint: `GET /api/v1/dashboard/active-deliveries`
- [x] Real-time push channel  
  Endpoint: `GET /ws?token=<jwt>`

## Internal View (Staff/Admin/Superadmin)

- [x] Operator login  
  Endpoint: `POST /api/v1/auth/login`
- [x] Operator session restore  
  Endpoint: `GET /api/v1/auth/me`
- [x] Operator logout  
  Endpoint: `POST /api/v1/auth/logout`
- [x] Forgot password send OTP  
  Endpoint: `POST /api/v1/auth/forgot-password/send-otp`
- [x] Forgot password verify OTP  
  Endpoint: `POST /api/v1/auth/forgot-password/verify-otp`
- [x] Forgot password reset  
  Endpoint: `POST /api/v1/auth/forgot-password/reset`
- [ ] Internal auth login (internal namespace)  
  Endpoint: `POST /api/v1/internal/auth/login`
- [ ] Change own internal password  
  Endpoint: `PATCH /api/v1/internal/me/password`
- [ ] Create internal users  
  Endpoint: `POST /api/v1/internal/users`
- [ ] Reset internal user password  
  Endpoint: `PATCH /api/v1/internal/users/:id/password`
- [ ] List platform users  
  Endpoint: `GET /api/v1/users`
- [ ] Get user by ID  
  Endpoint: `GET /api/v1/users/:id`
- [ ] Update user  
  Endpoint: `PATCH /api/v1/users/:id`
- [ ] Update user role  
  Endpoint: `PATCH /api/v1/users/:id/role`
- [ ] Delete user  
  Endpoint: `DELETE /api/v1/users/:id`
- [x] Team directory  
  Endpoint: `GET /api/v1/team`
- [x] Client list  
  Endpoint: `GET /api/v1/admin/clients`
- [ ] Client detail  
  Endpoint: `GET /api/v1/admin/clients/:id`
- [ ] Client orders  
  Endpoint: `GET /api/v1/admin/clients/:id/orders`
- [ ] Create order on behalf of customer (`senderId`)  
  Endpoint: `POST /api/v1/orders`
- [ ] Update shipment status  
  Endpoint: `PATCH /api/v1/orders/:id/status`
- [ ] Delete order  
  Endpoint: `DELETE /api/v1/orders/:id`
- [x] List and filter all shipments  
  Endpoint: `GET /api/v1/shipments`
- [ ] Create bulk shipment  
  Endpoint: `POST /api/v1/bulk-orders`
- [ ] List bulk shipments  
  Endpoint: `GET /api/v1/bulk-orders`
- [ ] Get bulk shipment by ID  
  Endpoint: `GET /api/v1/bulk-orders/:id`
- [ ] Update bulk shipment status  
  Endpoint: `PATCH /api/v1/bulk-orders/:id/status`
- [ ] Add bulk shipment item  
  Endpoint: `POST /api/v1/bulk-orders/:id/items`
- [ ] Delete bulk shipment item  
  Endpoint: `DELETE /api/v1/bulk-orders/:id/items/:itemId`
- [ ] Delete bulk shipment  
  Endpoint: `DELETE /api/v1/bulk-orders/:id`
- [ ] Upload package image (presign)  
  Endpoint: `POST /api/v1/uploads/presign`
- [ ] Upload package image (confirm)  
  Endpoint: `POST /api/v1/uploads/confirm`
- [ ] Delete uploaded image  
  Endpoint: `DELETE /api/v1/uploads/images/:imageId`
- [ ] Payments list  
  Endpoint: `GET /api/v1/payments`
- [ ] Payment detail  
  Endpoint: `GET /api/v1/payments/:id`
- [ ] Reports summary  
  Endpoint: `GET /api/v1/reports/summary`
- [ ] Reports by order status  
  Endpoint: `GET /api/v1/reports/orders/by-status`
- [ ] Reports revenue  
  Endpoint: `GET /api/v1/reports/revenue`
- [ ] Internal notifications list  
  Endpoint: `GET /api/v1/internal/notifications`
- [ ] Internal notifications unread count  
  Endpoint: `GET /api/v1/internal/notifications/unread-count`
- [ ] Internal notifications read all  
  Endpoint: `PATCH /api/v1/internal/notifications/read-all`
- [ ] Internal notification read  
  Endpoint: `PATCH /api/v1/internal/notifications/:id/read`
- [ ] Broadcast system notifications  
  Endpoint: `POST /api/v1/notifications/broadcast`
- [x] Real-time push channel  
  Endpoint: `GET /ws?token=<jwt>`

## Cross-Cutting Fixes

- [ ] Add role-aware notification service routing (`/notifications/*` for customers, `/internal/notifications/*` for internal users)
- [ ] Replace local-only shipment status updates with backend mutation (`PATCH /api/v1/orders/:id/status`)
- [ ] Replace local-only team management actions with backend mutations (create/update/remove)
- [ ] Replace local-only users management actions with backend mutations
- [ ] Replace placeholder order/settings flows with real API-backed flows
- [ ] Add API-backed create shipment flow in `NewShipmentPage` (`POST /api/v1/orders`)
- [ ] Add API-backed payment initialization/verification flow

## Verification Notes

- [ ] Confirm all requests include correct auth token type (Clerk JWT vs internal bearer token) per route.
- [ ] Confirm role guards in frontend match backend authorization for each endpoint.
- [ ] Confirm error handling shows backend `message` consistently to users.
