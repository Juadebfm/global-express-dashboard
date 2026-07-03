import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { ArrowLeft, Building2, Check, Copy, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { useBankAccounts, useFxRate } from '@/hooks';
import { useUploadPaymentReceipt } from '@/hooks/usePaymentReceipts';
import type { BankInfo, ReceiptContentType } from '@/types';
import { cn } from '@/utils';
import type { OrderView } from '../types';

const ACCEPTED: ReceiptContentType[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function CopyRow({ label, value }: { label: string; value: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

interface BankTabsProps {
  banks: BankInfo[];
  beneficiaryName: string;
  trackingNumber: string;
  amountDisplay: string;
  isConfirmed: boolean;
}

function BankTabs({ banks, beneficiaryName, trackingNumber, amountDisplay, isConfirmed }: BankTabsProps): ReactElement {
  const [active, setActive] = useState(0);
  const bank = banks[active];

  return (
    <div>
      {/* Tab strip */}
      <div className="overflow-x-auto mb-4">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 min-w-max sm:min-w-0">
          {banks.map((b, i) => (
            <button
              key={b.bankName}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'flex-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition',
                i === active
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {b.bankName}
            </button>
          ))}
        </div>
      </div>

      {/* Selected bank details */}
      {bank && (
        <div>
          <CopyRow label="Account Name" value={beneficiaryName} />
          {bank.accounts.map((acct) => (
            <CopyRow
              key={acct.currency}
              label={`Account Number (${acct.currency})`}
              value={acct.accountNumber}
            />
          ))}
          <CopyRow label="Payment Reference (Important)" value={trackingNumber} />
          <div className="pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {isConfirmed ? 'Amount to Send' : 'Estimated Amount'}
            </p>
            <p className="mt-0.5 text-xl font-bold text-brand-500">{amountDisplay}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomerPaymentViewProps {
  view: OrderView;
  onBack: () => void;
}

export function CustomerPaymentView({ view, onBack }: CustomerPaymentViewProps): ReactElement {
  const { data: bankSettings, isLoading: bankLoading } = useBankAccounts();
  const { mutate: uploadReceipt, isPending, error: uploadError } = useUploadPaymentReceipt();
  const fxRate = useFxRate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [manualAmount, setManualAmount] = useState<string | null>(null);
  const [remitterName, setRemitterName] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  const amountOwedUsd = view.amountDue ?? view.finalChargeUsd ?? 0;
  const effectiveRate = fxRate.data?.effectiveRate ?? null;

  const autoAmount = (() => {
    if (currency === 'USD') return amountOwedUsd > 0 ? String(amountOwedUsd) : '';
    if (effectiveRate !== null) return amountOwedUsd > 0 ? String(Math.round(amountOwedUsd * effectiveRate)) : '';
    return '';
  })();
  const amount = manualAmount ?? autoAmount;

  const isConfirmed = view.amountDue !== null;
  const amountDisplay = view.amountDue !== null
    ? `$${view.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : view.finalChargeUsd
      ? `$${view.finalChargeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : '—';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const picked = e.target.files?.[0] ?? null;
    setFileError(null);
    setSuccess(false);
    if (!picked) { setFile(null); return; }
    if (!ACCEPTED.includes(picked.type as ReceiptContentType)) {
      setFileError('Only JPEG, PNG, WEBP, and PDF files are accepted.');
      setFile(null);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFileError('File must be under 10 MB.');
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const parsedAmount = parseFloat(amount);
  const amountValid = amount.trim() !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
  const rateLoading = currency === 'NGN' && fxRate.isLoading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!file) { setFileError('Please choose a receipt file first.'); return; }
    if (!amountValid) { setFileError('Please enter the amount you are sending.'); return; }
    setFileError(null);

    await uploadReceipt({
      presign: { orderId: view.id, contentType: file.type as ReceiptContentType, originalFileName: file.name },
      file,
      submit: {
        orderId: view.id,
        amount: parsedAmount,
        currency,
        referenceCode: view.trackingNumber,
        remitterName: remitterName.trim() || undefined,
        paymentDate: paymentDate || undefined,
        transactionRef: transactionRef.trim() || undefined,
      },
    });

    setSuccess(true);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Back + status */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shipment
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Settle your balance</h2>
          <p className="mt-1 text-sm text-gray-500">
            Transfer the balance to any of our accounts below, then upload your receipt — we'll confirm within 2 hours.
          </p>
        </div>
        <div className="sm:text-right shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {isConfirmed ? 'Balance Due' : 'Estimated Balance'}
          </p>
          <p className="text-2xl font-bold text-brand-500">{amountDisplay}</p>
          {view.paymentNote && (
            <p className="mt-0.5 text-xs text-gray-400">{view.paymentNote}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Bank transfer details ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
              <Building2 className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Pay by bank transfer</h3>
          </div>

          {bankLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {bankSettings && <BankTabs banks={bankSettings.banks} beneficiaryName={bankSettings.beneficiaryName} trackingNumber={view.trackingNumber} amountDisplay={amountDisplay} isConfirmed={isConfirmed} />}

          <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3">
            <span className="mt-0.5 text-amber-500">ⓘ</span>
            <p className="text-xs text-amber-700">
              Always include the payment reference so we can match your transfer to this shipment automatically.
            </p>
          </div>
        </div>

        {/* ── Receipt upload ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
              <Upload className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Upload your receipt</h3>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Receipt submitted</p>
              <p className="text-xs text-gray-500">Staff will verify it and confirm your payment within 2 hours.</p>
              <button
                type="button"
                onClick={() => { setSuccess(false); }}
                className="mt-1 text-xs font-medium text-brand-500 hover:underline"
              >
                Upload another
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {/* Currency selector */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  I'm paying in
                </p>
                <div className="flex gap-2">
                  {(['NGN', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCurrency(c); setManualAmount(null); }}
                      className={cn(
                        'flex flex-1 items-center justify-center rounded-xl border py-2.5 text-sm font-semibold transition',
                        currency === c
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      )}
                    >
                      {c === 'NGN' ? '₦ Naira (NGN)' : '$ Dollar (USD)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount being sent */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Amount you're sending
                </label>
                <div className={cn(
                  'flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2.5 transition focus-within:border-brand-400 focus-within:bg-white',
                  rateLoading ? 'border-gray-100' : 'border-gray-200',
                )}>
                  {rateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                  ) : (
                    <span className="text-sm font-medium text-gray-400">{currency === 'NGN' ? '₦' : '$'}</span>
                  )}
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder={rateLoading ? 'Fetching rate…' : '0.00'}
                    disabled={rateLoading}
                    min="0"
                    step={currency === 'NGN' ? '1' : '0.01'}
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:text-gray-400"
                  />
                </div>
                {amountOwedUsd > 0 && !rateLoading && (
                  <p className="mt-1 text-xs text-gray-400">
                    Full balance: {currency === 'NGN' && effectiveRate
                      ? `₦${Math.round(amountOwedUsd * effectiveRate).toLocaleString()}`
                      : `$${amountOwedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    } — enter less if paying in instalments
                  </p>
                )}
              </div>

              {/* Remitter name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Name of remitter <span className="font-normal normal-case text-gray-400">(account holder name)</span>
                </label>
                <input
                  type="text"
                  value={remitterName}
                  onChange={(e) => setRemitterName(e.target.value)}
                  placeholder="Full name on your bank account"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 focus:bg-white"
                />
              </div>

              {/* Payment date + transaction ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Transfer date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Bank reference no.
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="From your receipt"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 focus:bg-white"
                  />
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                {file ? (
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">Drop your receipt here</p>
                    <p className="text-xs text-gray-400">PNG, JPG or PDF · up to 10 MB</p>
                  </>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Choose file
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="sr-only"
                onChange={handleFileChange}
              />

              {(fileError ?? uploadError?.message) && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {fileError ?? uploadError?.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isPending}
                disabled={!file || !amountValid || rateLoading}
              >
                I've sent the payment
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            We confirm your payment within 2 hours and send you an email once it's verified.
          </p>
        </div>
      </div>
    </div>
  );
}
