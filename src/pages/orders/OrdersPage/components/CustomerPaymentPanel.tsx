import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { useBankAccounts } from '@/hooks';
import { useUploadPaymentReceipt } from '@/hooks/usePaymentReceipts';
import type { ReceiptContentType } from '@/types';
import type { OrderView } from '../types';

const ACCEPTED_TYPES: ReceiptContentType[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

interface CustomerPaymentPanelProps {
  view: OrderView;
}

export function CustomerPaymentPanel({ view }: CustomerPaymentPanelProps): ReactElement {
  const { data: bankSettings, isLoading: bankLoading, error: bankError } = useBankAccounts();
  const { mutate: uploadReceipt, isPending, error: uploadError } = useUploadPaymentReceipt();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setSuccess(false);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type as ReceiptContentType)) {
      setFileError('Only JPEG, PNG, WEBP, and PDF files are accepted.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFileError(null);
    setSuccess(false);

    if (!selectedFile) {
      setFileError('Please select a receipt file.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFileError('Please enter a valid amount.');
      return;
    }

    await uploadReceipt({
      presign: {
        orderId: view.id,
        contentType: selectedFile.type as ReceiptContentType,
        originalFileName: selectedFile.name,
      },
      file: selectedFile,
      submit: {
        orderId: view.id,
        amount: parsedAmount,
        currency: 'NGN',
      },
    });

    setSuccess(true);
    setSelectedFile(null);
    setAmount('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Bank account details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Pay by Bank Transfer</h3>
        <p className="mt-1 text-sm text-gray-500">
          Transfer the amount due to one of the accounts below, then upload your receipt.
        </p>

        {bankLoading && (
          <div className="mt-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {bankError && (
          <p className="mt-4 text-sm text-red-600">Could not load bank details. Please refresh.</p>
        )}

        {bankSettings && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Beneficiary: <span className="text-gray-700">{bankSettings.beneficiaryName}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {bankSettings.banks.map((bank) => (
                <div
                  key={bank.bankName}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-gray-800">{bank.bankName}</p>
                  <div className="mt-2 space-y-1">
                    {bank.accounts.map((acct) => (
                      <div key={acct.currency} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{acct.currency}</span>
                        <span className="font-mono text-sm text-gray-800">{acct.accountNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Receipt upload */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">Upload Payment Receipt</h3>
        <p className="mt-1 text-sm text-gray-500">
          After transferring, upload your bank receipt here. Staff will verify it within 24 hours.
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Amount Paid (NGN)
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Receipt File
            </span>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 transition hover:border-brand-400 hover:bg-brand-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-gray-400" />
              <p className="text-sm text-gray-500">
                {selectedFile
                  ? selectedFile.name
                  : 'Click to choose a file — JPEG, PNG, WEBP or PDF'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {(fileError ?? (uploadError?.message)) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {fileError ?? uploadError?.message}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Receipt submitted — staff will review it shortly.
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            isLoading={isPending}
            disabled={!selectedFile || !amount}
          >
            Submit Receipt
          </Button>
        </form>
      </div>
    </div>
  );
}
