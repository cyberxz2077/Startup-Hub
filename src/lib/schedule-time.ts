export const SCHEDULE_TIME_ZONE = "Asia/Shanghai";
export const DAY = 86_400_000;
export const MINUTE = 60_000;

export function scheduleDate(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function addDays(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY)
    .toISOString()
    .slice(0, 10);
}

export function scheduleBounds(now = new Date()) {
  const today = scheduleDate(now);
  return { min: today, early: addDays(today, 3), max: addDays(today, 30) };
}

export function slotIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

export function scheduleTime(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SCHEDULE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function formatSlot(startsAt: Date | string, endsAt: Date | string) {
  return `${new Intl.DateTimeFormat("zh-CN", {
    timeZone: SCHEDULE_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(
    new Date(startsAt),
  )} ${scheduleTime(startsAt)}–${scheduleTime(endsAt)}`;
}

export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

export function meetingLink(value: string) {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname.includes(".") ||
      /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(
        url.hostname,
      ) ||
      /\.(local|internal)$/i.test(url.hostname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
