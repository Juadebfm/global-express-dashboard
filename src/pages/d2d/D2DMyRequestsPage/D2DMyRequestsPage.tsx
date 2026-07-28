import type { ReactElement } from 'react';
import { useState } from 'react';
import { Plus, Package, X } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types';
import { useMyD2dLeads, useSubmitD2dIntake } from '@/hooks/useLeads';
import { AppShell, PageHeader } from '@/pages/shared';
import { useFeedbackStore } from '@/store';
import { cn } from '@/utils';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Submitted',
  contacted: 'In Review',
  converted: 'Converted',
  closed: 'Closed',
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  converted: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  originCountry: '',
  goodsDescription: '',
  estimatedWeightKg: '',
  deliveryAddressLine1: '',
  deliveryState: '',
  deliveryCity: '',
};

function LeadCard({ lead }: { lead: Lead }) {
  const metadata = lead.metadata as Record<string, unknown> | null;
  const delivery = metadata?.delivery as Record<string, string> | undefined;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{lead.message}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            From {lead.originCountry ?? 'Unknown'} · {new Date(lead.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_CLASSES[lead.status])}>
          {STATUS_LABELS[lead.status]}
        </span>
      </div>
      {(!!metadata?.estimatedWeightKg || !!delivery?.addressLine1) && (
        <div className="grid gap-1 text-sm text-gray-500 sm:grid-cols-2">
          {!!metadata?.estimatedWeightKg && (
            <span>Est. weight: {String(metadata.estimatedWeightKg)} kg</span>
          )}
          {delivery?.addressLine1 && (
            <span>Delivery: {[delivery.addressLine1, delivery.city, delivery.state].filter(Boolean).join(', ')}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function D2DMyRequestsPage(): ReactElement {
  const { leads, isLoading, error } = useMyD2dLeads();
  const submitMutation = useSubmitD2dIntake();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitMutation.mutateAsync({
        fullName: form.fullName,
        phone: form.phone || undefined,
        originCountry: form.originCountry,
        goodsDescription: form.goodsDescription,
        estimatedWeightKg: form.estimatedWeightKg ? Number(form.estimatedWeightKg) : undefined,
        deliveryAddressLine1: form.deliveryAddressLine1 || undefined,
        deliveryState: form.deliveryState || undefined,
        deliveryCity: form.deliveryCity || undefined,
      });
      pushMessage({ tone: 'success', message: 'D2D request submitted. Our team will be in touch.' });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      pushMessage({ tone: 'error', message: 'Failed to submit request. Please try again.' });
    }
  };

  return (
    <AppShell data={null} isLoading={false} error={null} requireData={false}>
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title="My D2D Requests"
          subtitle="Door-to-door shipping requests you have submitted"
        />
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* New request modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Submit D2D Request</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} required
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Origin Country *</label>
                <input name="originCountry" value={form.originCountry} onChange={handleChange} required
                  placeholder="e.g. South Korea"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Goods Description *</label>
                <textarea name="goodsDescription" value={form.goodsDescription} onChange={handleChange} required
                  rows={3}
                  placeholder="Describe the goods you want shipped"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Est. Weight (kg)</label>
                  <input name="estimatedWeightKg" type="number" min="0" step="0.1" value={form.estimatedWeightKg} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Delivery Address</label>
                  <input name="deliveryAddressLine1" value={form.deliveryAddressLine1} onChange={handleChange}
                    placeholder="Street address"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">City</label>
                  <input name="deliveryCity" value={form.deliveryCity} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">State</label>
                  <input name="deliveryState" value={form.deliveryState} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitMutation.isPending}
                  className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No D2D requests yet.</p>
          <button onClick={() => setShowForm(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Submit your first request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}
    </AppShell>
  );
}
