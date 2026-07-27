import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  confirmMyAvatar,
  presignMyAvatar,
  removeMyAvatar,
  uploadAvatarFile,
} from '@/services';
import { ApiError } from '@/lib/apiClient';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface AvatarUploaderProps {
  avatarUrl: string | null;
  initials: string;
  getToken: () => Promise<string | null>;
  onAvatarChanged: (avatarUrl: string | null) => void | Promise<void>;
}

function getUploadError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to update your avatar. Please try again.';
}

export function AvatarUploader({
  avatarUrl,
  initials,
  getToken,
  onAvatarChanged,
}: AvatarUploaderProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const displayedUrl = previewUrl ?? avatarUrl;

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError(null);
    setSuccess(null);

    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Choose an image smaller than 2 MB.');
      return;
    }

    clearPreview();
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(file);
    setImageFailed(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');

      const presign = await presignMyAvatar(token, { contentType: selectedFile.type as 'image/jpeg' | 'image/png' | 'image/webp' });
      await uploadAvatarFile(presign.uploadUrl, selectedFile);
      const updatedProfile = await confirmMyAvatar(token, presign.r2Key);
      clearPreview();
      setImageFailed(false);
      await onAvatarChanged(updatedProfile.avatarUrl);
      setSuccess('Avatar updated.');
    } catch (uploadError) {
      setError(getUploadError(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');

      const updatedProfile = await removeMyAvatar(token);
      clearPreview();
      setImageFailed(false);
      await onAvatarChanged(updatedProfile.avatarUrl);
      setSuccess('Avatar removed.');
    } catch (removeError) {
      setError(getUploadError(removeError));
    } finally {
      setIsRemoving(false);
    }
  };

  const isBusy = isUploading || isRemoving;

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex justify-center">
        {displayedUrl && !imageFailed ? (
          <img
            src={displayedUrl}
            alt="Your avatar"
            className="h-28 w-28 rounded-full border-2 border-brand-500 object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-50 text-5xl font-semibold text-brand-500">
            {initials}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isBusy}
      />

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Camera className="h-4 w-4" />}
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          Choose image
        </Button>
        {selectedFile && (
          <Button
            type="button"
            size="sm"
            leftIcon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            onClick={() => void handleUpload()}
            disabled={isBusy}
          >
            Save avatar
          </Button>
        )}
        {avatarUrl && !selectedFile && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            onClick={() => void handleRemove()}
            disabled={isBusy}
          >
            Remove
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">JPEG, PNG, or WebP · maximum 2 MB</p>
      {error && <p className="text-center text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="text-center text-sm text-emerald-700">{success}</p>}
    </div>
  );
}
