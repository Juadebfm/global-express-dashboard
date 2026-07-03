import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plane, Ship, Package2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Button, ConfirmModal, ClientCombobox } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';
import {
  useInternalDeclaration,
  useAcceptDeclaration,
  useRejectDeclaration,
  useLinkCustomer,
  useInternalOrder,
} from '@/hooks/useInternalDeclarations';
import { cn } from '@/utils';
import type { InternalDeclaration } from '@/types/internalDeclarations.types';

function ShipmentBadge({ type }: { type: InternalDeclaration['shipmentType'] }): ReactElement {
  const labels = { air: 'Air freight', ocean: 'Ocean freight', d2d: 'Door-to-door' };
  const icons = {
    air: <Plane className="h-3.5 w-3.5" />,
    ocean: <Ship className="h-3.5 w-3.5" />,
    d2d: <Package2 className="h-3.5 w-3.5" />,
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-600">
      {icons[type]}
      {labels[type]}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }): ReactElement | null {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function ExpandableText({ label, value }: { label: string; value: string | null | undefined }): ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const THRESHOLD = 160;
  const needsTruncation = value.length > THRESHOLD;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={cn('text-sm text-gray-900 whitespace-pre-wrap', !expanded && needsTruncation && 'line-clamp-3')}>
        {value}
      </p>
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function StatusBanner({ declaration }: { declaration: InternalDeclaration }): ReactElement | null {
  if (declaration.status === 'pending_review') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Awaiting review</p>
          <p className="text-xs text-amber-600 mt-0.5">Review and accept or reject this goods notice.</p>
        </div>
      </div>
    );
  }
  if (declaration.status === 'accepted') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Accepted</p>
          {declaration.reviewedAt && (
            <p className="text-xs text-emerald-600 mt-0.5">
              {new Date(declaration.reviewedAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    );
  }
  if (declaration.status === 'rejected') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Not accepted</p>
          {declaration.rejectionReason && (
            <p className="text-xs text-red-700 mt-1">{declaration.rejectionReason}</p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function AcceptedActions({ declaration }: { declaration: InternalDeclaration }): ReactElement {
  const navigate = useNavigate();
  const { data: order } = useInternalOrder(declaration.orderId);
  const { mutateAsync: link, isPending: isLinking } = useLinkCustomer();
  const [selectedCustomerId, setSelectedCustomerId] = useState(declaration.linkedCustomerId ?? '');
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleLink = async () => {
    if (!selectedCustomerId) return;
    setLinkError(null);
    try {
      await link({ id: declaration.id, payload: { customerId: selectedCustomerId } });
      setLinkSuccess(true);
    } catch {
      setLinkError('Failed to link customer. Please try again.');
    }
  };

  const alreadyLinked = !!declaration.linkedCustomerId;
  const customerDone = alreadyLinked || linkSuccess;

  return (
    <div className="space-y-4">
      {declaration.orderId && (
        <Card className="p-4 space-y-1">
          <p className="text-xs text-gray-400">Tracking number</p>
          {order ? (
            <p className="font-mono text-base font-semibold text-gray-900">{order.trackingNumber}</p>
          ) : (
            <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
          )}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Link to customer</p>
        {customerDone ? (
          <p className="text-sm text-emerald-600">
            {linkSuccess ? 'Customer linked successfully.' : 'Customer already linked.'}
          </p>
        ) : (
          <>
            <ClientCombobox
              selectedId={selectedCustomerId}
              onSelect={(c) => {
                setSelectedCustomerId(c.id);
                setLinkError(null);
              }}
              placeholder="Search by name or email…"
              error={linkError}
            />
            <Button
              onClick={() => void handleLink()}
              isLoading={isLinking}
              disabled={!selectedCustomerId}
              className="w-full"
            >
              Link customer
            </Button>
          </>
        )}
      </Card>

      {customerDone && (
        <Button
          onClick={() => navigate(ROUTES.ORDERS)}
          className="w-full"
        >
          View in orders
        </Button>
      )}
    </div>
  );
}

interface PendingActionsProps {
  declaration: InternalDeclaration;
  onError: (msg: string) => void;
}

function PendingActions({ declaration, onError }: PendingActionsProps): ReactElement {
  const { mutateAsync: accept, isPending: isAccepting } = useAcceptDeclaration();
  const { mutateAsync: reject, isPending: isRejecting } = useRejectDeclaration();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const handleAccept = async () => {
    try {
      await accept(declaration.id);
      setShowAcceptModal(false);
    } catch {
      setShowAcceptModal(false);
      onError('Failed to accept this goods notice. Please try again.');
    }
  };

  const handleReject = async () => {
    setReasonError('');
    if (!reason.trim()) {
      setReasonError('A rejection reason is required.');
      return;
    }
    try {
      await reject({ id: declaration.id, payload: { reason: reason.trim() } });
      setShowRejectForm(false);
    } catch {
      onError('Failed to reject this goods notice. Please try again.');
    }
  };

  return (
    <>
      {!showRejectForm ? (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowRejectForm(true)} className="flex-1">
            Reject
          </Button>
          <Button onClick={() => setShowAcceptModal(true)} className="flex-1">
            Accept
          </Button>
        </div>
      ) : (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Rejection reason</p>
          <div>
            <textarea
              rows={3}
              placeholder="Explain why this goods notice is being rejected…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError('');
              }}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white resize-none',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                reasonError ? 'border-red-400' : 'border-gray-300',
              )}
            />
            {reasonError && <p className="mt-1 text-xs text-red-500">{reasonError}</p>}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowRejectForm(false); setReason(''); setReasonError(''); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleReject()}
              isLoading={isRejecting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirm rejection
            </Button>
          </div>
        </Card>
      )}

      <ConfirmModal
        isOpen={showAcceptModal}
        title="Accept goods notice"
        message="This will mark the goods notice as accepted. The supplier will be notified."
        confirmLabel="Accept"
        cancelLabel="Cancel"
        onConfirm={() => void handleAccept()}
        onCancel={() => setShowAcceptModal(false)}
        isLoading={isAccepting}
      />
    </>
  );
}

export function SupplierNoticeReviewPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: declaration, isLoading, error } = useInternalDeclaration(id);

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : 'Staff',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUPPLIER_NOTICES)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to goods notices
        </button>

        {/* Error banner — top of content, below back link */}
        {actionError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        )}

        {!isLoading && error && (
          <Card className="p-8 text-center">
            <p className="text-sm text-red-500">Could not load this goods notice. Please refresh.</p>
          </Card>
        )}

        {!isLoading && !error && declaration && (
          <>
            <StatusBanner declaration={declaration} />

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Supplier</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Name" value={declaration.supplierName} />
                <Field label="Business" value={declaration.supplierBusinessName} />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Goods</p>
                <ShipmentBadge type={declaration.shipmentType} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="col-span-2">
                  <ExpandableText label="Description" value={declaration.description} />
                </div>
                <Field
                  label="Declared value"
                  value={`USD ${parseFloat(declaration.declaredValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <Field label="Quantity" value={declaration.quantity} />
                <Field
                  label="Est. weight"
                  value={declaration.estimatedWeightKg ? `${declaration.estimatedWeightKg} kg` : null}
                />
                <Field
                  label="Est. arrival"
                  value={
                    declaration.estimatedArrivalAt
                      ? new Date(declaration.estimatedArrivalAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : null
                  }
                />
                <Field
                  label="Submitted"
                  value={new Date(declaration.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                />
              </div>
              {(declaration.specialPackagingNotes || declaration.supplierNotes) && (
                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 gap-3">
                  <ExpandableText label="Packaging notes" value={declaration.specialPackagingNotes} />
                  <ExpandableText label="Supplier notes" value={declaration.supplierNotes} />
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recipient</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Name" value={declaration.recipientName} />
                <Field label="Phone" value={declaration.recipientPhone} />
                <Field label="Email" value={declaration.recipientEmail} />
                {declaration.recipientAddress && (
                  <div className="col-span-2">
                    <Field label="Address" value={declaration.recipientAddress} />
                  </div>
                )}
              </div>
            </Card>

            {declaration.status === 'pending_review' && (
              <PendingActions
                declaration={declaration}
                onError={(msg) => { setActionError(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            )}
            {declaration.status === 'accepted' && (
              <AcceptedActions declaration={declaration} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
