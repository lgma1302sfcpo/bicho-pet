export const GROOMING_SIMULTANEOUS_CAPACITY = 2;

export type BusyPeriod = {
  startAt: Date | string;
  endAt: Date | string;
  capacityUsed?: number;
};

export function calculateAppointmentEnd(startAt: Date, durationMinutes: number) {
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

export function periodsOverlap(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function hasScheduleCapacity(startAt: Date, endAt: Date, periods: BusyPeriod[], capacity = GROOMING_SIMULTANEOUS_CAPACITY) {
  const start = startAt.getTime();
  const end = endAt.getTime();
  let occupancy = 1;
  const events: Array<{ time: number; change: number }> = [];

  for (const period of periods) {
    const periodStart = new Date(period.startAt).getTime();
    const periodEnd = new Date(period.endAt).getTime();
    if (periodStart >= end || periodEnd <= start) continue;

    const capacityUsed = Math.max(1, period.capacityUsed ?? 1);
    if (periodStart <= start) occupancy += capacityUsed;
    else events.push({ time: periodStart, change: capacityUsed });

    if (periodEnd < end) events.push({ time: periodEnd, change: -capacityUsed });
  }

  if (occupancy > capacity) return false;

  events.sort((first, second) => first.time - second.time || first.change - second.change);
  for (const event of events) {
    occupancy += event.change;
    if (occupancy > capacity) return false;
  }

  return true;
}

export function nextAvailableStart(dayStart: Date, durationMinutes: number, periods: BusyPeriod[], capacity = GROOMING_SIMULTANEOUS_CAPACITY) {
  const duration = durationMinutes * 60_000;
  const candidates = [
    dayStart.getTime(),
    ...periods.map((period) => new Date(period.endAt).getTime()).filter((time) => time >= dayStart.getTime())
  ].sort((first, second) => first - second);

  for (const candidate of [...new Set(candidates)]) {
    const startAt = new Date(candidate);
    if (hasScheduleCapacity(startAt, new Date(candidate + duration), periods, capacity)) return startAt;
  }

  return new Date(Math.max(...candidates));
}
