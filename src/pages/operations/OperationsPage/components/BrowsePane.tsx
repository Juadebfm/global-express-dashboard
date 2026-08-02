import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plane, Ship, Truck } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthToken, useBankAccounts, useCapability, useFxRate, useGalleryClaims, useSendPaymentRequest } from '@/hooks';
import { getUserById } from '@/services';
import { useFeedbackStore } from '@/store';
import { cn } from '@/utils';
import { ROUTES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { formatTrackingDisplay } from '@/lib/trackingUtils';
import type { BankInfo, OrderListItem } from '@/types';
import { STATUS_LABELS } from '@/pages/shared';
import { getAwaitingPaymentOrders, getQueueKindForOrder, getQueueOrders, needsAction } from '../utils/orderQueueFilters';
import type { QueueKind } from './QueueShell';

function waitLabel(createdAt: string | null): string {
  if (!createdAt) return '';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusBadgeClass(statusV2: string): string {
  const s = statusV2.toUpperCase();
  if (s.startsWith('DELIVERED') || s === 'PICKED_UP_COMPLETED') return 'bg-emerald-100 text-emerald-700';
  if (s.startsWith('IN_TRANSIT') || s.startsWith('OUT_FOR_DELIVERY')) return 'bg-blue-100 text-blue-700';
  if (s.startsWith('CUSTOMS') || s.startsWith('READY_FOR_PICKUP')) return 'bg-purple-100 text-purple-700';
  if (s.startsWith('LOADED') || s.startsWith('VESSEL') || s.startsWith('AT_ORIGIN_PORT')) return 'bg-cyan-100 text-cyan-700';
  if (s.startsWith('BOARDED') || s.startsWith('FLIGHT') || s.startsWith('AT_ORIGIN_AIRPORT')) return 'bg-sky-100 text-sky-700';
  return 'bg-gray-100 text-gray-600';
}

function paymentBadge(status: string): { label: string; cls: string } {
  const s = status.toUpperCase();
  if (s === 'PAID_IN_FULL') return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'PAYMENT_IN_PROGRESS') return { label: 'In progress', cls: 'bg-blue-100 text-blue-700' };
  if (s === 'UNPAID') return { label: 'Unpaid', cls: 'bg-amber-100 text-amber-700' };
  return { label: status.replace(/_/g, ' '), cls: 'bg-gray-100 text-gray-600' };
}

function ActionChip({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}): ReactElement {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={count === 0}
      className="shrink-0"
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-xs font-semibold',
          count > 0 ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400',
        )}
      >
        {count}
      </span>
    </Button>
  );
}

function PriorityRow({
  order,
  actionLabel,
  onAction,
}: {
  order: OrderListItem;
  actionLabel: string;
  onAction: () => void;
}): ReactElement {
  const isSea = order.transportMode === 'sea';
  const isD2D = (order.raw as Record<string, unknown>).shipmentType === 'd2d';
  const isOnHold = order.statusV2 === 'ON_HOLD';
  const wait = waitLabel(order.createdAt);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100')}>
        {isD2D ? <Truck className="h-4 w-4 text-purple-600" /> : isSea ? <Ship className="h-4 w-4 text-blue-600" /> : <Plane className="h-4 w-4 text-brand-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {order.senderName || formatTrackingDisplay(order.trackingNumber)}
          </p>
          {isOnHold && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">On hold</span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">
          {order.statusLabel || STATUS_LABELS[order.statusV2] || order.statusV2.replace(/_/g, ' ')}
          {wait ? ` · ${wait} ago` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      >
        {actionLabel} →
      </button>
    </div>
  );
}

function buildPaymentWhatsAppMessage(params: {
  recipientName: string;
  trackingNumber: string;
  amountUsd: number;
  amountNgn: number;
  beneficiaryName: string;
  banks: BankInfo[];
}): string {
  const bankLines = params.banks
    .flatMap((b) => [b.bankName, ...b.accounts.map((a) => `  ${a.currency}: ${a.accountNumber}`)])
    .join('\n');
  return `Hi ${params.recipientName}! Your shipment ${params.trackingNumber} is ready for payment.\n\nAmount: $${params.amountUsd.toFixed(2)} USD / ₦${params.amountNgn.toLocaleString('en-NG', { maximumFractionDigits: 0 })} NGN\n\nPay to: ${params.beneficiaryName}\n${bankLines}\n\nUse your tracking number as reference. You can pay now or when your goods arrive at our Lagos office.`;
}

// GET /users/:id returns phone/whatsappNumber for any user, but the shared
// `User` type (built around staff role-management) doesn't declare them —
// cast narrowly at the point of use rather than widen that shared type.
interface UserContact {
  phone?: string | null;
  whatsappNumber?: string | null;
}

function useCustomerContact(senderId: string | null): ReturnType<typeof useQuery<UserContact>> {
  const getToken = useAuthToken();
  return useQuery<UserContact>({
    queryKey: ['user-contact', senderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const user = await getUserById(token, senderId!);
      return user as unknown as UserContact;
    },
    enabled: !!senderId,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

function WhatsAppButton({
  order,
  amountUsd,
  bankAccounts,
  fxRate,
}: {
  order: OrderListItem;
  amountUsd: number | null;
  bankAccounts: { beneficiaryName: string; banks: BankInfo[] } | undefined;
  fxRate: number | null;
}): ReactElement {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const [isBusy, setIsBusy] = useState(false);

  const senderIdRaw = (order.raw as Record<string, unknown>).senderId;
  const senderId = typeof senderIdRaw === 'string' && senderIdRaw ? senderIdRaw : null;
  const contactQuery = useCustomerContact(senderId);

  const whatsapp = contactQuery.data?.whatsappNumber || null;
  const smsOnly = !whatsapp ? contactQuery.data?.phone || null : null;
  const mode: 'whatsapp' | 'copy' | 'unavailable' = whatsapp ? 'whatsapp' : smsOnly ? 'copy' : 'unavailable';

  const buildMessage = (): string | null => {
    if (amountUsd == null || !bankAccounts || !fxRate) return null;
    return buildPaymentWhatsAppMessage({
      recipientName: order.senderName || 'Customer',
      trackingNumber: order.trackingNumber,
      amountUsd,
      amountNgn: amountUsd * fxRate,
      beneficiaryName: bankAccounts.beneficiaryName,
      banks: bankAccounts.banks,
    });
  };

  const handleClick = async (): Promise<void> => {
    if (!senderId) {
      pushMessage({ tone: 'error', message: 'No customer on file for this order.' });
      return;
    }
    const message = buildMessage();
    if (!message) {
      pushMessage({ tone: 'error', message: 'Payment details are not ready yet.' });
      return;
    }
    if (mode === 'unavailable') {
      pushMessage({ tone: 'error', message: 'This customer has no phone number on file.' });
      return;
    }
    setIsBusy(true);
    try {
      if (mode === 'whatsapp' && whatsapp) {
        const digits = whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      } else if (smsOnly) {
        await navigator.clipboard.writeText(message);
        pushMessage({
          tone: 'success',
          message: `No WhatsApp on file — copied. Paste into a text message to ${smsOnly}.`,
        });
      }
    } catch (err) {
      pushMessage({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not complete that action.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isBusy || contactQuery.isLoading}
      onClick={() => void handleClick()}
      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
    >
      {mode === 'copy' ? 'Copy' : 'WhatsApp'}
    </button>
  );
}

function getActionLabel(o: OrderListItem): string {
  if (o.statusV2 === 'PREORDER_SUBMITTED') return 'Register';
  if (o.statusV2 === 'ON_HOLD') return 'Resolve';
  if (o.statusV2 === 'WAREHOUSE_RECEIVED' || o.statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') return 'Verify';
  if (o.statusV2 === 'WAREHOUSE_VERIFIED_PRICED') {
    const unpaid = o.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL';
    return unpaid ? 'Collect' : 'Assign batch';
  }
  return 'Action';
}

export interface BrowsePaneProps {
  allOrders: OrderListItem[];
  canResolveEscalations: boolean;
  userName: string;
  /** Guided-queue selection — starts the queue AT this specific order. */
  onStartQueue: (orderId: string, kind: QueueKind) => void;
}

/**
 * Browse/act surface for staff order work: action chips (jump into a guided
 * queue), the prioritised "what needs doing" list, a read-only recap of
 * recently-sorted orders, and outstanding-payment nudges. Batch/dispatch
 * browsing intentionally lives on /batches instead of duplicating it here —
 * see project memory for why the tab+table browse view was retired.
 */
export function BrowsePane({
  allOrders,
  canResolveEscalations,
  userName,
  onStartQueue,
}: BrowsePaneProps): ReactElement {
  const navigate = useNavigate();
  const canManageCatalogue = useCapability('catalogue.manage');
  // Pending claims have no order yet (one only gets created on approval), so
  // they can't join the order-based queue counts below — surfaced as its own
  // chip instead, deep-linking to Support since that's where they're reviewed.
  const pendingClaimsCount = useGalleryClaims({ status: 'pending' }, canManageCatalogue).data?.total ?? 0;

  const counts = useMemo<Record<QueueKind, number>>(
    () => ({
      preorder: getQueueOrders(allOrders, 'preorder').length,
      arrival: getQueueOrders(allOrders, 'arrival').length,
      verify: getQueueOrders(allOrders, 'verify').length,
      holds: getQueueOrders(allOrders, 'holds').length,
      batch: getQueueOrders(allOrders, 'batch').length,
      payment: getQueueOrders(allOrders, 'payment').length,
      escalated: getQueueOrders(allOrders, 'escalated').length,
    }),
    [allOrders],
  );

  const handleStartQueue = (kind: QueueKind): void => {
    const orders = getQueueOrders(allOrders, kind);
    if (orders.length === 0) return;
    onStartQueue(orders[0].id, kind);
  };

  // Priority list: holds first, then by oldest (createdAt ascending)
  const priorityOrders = useMemo(() => {
    const actionable = allOrders.filter(needsAction);
    return [...actionable].sort((a, b) => {
      const aHold = a.statusV2 === 'ON_HOLD' ? 0 : 1;
      const bHold = b.statusV2 === 'ON_HOLD' ? 0 : 1;
      if (aHold !== bHold) return aHold - bHold;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }, [allOrders]);

  const sendPaymentRequest = useSendPaymentRequest();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const handleResend = (orderId: string): void => {
    setResendingId(orderId);
    sendPaymentRequest.mutate(orderId, { onSettled: () => setResendingId(null) });
  };

  const bankAccounts = useBankAccounts();
  const fxRate = useFxRate();

  const awaitingOrders = useMemo(() => getAwaitingPaymentOrders(allOrders), [allOrders]);

  const recentlySorted = useMemo(() => {
    // Status-agnostic — every order shows here regardless of where it is in
    // the pipeline; the Status/Payment/Batch columns carry that context per
    // row instead of hiding whole categories from this list.
    return [...allOrders]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [allOrders]);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greetingWord()}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">{today}</p>
      </div>

      {/* Action chips — spread across the full width, spread out instead of
          stacked cards so they read at a glance and don't dominate the page. */}
      <div className="flex flex-wrap items-center gap-2">
        <ActionChip label="New orders" count={counts.preorder} onClick={() => handleStartQueue('preorder')} />
        <ActionChip label="Awaiting arrival" count={counts.arrival} onClick={() => handleStartQueue('arrival')} />
        <ActionChip label="To verify" count={counts.verify} onClick={() => handleStartQueue('verify')} />
        <ActionChip label="On hold" count={counts.holds} onClick={() => handleStartQueue('holds')} />
        <ActionChip label="Assign to batch" count={counts.batch} onClick={() => handleStartQueue('batch')} />
        <ActionChip label="Collect payment" count={counts.payment} onClick={() => handleStartQueue('payment')} />
        {canManageCatalogue && (
          <ActionChip label="Claims to review" count={pendingClaimsCount} onClick={() => navigate(ROUTES.SUPPORT)} />
        )}
        {canResolveEscalations && (
          <ActionChip label="Needs your review" count={counts.escalated} onClick={() => handleStartQueue('escalated')} />
        )}
      </div>

      {/* Priority list */}
      {priorityOrders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Up next · prioritised</p>
          </div>
          <div className="divide-y divide-gray-100">
            {priorityOrders.slice(0, 20).map((order) => (
              <PriorityRow
                key={order.id}
                order={order}
                actionLabel={getActionLabel(order)}
                onAction={() => onStartQueue(order.id, getQueueKindForOrder(order))}
              />
            ))}
          </div>
          {priorityOrders.length > 20 && (
            <div className="px-4 py-3 text-center text-xs text-gray-400">
              +{priorityOrders.length - 20} more — use the action buttons above to work through all queues
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm font-medium text-gray-500">All orders are up to date</p>
          <p className="mt-1 text-xs text-gray-400">No pending actions right now</p>
        </div>
      )}

      {/* Recently sorted table */}
      {recentlySorted.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Recently sorted</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-gray-400">Customer</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-gray-400">Destination</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-gray-400">Status</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-gray-400">Payment</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-gray-400">Batch</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold text-gray-400">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentlySorted.map((order) => {
                  const isSea = order.transportMode === 'sea';
                  const isD2D = (order.raw as Record<string, unknown>).shipmentType === 'd2d';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100')}>
                            {isD2D ? <Truck className="h-3.5 w-3.5 text-purple-600" /> : isSea ? <Ship className="h-3.5 w-3.5 text-blue-600" /> : <Plane className="h-3.5 w-3.5 text-brand-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 max-w-40">
                              {order.senderName || formatTrackingDisplay(order.trackingNumber)}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">{formatTrackingDisplay(order.trackingNumber)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-30">
                        <span className="truncate block">{order.destination || '—'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', statusBadgeClass(order.statusV2))}>
                          {order.statusLabel || STATUS_LABELS[order.statusV2] || order.statusV2.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {order.paymentCollectionStatus ? (
                          <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', paymentBadge(order.paymentCollectionStatus).cls)}>
                            {paymentBadge(order.paymentCollectionStatus).label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {(order.raw as Record<string, unknown>).dispatchBatchId ? (
                          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            Batched
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">{waitLabel(order.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Awaiting payment panel */}
      {awaitingOrders.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Awaiting payment · {awaitingOrders.length} order{awaitingOrders.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">No receipt submitted yet</p>
          </div>
          <div className="divide-y divide-gray-50">
            {awaitingOrders.map((order) => {
              const raw = order.raw as Record<string, unknown>;
              const charge = raw.finalChargeUsd != null ? parseFloat(raw.finalChargeUsd as string) : null;
              const sentAt = order.paymentDetailsSentAt;
              const isSea = order.transportMode === 'sea';
              const isD2D = raw.shipmentType === 'd2d';
              const isPending = resendingId === order.id;

              return (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', isD2D ? 'bg-purple-100' : isSea ? 'bg-blue-100' : 'bg-brand-100')}>
                    {isD2D ? <Truck className="h-3.5 w-3.5 text-purple-600" /> : isSea ? <Ship className="h-3.5 w-3.5 text-blue-600" /> : <Plane className="h-3.5 w-3.5 text-brand-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{order.senderName || formatTrackingDisplay(order.trackingNumber)}</p>
                    <p className="text-xs text-gray-400">
                      {charge != null ? `$${charge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due` : 'Charge not set'}
                      {sentAt ? ` · sent ${waitLabel(sentAt)} ago` : ' · details not sent'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <WhatsAppButton
                      order={order}
                      amountUsd={charge}
                      bankAccounts={bankAccounts.data}
                      fxRate={fxRate.data?.effectiveRate ?? null}
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResend(order.id)}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                    >
                      {sentAt ? 'Resend' : 'Send details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
