import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import { importUsersSuppliers } from '@/services';
import type { AdminImportResult } from '@/types';

const TOKEN_KEY = 'globalxpress_token';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/csv', ''] as const;
const ACCEPTED_EXTENSIONS = ['.csv'] as const;

export interface ImportFileValidationError {
  type: 'fileType' | 'fileSize';
  message: string;
}

export function validateImportFile(file: File): ImportFileValidationError | null {
  // Some browsers report an empty MIME for CSVs — fall back to extension.
  const nameLower = file.name.toLowerCase();
  const matchesExt = ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  const matchesType = (ACCEPTED_TYPES as readonly string[]).includes(file.type);
  if (!matchesExt || (!matchesType && file.type !== '')) {
    return { type: 'fileType', message: FEEDBACK_MESSAGES.adminImports.fileTypeError };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { type: 'fileSize', message: FEEDBACK_MESSAGES.adminImports.fileSizeError };
  }
  return null;
}

export function useImportUsersSuppliers(): {
  mutate: (input: { file: File; dryRun?: boolean }) => Promise<AdminImportResult>;
  isPending: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<AdminImportResult, Error, { file: File; dryRun?: boolean }>({
    mutationFn: async ({ file, dryRun }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      const validation = validateImportFile(file);
      if (validation) throw new Error(validation.message);
      return importUsersSuppliers(token, { file, dryRun });
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        pushMessage({
          tone: 'info',
          message: FEEDBACK_MESSAGES.adminImports.dryRunSuccess,
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        pushMessage({
          tone: 'success',
          message: FEEDBACK_MESSAGES.adminImports.importSuccess,
        });
      }
    },
    onError: (err, variables) => {
      pushMessage({
        tone: 'error',
        message:
          err.message ||
          (variables.dryRun
            ? FEEDBACK_MESSAGES.adminImports.dryRunError
            : FEEDBACK_MESSAGES.adminImports.importError),
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}
