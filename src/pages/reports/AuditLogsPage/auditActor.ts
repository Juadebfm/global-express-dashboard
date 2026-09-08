import type { AuditLogActor } from '@/types';

export interface AuditActorDisplay {
  name: string;
  role: string;
}

/**
 * Automated events and events retained after a user is deleted do not have
 * an actor. Keep those audit rows visible with a clear fallback.
 */
export function getAuditActorDisplay(
  actor: AuditLogActor | null | undefined,
): AuditActorDisplay {
  const name = [actor?.firstName, actor?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  return {
    name: name || 'System',
    role: actor?.role || 'Automated event',
  };
}
