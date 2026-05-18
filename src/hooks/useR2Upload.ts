import { useCallback } from 'react';

/**
 * Shared 3-step uploader for any backend that follows the presign → PUT → confirm
 * pattern. Used by shipment task-invoice + reg-docs uploaders so file bytes
 * never proxy through our API and we keep a single retry/timeout shape.
 *
 * Caller supplies the presign and confirm calls; this hook only owns the
 * direct R2 PUT in the middle.
 */
export interface R2UploadInput<TPresignResult, TConfirmResult> {
  file: Blob;
  contentType: string;
  presign: () => Promise<TPresignResult>;
  /** Extract the presigned `uploadUrl` from the presign result. */
  getUploadUrl: (presign: TPresignResult) => string;
  /** Build the confirm payload now that the upload succeeded. */
  confirm: (presign: TPresignResult) => Promise<TConfirmResult>;
}

export function useR2Upload(): <TPresignResult, TConfirmResult>(
  input: R2UploadInput<TPresignResult, TConfirmResult>,
) => Promise<TConfirmResult> {
  return useCallback(async function upload<TPresignResult, TConfirmResult>(
    input: R2UploadInput<TPresignResult, TConfirmResult>,
  ): Promise<TConfirmResult> {
    const presignResult = await input.presign();
    const uploadUrl = input.getUploadUrl(presignResult);

    const putResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      body: input.file,
    });
    if (!putResp.ok) {
      throw new Error(`Upload to storage failed (${putResp.status})`);
    }

    return input.confirm(presignResult);
  }, []);
}
