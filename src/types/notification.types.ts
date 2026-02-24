export type NotificationType = 'info' | 'warning' | 'alert' | 'success';

export interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ApiNotificationsResponse {
  success: boolean;
  message: string;
  data: {
    data: ApiNotification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface ApiUnreadCountResponse {
  success: boolean;
  message: string;
  data: { count: number };
}
