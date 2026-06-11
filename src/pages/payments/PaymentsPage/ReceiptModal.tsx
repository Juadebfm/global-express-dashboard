import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';

interface ReceiptModalProps {
  url: string;
  onClose: () => void;
}

function receiptMediaType(url: string): 'image' | 'pdf' | 'link' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'link';
}

export function ReceiptModal({ url, onClose }: ReceiptModalProps): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mediaType = receiptMediaType(url);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Payment Receipt</p>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 p-4">
          {mediaType === 'image' && (
            <img
              src={url}
              alt="Payment receipt"
              className="max-h-[70vh] max-w-full rounded-lg object-contain shadow"
            />
          )}
          {mediaType === 'pdf' && (
            <iframe
              src={url}
              title="Payment receipt"
              className="h-[70vh] w-full rounded-lg border border-gray-200"
            />
          )}
          {mediaType === 'link' && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-gray-500">
                This file type can't be previewed directly.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <ExternalLink className="h-4 w-4" />
                Open receipt
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
