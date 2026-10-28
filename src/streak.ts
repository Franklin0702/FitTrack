import { dayKey, Entry, Profile, shiftDay } from "./model";

export const FREEZES = 2;
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  );
}
export type Streak = {
  current: number;
  best: number;
  freezesRemaining: number;
  frozenDates: Set<string>;
  loggedDates: Set<string>;
  todayLogged: boolean;
  lastDate: string | undefined;
  seed: NonNullable<Profile["streak"]>["seed"];
  today: string;
};
export function calculateStreak(
  profile: Profile,
  entries: Entry[],
  today = dayKey(),
): Streak {
  const loggedDates = new Set(
    entries
      .filter((e) => e.profileId === profile.id && e.date <= today)
      .map((e) => e.date),
  );
  const seed =
    profile.streak?.seed && profile.streak.seed.lastDate <= today
      ? profile.streak.seed
      : undefined;
  const dates = [...loggedDates]
    .filter((d) => !seed || d > seed.lastDate)
    .sort();
  const frozenDates = new Set<string>();
  let count = seed?.days ?? 0,
    best = seed
      ? Math.max(
          count,
          calculateStreak(
            { ...profile, streak: undefined },
            entries,
            seed.lastDate,
          ).best,
        )
      : count,
    used = 0,
    last = seed?.lastDate;
  const bridge = (missing: number) => {
    const available = FREEZES - used;
    for (let i = 1; i <= Math.min(missing, available); i++)
      frozenDates.add(shiftDay(last!, i));
    if (missing > available) {
      count = 0;
      used = 0;
    } else used += missing;
  };
  for (const d of dates) {
    if (last) bridge(Math.max(0, daysBetween(last, d) - 1));
    count++;
    best = Math.max(best, count);
    last = d;
  }
  // Today is still open. Only completed missed days use a freeze.
  if (last) bridge(Math.max(0, daysBetween(last, today) - 1));
  return {
    current: count,
    best,
    freezesRemaining: FREEZES - used,
    frozenDates,
    loggedDates,
    todayLogged: loggedDates.has(today) || seed?.lastDate === today,
    lastDate: last,
    seed,
    today,
  };
}
export function streakDayStatus(
  streak: Streak,
  date: string,
): "logged" | "frozen" | "imported" | "pending" | "missed" | "future" {
  if (date > streak.today) return "future";
  if (streak.loggedDates.has(date)) return "logged";
  if (streak.frozenDates.has(date)) return "frozen";
  if (streak.seed && date === streak.seed.lastDate) return "imported";
  return date === streak.today ? "pending" : "missed";
}
