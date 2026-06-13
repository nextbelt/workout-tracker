import type { DayTemplate } from '../types/database';

/** Human-readable labels for every day template across all split types. */
export const DAY_LABELS: Record<DayTemplate, string> = {
  upper_a: 'Upper A', lower_a: 'Lower A', upper_b: 'Upper B', lower_b: 'Lower B',
  push_a: 'Push A', pull_a: 'Pull A', legs_a: 'Legs A',
  push_b: 'Push B', pull_b: 'Pull B', legs_b: 'Legs B',
  full_a: 'Full Body A', full_b: 'Full Body B', full_c: 'Full Body C',
};

/** Safe lookup that falls back to a title-cased version of the raw key. */
export function dayLabel(template: string): string {
  return (DAY_LABELS as Record<string, string>)[template]
    ?? template.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
