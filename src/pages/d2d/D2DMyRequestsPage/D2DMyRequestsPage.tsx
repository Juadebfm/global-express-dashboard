import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants';

/** New D2D intake creates normal orders; preserve old imports/bookmarks safely. */
export function D2DMyRequestsPage(): ReactElement {
  return <Navigate to={ROUTES.ORDERS} replace />;
}
