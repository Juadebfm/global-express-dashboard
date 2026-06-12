import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

export function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }): ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
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

export function ImageTile({ url }: { url: string }): ReactElement {
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
        {!loaded && <div className="h-32 w-full animate-pulse rounded-xl bg-gray-200" />}
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
