import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PackageX, RefreshCw, ServerCrash, ShieldOff } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ApiError } from '@/lib/apiClient';
import { getDisplayErrorMessage } from '@/lib/feedback';
import { ROUTES } from '@/constants';

interface BatchLoadErrorProps {
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Explains why a batch could not be opened, and offers only actions that can
 * actually help.
 *
 * Retrying a 404 or a 403 will always fail the same way, so neither offers a
 * retry — a missing batch needs a different batch, and a forbidden one needs a
 * capability the viewer does not hold. Only an unexpected failure is worth
 * trying again.
 */
export function BatchLoadError({
  error,
  onRetry,
  isRetrying = false,
}: BatchLoadErrorProps): ReactElement {
  const status = error instanceof ApiError ? error.status : null;
  const requestId = error instanceof ApiError ? error.requestId : null;

  const notFound = status === 404;
  const forbidden = status === 403;

  const { Icon, title, detail } = notFound
    ? {
        Icon: PackageX,
        title: 'This batch no longer exists',
        detail:
          'It may have been removed, or the link may be out of date. Open the batch list to find the one you want.',
      }
    : forbidden
      ? {
          Icon: ShieldOff,
          title: 'You do not have access to this batch',
          detail:
            'Viewing batches needs a permission your account has not been given. Ask a Superadmin if you need it.',
        }
      : {
          Icon: ServerCrash,
          title: 'Could not load this batch',
          detail: getDisplayErrorMessage(
            error,
            'Something went wrong while loading the batch. Please try again.',
          ),
        };

  return (
    <Card className="p-0">
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-6 w-6 text-gray-400" />
        </span>

        <div className="max-w-md space-y-1">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{detail}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Link to={ROUTES.BATCHES}>
            <Button variant={notFound || forbidden ? 'primary' : 'secondary'} size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All batches
            </Button>
          </Link>

          {/* Only an unexpected failure can be fixed by asking again. */}
          {!notFound && !forbidden && (
            <Button size="sm" onClick={onRetry} disabled={isRetrying}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Try again
            </Button>
          )}
        </div>

        {/* Staff can quote this when reporting the problem. */}
        {requestId && !notFound && !forbidden && (
          <p className="mt-1 font-mono text-xs text-gray-400">
            Reference: {requestId}
          </p>
        )}
      </div>
    </Card>
  );
}
