export type BusyPeriod = { startAt: Date | string; endAt: Date | string };

export function calculateAppointmentEnd(startAt: Date, durationMinutes: number) {
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

export function periodsOverlap(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function nextAvailableStart(dayStart: Date, durationMinutes: number, periods: BusyPeriod[]) {
  const duration = durationMinutes * 60_000;
  let cursor = dayStart.getTime();
  const sorted = periods
    .map((period) => ({ start: new Date(period.startAt).getTime(), end: new Date(period.endAt).getTime() }))
    .sort((first, second) => first.start - second.start);

  for (const period of sorted) {
    if (cursor + duration <= period.start) return new Date(cursor);
    if (cursor < period.end) cursor = period.end;
  }

  return new Date(cursor);
}
