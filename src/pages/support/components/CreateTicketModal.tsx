import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { SupportTicketForm } from '@/components/forms';
import type { CreateSupportTicketPayload } from '@/types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSupportTicketPayload) => Promise<unknown>;
  isCreating: boolean;
}

export function CreateTicketModal({ isOpen, onClose, onSubmit, isCreating }: CreateTicketModalProps): ReactElement | null {
  const { t } = useTranslation('common');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (payload: CreateSupportTicketPayload): Promise<void> => {
    await onSubmit(payload);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-1">
          <SupportTicketForm onSubmit={handleSubmit} isLoading={isCreating} />
        </div>
      </div>
    </div>
  );
}
