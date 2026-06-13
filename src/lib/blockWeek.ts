/**
 * Current training week within a block, derived from its start date.
 * 1-based and capped at total_weeks. Shared by Home and Today so they never
 * disagree about "what week am I on".
 */
export function getBlockWeek(startDate: string, totalWeeks: number): number {
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000);
  return Math.max(1, Math.min(totalWeeks, Math.floor(days / 7) + 1));
}
