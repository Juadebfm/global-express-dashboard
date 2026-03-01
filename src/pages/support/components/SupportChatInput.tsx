import type { ReactElement, FormEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';

interface SupportChatInputProps {
  onSend: (body: string, isInternal: boolean) => void;
  isSending: boolean;
  isStaff: boolean;
  isClosed: boolean;
}

export function SupportChatInput({ onSend, isSending, isStaff, isClosed }: SupportChatInputProps): ReactElement {
  const { t } = useTranslation('support');
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const canSend = body.trim().length > 0 && !isSending && !isClosed;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend(body.trim(), isInternal);
    setBody('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isClosed) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
        {t('chatInput.closedMessage')}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-3">
      {isStaff && (
        <div className="mb-2 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="radio"
              name="messageType"
              checked={!isInternal}
              onChange={() => setIsInternal(false)}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span className="text-gray-700">{t('chatInput.replyLabel')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="radio"
              name="messageType"
              checked={isInternal}
              onChange={() => setIsInternal(true)}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="text-amber-700">{t('chatInput.internalNoteLabel')}</span>
          </label>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isInternal ? t('chatInput.internalPlaceholder') : t('chatInput.messagePlaceholder')}
          rows={2}
          className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            isInternal
              ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
              : 'border-gray-200 bg-gray-50 focus:ring-brand-500'
          }`}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
