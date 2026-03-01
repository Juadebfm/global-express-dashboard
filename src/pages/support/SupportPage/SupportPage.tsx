import type { ReactElement } from 'react';
import { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { AlertBanner, Button } from '@/components/ui';
import {
  useAuth,
  useDashboardData,
  useSearch,
  useSupportTickets,
  useSupportTicketDetail,
  useSendSupportMessage,
  useUpdateTicketStatus,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { ROUTES } from '@/constants';
import type { SupportTicketStatus } from '@/types';
import {
  SupportTicketList,
  SupportTicketFilters,
  SupportTicketHeader,
  SupportChatThread,
  SupportChatInput,
  SupportStatusActions,
  CreateTicketModal,
} from '../components';

// ── List View ────────────────────────────────────────────────────

function SupportListView(): ReactElement {
  const { t } = useTranslation('support');
  const { user } = useAuth();
  const { query } = useSearch();
  const isStaff = !!user && user.role !== 'user';

  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const params = useMemo(
    () => (statusFilter !== 'all' ? { status: statusFilter } : undefined),
    [statusFilter],
  );

  const { tickets, isLoading, error, isCreating, createTicket } = useSupportTickets(params);

  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      [t.ticketNumber, t.subject, t.description, t.category, t.priority, t.status, t.relatedTrackingNumber ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [tickets, query]);

  const handleCreate = useCallback(
    async (payload: Parameters<typeof createTicket>[0]) => {
      const ticket = await createTicket(payload);
      return ticket;
    },
    [createTicket],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={t('listView.pageTitle')}
          subtitle={isStaff ? t('listView.subtitleStaff') : t('listView.subtitleCustomer')}
        />
        <Button
          type="button"
          size="sm"
          className="text-sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setModalOpen(true)}
        >
          {t('listView.newTicketButton')}
        </Button>
      </div>

      {isStaff && (
        <SupportTicketFilters activeFilter={statusFilter} onFilterChange={setStatusFilter} />
      )}

      {error && <AlertBanner tone="error" message={error} />}

      <SupportTicketList tickets={filteredTickets} isStaff={isStaff} isLoading={isLoading} />

      <CreateTicketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}

// ── Detail / Chat View ───────────────────────────────────────────

function SupportDetailView({ ticketId }: { ticketId: string }): ReactElement {
  const { t } = useTranslation('support');
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = !!user && user.role !== 'user';
  const currentUserId = user?.id ?? '';

  const { ticket, messages, isLoading, error } = useSupportTicketDetail(ticketId);
  const sendMessage = useSendSupportMessage({ ticketId });
  const updateStatus = useUpdateTicketStatus({ ticketId });

  const handleSend = useCallback(
    (body: string, isInternal: boolean) => {
      sendMessage.mutate({ body, isInternal });
    },
    [sendMessage],
  );

  const handleStatusChange = useCallback(
    (status: SupportTicketStatus) => {
      updateStatus.mutate(status);
    },
    [updateStatus],
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-gray-500">
        {t('detailView.loadingText')}
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4 p-4">
        <AlertBanner tone="error" message={error ?? t('detailView.ticketNotFound')} />
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate(ROUTES.SUPPORT)}>
          {t('detailView.backToTickets')}
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <SupportTicketHeader ticket={ticket} isStaff={isStaff} />

      <SupportChatThread
        messages={messages}
        currentUserId={currentUserId}
        isStaff={isStaff}
      />

      {isStaff && (
        <SupportStatusActions
          currentStatus={ticket.status}
          onStatusChange={handleStatusChange}
          isPending={updateStatus.isPending}
        />
      )}

      <SupportChatInput
        onSend={handleSend}
        isSending={sendMessage.isPending}
        isStaff={isStaff}
        isClosed={isClosed}
      />
    </div>
  );
}

// ── Page Shell ───────────────────────────────────────────────────

export function SupportPage(): ReactElement {
  const { t } = useTranslation('support');
  const { ticketId } = useParams<{ ticketId?: string }>();
  const { data, isLoading, error } = useDashboardData();

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
      {ticketId ? <SupportDetailView ticketId={ticketId} /> : <SupportListView />}
    </AppShell>
  );
}
