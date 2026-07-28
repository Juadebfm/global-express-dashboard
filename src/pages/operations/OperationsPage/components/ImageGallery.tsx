import type { ReactElement } from 'react';
import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Maximize2, X, ImageOff } from 'lucide-react';
import { cn } from '@/utils';
import { formatDate } from '@/utils';
import type { OrderImage } from '@/types';

interface ImageGalleryProps {
  orderId: string;
  images: OrderImage[];
  isLoading: boolean;
  error: string | null;
  canDelete: boolean;
  canUpload?: boolean;
  isUploading: boolean;
  onUpload: (orderId: string, files: File[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }): ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Package image"
        className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ImageGallery({
  orderId,
  images,
  isLoading,
  error,
  canDelete,
  canUpload = true,
  isUploading,
  onUpload,
  onDelete,
}: ImageGalleryProps): ReactElement {
  const { t } = useTranslation('orders');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // Keyed by orderId so the set resets automatically when the order changes —
  // avoids calling setState inside a useEffect.
  const [brokenState, setBrokenState] = useState<{ forId: string; ids: Set<string> }>({
    forId: orderId,
    ids: new Set(),
  });
  const brokenIds = brokenState.forId === orderId ? brokenState.ids : new Set<string>();
  const refetchedFor = useRef('');

  const handleImageError = useCallback((imageId: string) => {
    setBrokenState((prev) => {
      const currentIds = prev.forId === orderId ? new Set(prev.ids) : new Set<string>();
      currentIds.add(imageId);
      return { forId: orderId, ids: currentIds };
    });
    if (refetchedFor.current !== orderId) {
      refetchedFor.current = orderId;
      void queryClient.invalidateQueries({ queryKey: ['order-images', orderId] });
    }
  }, [queryClient, orderId]);

  const handlePicked = async (picked: File[]): Promise<void> => {
    if (picked.length === 0) return;
    setNotice(null);
    setUploadError(null);
    try {
      await onUpload(orderId, picked);
      setNotice(t('images.uploadSuccess', { count: picked.length }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('images.errors.uploadFailed'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string): Promise<void> => {
    setNotice(null);
    setUploadError(null);
    try {
      await onDelete(imageId);
      setNotice(t('images.deleteSuccess'));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('images.errors.deleteFailed'));
    }
  };

  return (
    <>
    {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900">{t('images.title')}</h3>

      {canUpload && (
        <>
          {/* Upload controls — selecting or capturing a photo uploads it immediately */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50',
                isUploading && 'pointer-events-none opacity-50',
              )}
            >
              {t('images.selectFiles')}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                disabled={isUploading}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => void handlePicked(Array.from(e.target.files ?? []))}
              />
            </label>

            <label
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50',
                isUploading && 'pointer-events-none opacity-50',
              )}
            >
              Take photo
              <input
                ref={cameraInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                disabled={isUploading}
                onChange={(e) => void handlePicked(Array.from(e.target.files ?? []))}
              />
            </label>

            {isUploading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                {t('images.uploading')}
              </span>
            )}
          </div>

          {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
          {uploadError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>}
        </>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Image grid */}
      <div className="mt-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">{t('images.loading')}</p>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 py-8 text-gray-400">
            <ImageIcon className="h-8 w-8" />
            <p className="mt-2 text-sm">{t('images.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => {
              const isBroken = brokenIds.has(image.id);
              return (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200"
                >
                  {isBroken ? (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-gray-50 text-gray-400">
                      <ImageOff className="h-6 w-6" />
                      <span className="text-[10px]">Failed to load</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(image.url)}
                      className="block w-full"
                      aria-label="View full image"
                    >
                      <img
                        src={image.url}
                        alt=""
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                        onError={() => handleImageError(image.id)}
                      />
                    </button>
                  )}
                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6',
                      'opacity-0 transition-opacity group-hover:opacity-100',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-[10px] text-white/80">
                        {image.createdAt
                          ? formatDate(image.createdAt, { month: 'short', day: 'numeric' })
                          : ''}
                      </p>
                      {!isBroken && (
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(image.url)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(image.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-300 hover:text-red-200"
                      >
                        {t('images.delete')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
