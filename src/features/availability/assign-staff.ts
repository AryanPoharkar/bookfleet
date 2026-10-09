export function rankStaff(candidates: { staffId: string; bookingsOnDay: number }[]): string[] {
  return candidates
    .map((candidate, index) => ({ ...candidate, index }))
    .sort((a, b) => a.bookingsOnDay - b.bookingsOnDay || a.index - b.index)
    .map((candidate) => candidate.staffId);
}
