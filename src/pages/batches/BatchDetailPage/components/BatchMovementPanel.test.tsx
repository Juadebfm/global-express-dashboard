import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BatchMovementPanel } from './BatchMovementPanel';
import { buildStages } from './buildStages';
import type { BatchMovement, BatchMovementHistory } from '@/types';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const FLOW = [
  'WAREHOUSE_VERIFIED_PRICED',
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
] as const;

const LABELS: Record<string, string> = {
  WAREHOUSE_VERIFIED_PRICED: 'Verified and priced',
  DISPATCHED_TO_ORIGIN_AIRPORT: 'Sent to the airport',
  AT_ORIGIN_AIRPORT: 'At the airport',
  BOARDED_ON_FLIGHT: 'Loaded onto the flight',
  FLIGHT_DEPARTED: 'In the air',
};

function makeHistory(
  events: Array<{ statusV2: string; occurredAt: string }> = [],
  currentStatus: string | null = null,
): BatchMovementHistory {
  return {
    batchId: 'batch-1',
    transportMode: 'air',
    currentStatus,
    flow: FLOW.map((statusV2) => ({
      statusV2,
      label: LABELS[statusV2],
      description: '',
      kind: 'advance' as const,
    })),
    events: events.map((e) => ({
      statusV2: e.statusV2,
      label: LABELS[e.statusV2],
      description: '',
      occurredAt: e.occurredAt,
    })),
  };
}

function makeMovement(overrides: Partial<BatchMovement> = {}): BatchMovement {
  return {
    batchId: 'batch-1',
    batchLifecycleStatus: 'closed',
    currentStatus: 'AT_ORIGIN_AIRPORT',
    currentStatusLabel: 'At the airport',
    heldFromStatus: null,
    allowedActions: [],
    ...overrides,
  };
}

describe('buildStages', () => {
  it('marks stages before the current one as done and the rest as upcoming', () => {
    const history = makeHistory([
      { statusV2: 'WAREHOUSE_VERIFIED_PRICED', occurredAt: '2026-08-01T10:00:00.000Z' },
      { statusV2: 'DISPATCHED_TO_ORIGIN_AIRPORT', occurredAt: '2026-08-02T10:00:00.000Z' },
      { statusV2: 'AT_ORIGIN_AIRPORT', occurredAt: '2026-08-04T17:36:00.000Z' },
    ]);

    const stages = buildStages(history, 'AT_ORIGIN_AIRPORT');

    expect(stages.map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
  });

  // Stages completed before the backend started recording history have no
  // event. They are complete, but no date may be invented for them.
  it('marks an earlier stage with no recorded event as done but undated', () => {
    const history = makeHistory([
      { statusV2: 'AT_ORIGIN_AIRPORT', occurredAt: '2026-08-04T17:36:00.000Z' },
    ]);

    const stages = buildStages(history, 'AT_ORIGIN_AIRPORT');

    expect(stages[0]?.state).toBe('done-undated');
    expect(stages[0]?.occurredAt).toBeNull();
    expect(stages[1]?.state).toBe('done-undated');
    expect(stages[1]?.occurredAt).toBeNull();
    expect(stages[2]?.state).toBe('current');
    expect(stages[2]?.occurredAt).toBe('2026-08-04T17:36:00.000Z');
  });

  // An exception status is not part of the normal flow, so no stage matches it.
  it('treats every stage as not-yet-current when the batch is on an exception', () => {
    const history = makeHistory([
      { statusV2: 'WAREHOUSE_VERIFIED_PRICED', occurredAt: '2026-08-01T10:00:00.000Z' },
    ]);

    const stages = buildStages(history, 'ON_HOLD');

    expect(stages.some((s) => s.state === 'current')).toBe(false);
    // A recorded stage still shows as done rather than disappearing.
    expect(stages[0]?.state).toBe('done');
  });

  it('handles a batch with no movement recorded at all', () => {
    const stages = buildStages(makeHistory(), null);

    expect(stages).toHaveLength(FLOW.length);
    expect(stages.every((s) => s.state === 'upcoming')).toBe(true);
  });
});

describe('BatchMovementPanel', () => {
  const baseProps = {
    history: makeHistory([
      { statusV2: 'AT_ORIGIN_AIRPORT', occurredAt: '2026-08-04T17:36:00.000Z' },
    ]),
    isHistoryLoading: false,
    historyError: null,
    onRetryHistory: vi.fn(),
    masterTrackingNumber: 'AIR-20260727-0001',
    totalOrders: 3,
    canManage: true,
    canOverrideRestriction: false,
    isSubmitting: false,
    onConfirmAction: vi.fn(),
  };

  const advance = {
    statusV2: 'BOARDED_ON_FLIGHT',
    label: 'Loaded onto the flight',
    description: 'The goods are on the aircraft.',
    kind: 'advance' as const,
  };
  const cancel = {
    statusV2: 'CANCELLED',
    label: 'Cancelled',
    description: 'This batch has been cancelled.',
    kind: 'exception' as const,
  };
  const override = {
    statusV2: 'RESTRICTED_ITEM_OVERRIDE_APPROVED',
    label: 'Restriction override approved',
    description: 'The restriction was reviewed and approved.',
    kind: 'exception' as const,
  };

  it('shows the advance action directly and hides exceptions behind a menu', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        movement={makeMovement({ allowedActions: [advance, cancel] })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Loaded onto the flight' })).toBeInTheDocument();
    // Destructive action must not sit next to the normal next step.
    expect(screen.queryByRole('button', { name: 'Cancelled' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /More actions/i })).toBeInTheDocument();
  });

  // The backend returns 403 unless restricted_items.override is also granted,
  // so an action the user cannot complete must never be offered.
  it('hides the restricted-item override without the extra capability', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        canOverrideRestriction={false}
        movement={makeMovement({ allowedActions: [advance, override] })}
      />,
    );

    // Filtering the override out leaves only the advance action, so the
    // exceptions menu has nothing to show and is not rendered.
    expect(screen.queryByRole('button', { name: /More actions/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Restriction override approved')).not.toBeInTheDocument();
  });

  it('offers the restricted-item override when both capabilities are granted', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        canOverrideRestriction
        movement={makeMovement({ allowedActions: [advance, override] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /More actions/i }));
    expect(screen.getByText('Restriction override approved')).toBeInTheDocument();
  });

  it('hides every action from a user without batches.manage', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        canManage={false}
        movement={makeMovement({ allowedActions: [advance, cancel] })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Loaded onto the flight' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions/i })).not.toBeInTheDocument();
    // Reading the stage stays available to staff.
    expect(screen.getAllByText('At the airport').length).toBeGreaterThan(0);
  });

  // Cancellation is permanent and has no undo route on the backend.
  it('blocks a permanent action until the tracking number is typed exactly', () => {
    const onConfirmAction = vi.fn();
    render(
      <BatchMovementPanel
        {...baseProps}
        onConfirmAction={onConfirmAction}
        movement={makeMovement({ allowedActions: [advance, cancel] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /More actions/i }));
    fireEvent.click(screen.getByText('Cancelled'));

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: 'AIR-20260727-000' },
    });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: 'AIR-20260727-0001' },
    });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirmAction).toHaveBeenCalledWith(expect.objectContaining({ statusV2: 'CANCELLED' }));
  });

  it('does not require typing for a normal advance', () => {
    const onConfirmAction = vi.fn();
    render(
      <BatchMovementPanel
        {...baseProps}
        onConfirmAction={onConfirmAction}
        movement={makeMovement({ allowedActions: [advance] })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Loaded onto the flight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ statusV2: 'BOARDED_ON_FLIGHT' }),
    );
  });

  it('says where an on-hold batch will resume', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        movement={makeMovement({
          currentStatus: 'ON_HOLD',
          currentStatusLabel: 'On hold',
          heldFromStatus: 'AT_ORIGIN_AIRPORT',
        })}
      />,
    );

    expect(screen.getByText(/Moving it on will resume/i)).toBeInTheDocument();
    expect(screen.getByText('AT_ORIGIN_AIRPORT')).toBeInTheDocument();
  });

  it('states plainly that a cancelled batch cannot move again', () => {
    render(
      <BatchMovementPanel
        {...baseProps}
        movement={makeMovement({
          currentStatus: 'CANCELLED',
          currentStatusLabel: 'Cancelled',
          allowedActions: [],
        })}
      />,
    );

    // The banner states it is final; the action area explains why nothing is
    // offered. Both are expected, so assert on each specifically.
    expect(screen.getByText(/this is\s+final/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reached a final state and cannot be moved/i),
    ).toBeInTheDocument();
  });

  it('offers a retry when the history fails to load', () => {
    const onRetryHistory = vi.fn();
    render(
      <BatchMovementPanel
        {...baseProps}
        history={undefined}
        historyError={new Error('boom')}
        onRetryHistory={onRetryHistory}
        movement={makeMovement()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryHistory).toHaveBeenCalledTimes(1);
  });
});
