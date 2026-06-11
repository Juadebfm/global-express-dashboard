import type { FormEvent, ReactElement } from 'react';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image, Maximize2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setUploadError(null);
    if (files.length === 0) {
      setUploadError(t('images.errors.noFiles'));
      return;
    }
    try {
      await onUpload(orderId, files);
      setNotice(t('images.uploadSuccess', { count: files.length }));
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('images.errors.uploadFailed'));
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
    <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="text-base font-semibold text-gray-900">{t('images.title')}</h3>

      {canUpload && (
        <>
          {/* Upload controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Select from library */}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              {t('images.selectFiles')}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length > 0) {
                    setFiles((prev) => [...prev, ...picked]);
                    setUploadError(null);
                  }
                }}
              />
            </label>

            {/* Take photo — each capture appends to the queue */}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Camera className="h-4 w-4" />
              Take photo
              <input
                ref={cameraInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const captured = Array.from(e.target.files ?? []);
                  if (captured.length > 0) {
                    setFiles((prev) => [...prev, ...captured]);
                    setUploadError(null);
                    // Reset so the same input fires again next tap
                    if (cameraInputRef.current) cameraInputRef.current.value = '';
                  }
                }}
              />
            </label>

            <span className="text-xs text-gray-500">
              {files.length > 0 ? t('images.filesSelected', { count: files.length }) : t('images.noFiles')}
            </span>
            <Button type="submit" size="sm" isLoading={isUploading}>
              {t('images.upload')}
            </Button>
          </div>

          {/* Selected file previews */}
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative h-20 w-20 overflow-hidden rounded-xl border border-brand-200 ring-2 ring-brand-100">
                  <img src={src} alt={files[i]?.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      const next = files.filter((_, idx) => idx !== i);
                      setFiles(next);
                      setUploadError(null);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove"
                  >
                    <span className="text-[10px] font-bold leading-none">✕</span>
                  </button>
                </div>
              ))}
            </div>
          )}

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
            <Image className="h-8 w-8" />
            <p className="mt-2 text-sm">{t('images.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-xl border border-gray-200"
              >
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
                  />
                </button>
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
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(image.url)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(image.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('images.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
    </>
  );
}
