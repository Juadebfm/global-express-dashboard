import type { FormEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Trash2, Upload } from 'lucide-react';
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
  isUploading: boolean;
  onUpload: (orderId: string, files: File[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
}

export function ImageGallery({
  orderId,
  images,
  isLoading,
  error,
  canDelete,
  isUploading,
  onUpload,
  onDelete,
}: ImageGalleryProps): ReactElement {
  const { t } = useTranslation('orders');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="text-base font-semibold text-gray-900">{t('images.title')}</h3>

      {/* Upload controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Upload className="h-4 w-4" />
          {t('images.selectFiles')}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <span className="text-xs text-gray-500">
          {files.length > 0 ? t('images.filesSelected', { count: files.length }) : t('images.noFiles')}
        </span>
        <Button type="submit" size="sm" isLoading={isUploading}>
          {t('images.upload')}
        </Button>
      </div>

      {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {uploadError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>}
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
                <img
                  src={image.url}
                  alt={image.r2Key || image.id}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6',
                    'opacity-0 transition-opacity group-hover:opacity-100',
                  )}
                >
                  <p className="truncate text-[10px] text-white/80">
                    {image.createdAt
                      ? formatDate(image.createdAt, { month: 'short', day: 'numeric' })
                      : ''}
                  </p>
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
  );
}
