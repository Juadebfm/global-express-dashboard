import type { ReactElement } from 'react';
import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { createDormantClient } from '@/services';
import type { CreateDormantClientResult } from '@/types';

const INTERNAL_TOKEN_KEY = 'globalxpress_token';

interface CreateClientModalProps {
  onCreated: (client: CreateDormantClientResult) => void;
  onClose: () => void;
}

export function CreateClientModal({ onCreated, onClose }: CreateClientModalProps): ReactElement {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingMark, setShippingMark] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (!phone.trim()) { setError('Phone number is required.'); return; }
    if (!shippingMark.trim()) { setError('Shipping mark is required.'); return; }
    // Optional, but a malformed one is rejected by the API, so catch it here.
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address, or leave it blank.');
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem(INTERNAL_TOKEN_KEY);
      if (!token) throw new Error('Not authenticated.');
      const result = await createDormantClient(token, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim(),
        shippingMark: shippingMark.trim(),
        email: email.trim() || undefined,
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add new client</h3>
            <p className="mt-0.5 text-xs text-gray-500">Creates a dormant account — they can activate later.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Amaka" />
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Okonkwo" />
          </div>
          <Field label="Phone *" value={phone} onChange={setPhone} placeholder="+234 800 000 0000" type="tel" />
          <Field
            label="Shipping mark *"
            value={shippingMark}
            onChange={setShippingMark}
            placeholder="e.g. GX-AMAKA"
            hint="Unique identifier printed on their packages"
          />
          {/* Optional, but without one this client is findable by name only —
              the client search offers name or email. */}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="amaka@example.com"
            type="email"
            hint="Optional. Lets them be found by email later."
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleSubmit().catch(() => {}); }}
            disabled={saving}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create & select'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}

function Field({ label, value, onChange, placeholder, hint, type = 'text' }: FieldProps): ReactElement {
  // The label was not tied to its input, so clicking it did nothing and a
  // screen reader could not say which field it described.
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={hintId}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {hint && <p id={hintId} className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
