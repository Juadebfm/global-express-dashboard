import { useCallback } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, PROBLEM_TYPE, type ProblemValidationError } from '@/lib/apiClient';

interface UseApiErrorsToFormResult {
  /**
   * If `err` is an `ApiError` carrying RFC 7807 validation `errors[]`, map
   * each entry onto the matching field via react-hook-form's `setError`.
   * Returns the count of field errors applied (0 if `err` wasn't a validation
   * problem, in which case the caller should surface `err.message` as a
   * form-level error instead).
   */
  apply: (err: unknown) => number;
}

/**
 * Bridge between the backend's RFC 7807 validation problems (status 400 with
 * `type: "/problems/validation"`, body `errors: [{ path, message, code }]`)
 * and react-hook-form's per-field `setError`.
 *
 * Usage:
 *   const { register, handleSubmit, setError } = useForm<MyForm>();
 *   const { apply } = useApiErrorsToForm<MyForm>(setError);
 *   const onSubmit = async (data) => {
 *     try { await mutation.mutateAsync(data); }
 *     catch (err) {
 *       if (apply(err) === 0) showToast(err);  // not field-level → toast
 *     }
 *   };
 *
 * The hook accepts BOTH `/problems/validation` (400, full path/code) AND
 * `/problems/unprocessable` (422, semantic — may carry `errors[]` for
 * field-shaped problems like "callbackUrl not allowed"). Anything else
 * returns 0 so the caller can fall back to a toast.
 */
export function useApiErrorsToForm<TForm extends FieldValues>(
  setError: UseFormSetError<TForm>,
): UseApiErrorsToFormResult {
  const apply = useCallback(
    (err: unknown): number => {
      if (!(err instanceof ApiError) || !err.problem) return 0;
      const isValidation =
        err.problem.type === PROBLEM_TYPE.VALIDATION ||
        err.problem.type === PROBLEM_TYPE.UNPROCESSABLE;
      if (!isValidation) return 0;
      const errors = err.problem.errors;
      if (!Array.isArray(errors) || errors.length === 0) return 0;

      let applied = 0;
      for (const entry of errors) {
        const field = pathToFieldName(entry.path);
        if (!field) continue;
        setError(field as Path<TForm>, {
          type: entry.code ?? 'server',
          message: entry.message,
        });
        applied++;
      }
      return applied;
    },
    [setError],
  );

  return { apply };
}

/**
 * Convert backend `path: (string | number)[]` into react-hook-form's dotted
 * `FieldPath` string. Numeric segments become bracketed indices to match RHF
 * array-field semantics — `['items', 0, 'qty']` → `'items.0.qty'`.
 *
 * RHF actually accepts both `items.0.qty` and `items[0].qty` for nested
 * array fields; we use the dotted form because it's the one RHF emits in
 * its own type system.
 */
function pathToFieldName(path: ProblemValidationError['path']): string | null {
  if (!Array.isArray(path) || path.length === 0) return null;
  return path
    .map((segment) =>
      typeof segment === 'number' ? String(segment) : segment,
    )
    .join('.');
}
