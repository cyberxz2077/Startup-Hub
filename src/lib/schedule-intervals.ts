import { addDays, MINUTE, scheduleDate, slotIso } from "./schedule-time";

export const QUARTER = 15 * MINUTE;
export type Interval = { startsAt: Date; endsAt: Date };

export function nextQuarter(now = new Date()) {
  return new Date((Math.floor(now.getTime() / QUARTER) + 1) * QUARTER);
}

// Keep calendar days separate, including a range ending at 24:00.
export function mergeIntervals(intervals: Interval[]) {
  const result: Interval[] = [];
  for (const current of [...intervals].sort(
    (a, b) => +a.startsAt - +b.startsAt,
  )) {
    const last = result.at(-1);
    if (
      last &&
      current.startsAt <= last.endsAt &&
      scheduleDate(last.startsAt) === scheduleDate(current.startsAt)
    ) {
      last.endsAt = new Date(Math.max(+last.endsAt, +current.endsAt));
    } else result.push({ ...current });
  }
  return result;
}

export function subtractIntervals(interval: Interval, busy: Interval[]) {
  let result = [{ startsAt: interval.startsAt, endsAt: interval.endsAt }];
  for (const block of busy) {
    result = result.flatMap((part) => {
      if (block.startsAt >= part.endsAt || block.endsAt <= part.startsAt)
        return [part];
      const remaining: Interval[] = [];
      if (block.startsAt > part.startsAt)
        remaining.push({ startsAt: part.startsAt, endsAt: block.startsAt });
      if (block.endsAt < part.endsAt)
        remaining.push({ startsAt: block.endsAt, endsAt: part.endsAt });
      return remaining;
    });
  }
  return result;
}

export function freeIntervals(
  interval: Interval,
  busy: Interval[],
  now = new Date(),
) {
  const startsAt = new Date(Math.max(+interval.startsAt, +nextQuarter(now)));
  if (startsAt >= interval.endsAt) return [];
  return subtractIntervals({ startsAt, endsAt: interval.endsAt }, busy).filter(
    (part) => +part.endsAt - +part.startsAt >= QUARTER,
  );
}

export function containsInterval(outer: Interval, inner: Interval) {
  return outer.startsAt <= inner.startsAt && outer.endsAt >= inner.endsAt;
}

export function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function cellTime(index: number) {
  return `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`;
}

export function intervalCells(
  intervals: { startsAt: string; endsAt: string }[],
) {
  const cells = new Set<number>();
  for (const interval of intervals)
    for (
      let t = +new Date(interval.startsAt);
      t < +new Date(interval.endsAt);
      t += QUARTER
    )
      cells.add(t);
  return cells;
}

export function cellsToIntervals(cells: Set<number>) {
  const ranges: Interval[] = [];
  for (const t of [...cells].sort((a, b) => a - b)) {
    const last = ranges.at(-1);
    if (
      last &&
      +last.endsAt === t &&
      scheduleDate(last.startsAt) === scheduleDate(new Date(t))
    )
      last.endsAt = new Date(t + QUARTER);
    else ranges.push({ startsAt: new Date(t), endsAt: new Date(t + QUARTER) });
  }
  return ranges.map((range) => ({
    startsAt: range.startsAt.toISOString(),
    endsAt: range.endsAt.toISOString(),
  }));
}

export function paintCells(
  base: Set<number>,
  dates: string[],
  from: { day: number; row: number },
  to: { day: number; row: number },
  selected: boolean,
  editable: (time: number) => boolean,
) {
  const next = new Set(base);
  for (
    let d = Math.min(from.day, to.day);
    d <= Math.max(from.day, to.day);
    d++
  ) {
    const midnight = +new Date(slotIso(dates[d], "00:00"));
    for (
      let row = Math.min(from.row, to.row);
      row <= Math.max(from.row, to.row);
      row++
    ) {
      const t = midnight + row * QUARTER;
      if (editable(t)) {
        if (selected) next.add(t);
        else next.delete(t);
      }
    }
  }
  return next;
}
