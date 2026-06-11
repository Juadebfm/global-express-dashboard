import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import type { SupportMessage } from '@/types';
import i18n from '@/i18n/i18n';

interface SupportChatBubbleProps {
  message: SupportMessage;
  isCurrentUser: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
}

/* ── Inline copy chip ──────────────────────────────────────────── */

function CopyChip({ label, value }: { label: string; value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-xs font-medium text-gray-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

/* ── Lightbox ──────────────────────────────────────────────────── */

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }): ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-gray-700 hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={url}
          alt="Proof"
          className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/70 hover:text-white transition"
        >
          <ExternalLink className="h-3 w-3" /> Open original
        </a>
      </div>
    </div>
  );
}

/* ── Image tile ────────────────────────────────────────────────── */

function ImageTile({ url }: { url: string }): ReactElement {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  if (errored) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-gray-100 transition"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span className="truncate">View file</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 cursor-zoom-in"
      >
        {!loaded && (
          <div className="h-32 w-full animate-pulse rounded-xl bg-gray-200" />
        )}
        <img
          src={url}
          alt="Proof"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-32 w-full object-cover transition group-hover:brightness-90 ${loaded ? 'block' : 'hidden'}`}
        />
        <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100">
          Click to expand
        </span>
      </button>
      {lightbox && <ImageLightbox url={url} onClose={() => setLightbox(false)} />}
    </>
  );
}

/* ── Structured message parser + renderer ─────────────────────── */

interface ParsedStructuredBody {
  title: string;
  fields: Array<{ label: string; value: string }>;
  messageText: string;
  proofUrls: string[];
}

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXTS.test(url);
}

function parseStructuredBody(body: string): ParsedStructuredBody | null {
  if (!body.includes('Tracking:') && !body.includes('Claimant:')) return null;

  const lines = body.split('\n');
  const title = lines[0]?.trim() ?? '';
  const fields: Array<{ label: string; value: string }> = [];
  const proofUrls: string[] = [];
  let messageText = '';
  let inProofSection = false;
  let inMessageSection = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { inMessageSection = false; continue; }

    if (line.toLowerCase() === 'proof files:' || line.toLowerCase() === 'proof files') {
      inProofSection = true;
      inMessageSection = false;
      continue;
    }

    if (line.toLowerCase() === 'message:') {
      inProofSection = false;
      inMessageSection = true;
      continue;
    }

    if (inProofSection) {
      const url = line.replace(/^-\s*/, '').trim();
      if (url.startsWith('http')) proofUrls.push(url);
      continue;
    }

    if (inMessageSection) {
      messageText = messageText ? `${messageText}\n${line}` : line;
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const label = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value) fields.push({ label, value });
    }
  }

  return { title, fields, messageText: messageText.trim(), proofUrls };
}

function StructuredMessageCard({
  parsed,
  time,
  senderName,
}: {
  parsed: ParsedStructuredBody;
  time: string;
  senderName: string;
}): ReactElement {
  const imageUrls = parsed.proofUrls.filter(isImageUrl);
  const fileUrls = parsed.proofUrls.filter((u) => !isImageUrl(u));

  // Separate tracking for special treatment
  const trackingField = parsed.fields.find((f) => f.label.toLowerCase() === 'tracking');
  const otherFields = parsed.fields.filter((f) => f.label.toLowerCase() !== 'tracking');

  return (
    <div className="my-2 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500">{senderName}</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">{parsed.title}</p>
        {trackingField && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">Tracking</span>
            <span className="font-mono text-sm font-semibold text-brand-700">{trackingField.value}</span>
            <CopyChipInline value={trackingField.value} />
          </div>
        )}
      </div>

      {/* Info grid */}
      {otherFields.length > 0 && (
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {otherFields.map((f) => (
            <CopyChip key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {/* Message text */}
      {parsed.messageText && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Message</p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{parsed.messageText}</p>
        </div>
      )}

      {/* Image tiles */}
      {imageUrls.length > 0 && (
        <div className="border-t border-gray-100 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Proof files ({imageUrls.length})
          </p>
          <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {imageUrls.map((url) => (
              <ImageTile key={url} url={url} />
            ))}
          </div>
        </div>
      )}

      {/* Non-image file links */}
      {fileUrls.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Files</p>
          <div className="space-y-1">
            {fileUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{url.split('/').pop()}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-3 text-right">
        <span className="text-[10px] text-gray-400">{time}</span>
      </div>
    </div>
  );
}

/* Tiny inline copy icon (no label) */
function CopyChipInline({ value }: { value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded p-0.5 text-brand-400 hover:text-brand-600 transition"
      aria-label="Copy tracking number"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ── Main bubble ───────────────────────────────────────────────── */

export function SupportChatBubble({ message, isCurrentUser }: SupportChatBubbleProps): ReactElement {
  const { t } = useTranslation('support');
  const time = formatTime(message.createdAt);

  if (message.isInternal) {
    return (
      <div className="mx-auto my-2 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-amber-600">
          <span>{t('chatInput.internalNoteLabel')}</span>
          <span className="font-normal text-amber-500">{message.senderName}</span>
        </div>
        <p className="text-sm text-amber-800 whitespace-pre-wrap">{message.body}</p>
        <span className="mt-1 block text-[10px] text-amber-500">{time}</span>
      </div>
    );
  }

  const parsed = parseStructuredBody(message.body);
  if (parsed) {
    return (
      <div className={`flex my-1.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <StructuredMessageCard parsed={parsed} time={time} senderName={message.senderName} />
      </div>
    );
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isCurrentUser
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-900'
        }`}
      >
        {!isCurrentUser && (
          <span className="mb-0.5 block text-[11px] font-semibold text-gray-500">
            {message.senderName}
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <span className={`mt-1 block text-[10px] ${isCurrentUser ? 'text-brand-200' : 'text-gray-400'}`}>
          {time}
        </span>
      </div>
    </div>
  );
}
