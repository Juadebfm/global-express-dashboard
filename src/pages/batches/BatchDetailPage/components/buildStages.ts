import type { BatchMovementHistory } from '@/types';

export type StageState = 'done' | 'done-undated' | 'current' | 'upcoming';

export interface Stage {
  statusV2: string;
  label: string;
  description: string;
  state: StageState;
  occurredAt: string | null;
}

/**
 * Merges the backend's ordered flow with the stages it actually recorded.
 *
 * A stage that sits before the current one but has no recorded event happened
 * before the backend started keeping history. It is shown as complete with no
 * date rather than inventing one.
 *
 * An exception status (on hold, cancelled, rejected, override approved) is not
 * part of the normal flow, so no stage matches it and none is marked current.
 */
export function buildStages(
  history: BatchMovementHistory,
  currentStatus: string | null,
): Stage[] {
  const eventByStatus = new Map(history.events.map((e) => [e.statusV2, e]));
  const currentIndex = currentStatus
    ? history.flow.findIndex((s) => s.statusV2 === currentStatus)
    : -1;

  return history.flow.map((stage, index) => {
    const event = eventByStatus.get(stage.statusV2);
    let state: StageState;

    if (currentIndex >= 0 && index === currentIndex) {
      state = 'current';
    } else if (currentIndex >= 0 && index < currentIndex) {
      state = event ? 'done' : 'done-undated';
    } else if (event) {
      state = 'done';
    } else {
      state = 'upcoming';
    }

    return {
      statusV2: stage.statusV2,
      label: stage.label,
      description: stage.description,
      state,
      occurredAt: event?.occurredAt ?? null,
    };
  });
}
