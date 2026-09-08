import { describe, expect, it } from 'vitest';
import { getAuditActorDisplay } from './auditActor';

describe('getAuditActorDisplay', () => {
  it('keeps automated and deleted-account events visible', () => {
    expect(getAuditActorDisplay(null)).toEqual({
      name: 'System',
      role: 'Automated event',
    });
  });

  it('formats a recorded actor', () => {
    expect(
      getAuditActorDisplay({
        id: 'staff-1',
        firstName: 'Julius',
        lastName: 'Adebowale',
        role: 'superadmin',
      }),
    ).toEqual({
      name: 'Julius Adebowale',
      role: 'superadmin',
    });
  });
});
