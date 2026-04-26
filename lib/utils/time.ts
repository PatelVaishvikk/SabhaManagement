export function addSecondsToTime(time: string, seconds: number) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0));
  date.setUTCSeconds(date.getUTCSeconds() + Math.max(0, seconds));
  return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
}

export function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function detectTimeConflicts(items: { scheduledStart: string; scheduledEnd: string }[]) {
  return items
    .map((item, index) => ({ ...item, index, start: timeToMinutes(item.scheduledStart), end: timeToMinutes(item.scheduledEnd) }))
    .filter((item) => item.end > item.start)
    .some((item, _, all) => all.some((other) => other.index !== item.index && item.start < other.end && other.start < item.end));
}
