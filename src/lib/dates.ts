export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(): Date {
  const d = startOfToday();
  // Treat Monday as the start of the week
  const day = d.getDay(); // 0 = Sunday
  const offset = (day + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
