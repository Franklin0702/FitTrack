export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  fat: number;
};
export type Targets = Nutrients & {
  water: number;
  exercise: number;
  weight: number;
};
export type Reminder = {
  enabled: boolean;
  frequency: "daily" | "weekly";
  hour: number;
  minute: number;
};
export type Profile = {
  id: string;
  name: string;
  createdAt: string;
  targets: Targets;
  routine: string[];
  reminder: Reminder;
  streak?: {
    seed?: { days: number; lastDate: string; source: string };
    celebratedDates?: string[];
  };
};
export type Entry = {
  id: string;
  profileId: string;
  date: string;
  createdAt: string;
} & (
  | {
      kind: "food";
      name: string;
      meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
      nutrients: Nutrients;
      nutritionText?: string;
      migration?: { source: string; calorieBudget: number };
    }
  | { kind: "water"; amount: number }
  | { kind: "exercise"; name: string; minutes: number }
  | { kind: "measurement"; weight: number; waist?: number; note: string }
);
export type Data = {
  version: 1;
  activeProfileId: string | null;
  profiles: Profile[];
  entries: Entry[];
};
export const emptyData = (): Data => ({
  version: 1,
  activeProfileId: null,
  profiles: [],
  entries: [],
});
export const defaultTargets: Targets = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fiber: 30,
  fat: 65,
  water: 2500,
  exercise: 30,
  weight: 70,
};
export const nutrientKeys = ["protein", "carbs", "fiber", "fat"] as const;
export function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDay(date: string, offset: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}
export function dayLabel(date: string): string {
  if (date === dayKey()) return "Today";
  if (date === shiftDay(dayKey(), -1)) return "Yesterday";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
export function totals(entries: Entry[]) {
  const result = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fiber: 0,
    fat: 0,
    water: 0,
    exercise: 0,
  };
  for (const entry of entries) {
    if (entry.kind === "food")
      for (const key of ["calories", ...nutrientKeys] as const)
        result[key] += entry.nutrients[key];
    if (entry.kind === "water") result.water += entry.amount;
    if (entry.kind === "exercise") result.exercise += entry.minutes;
  }
  return result;
}
const isObject = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, min = 0, max = 1000000): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const text = (v: unknown, max = 500): v is string =>
  typeof v === "string" && v.length <= max;
export const isDay = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  dayKey(new Date(`${v}T12:00:00`)) === v;
export function parseBackup(raw: string, maxLength = 25_000_000): Data {
  if (raw.length > maxLength)
    throw new Error("This backup is too large (maximum 25 MB).");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON. Choose a Fit Track backup.");
  }
  const fail = () => {
    throw new Error(
      "This is not a valid Fit Track version 1 backup. Your existing data has not changed.",
    );
  };
  if (
    !isObject(data) ||
    data.version !== 1 ||
    !Array.isArray(data.profiles) ||
    !Array.isArray(data.entries)
  )
    return fail();
  const ids = new Set<string>();
  for (const p of data.profiles) {
    if (
      !isObject(p) ||
      !text(p.id, 100) ||
      !p.id ||
      ids.has(p.id) ||
      !text(p.name, 60) ||
      !p.name.trim() ||
      !text(p.createdAt, 50) ||
      !Number.isFinite(Date.parse(p.createdAt)) ||
      !isObject(p.targets)
    )
      return fail();
    ids.add(p.id);
    for (const key of Object.keys(defaultTargets))
      if (!number(p.targets[key], 0.1)) return fail();
    if (
      !Array.isArray(p.routine) ||
      p.routine.length > 100 ||
      !p.routine.every((r: unknown) => text(r, 100))
    )
      return fail();
    const r = p.reminder;
    if (p.streak !== undefined) {
      if (!isObject(p.streak)) return fail();
      const seed = p.streak.seed;
      if (
        seed !== undefined &&
        (!isObject(seed) ||
          !number(seed.days, 1) ||
          !Number.isInteger(seed.days) ||
          !isDay(seed.lastDate) ||
          !text(seed.source, 60) ||
          !seed.source.trim())
      )
        return fail();
      const dates = p.streak.celebratedDates;
      if (
        dates !== undefined &&
        (!Array.isArray(dates) ||
          !dates.every(isDay) ||
          new Set(dates).size !== dates.length)
      )
        return fail();
    }
    if (
      !isObject(r) ||
      typeof r.enabled !== "boolean" ||
      !["daily", "weekly"].includes(r.frequency) ||
      !number(r.hour, 0, 23) ||
      !Number.isInteger(r.hour) ||
      !number(r.minute, 0, 59) ||
      !Number.isInteger(r.minute)
    )
      return fail();
  }
  if (data.activeProfileId !== null && !ids.has(data.activeProfileId))
    return fail();
  const entryIds = new Set<string>();
  for (const e of data.entries) {
    if (
      !isObject(e) ||
      !text(e.id, 100) ||
      !e.id ||
      entryIds.has(e.id) ||
      !ids.has(e.profileId) ||
      !isDay(e.date) ||
      !text(e.createdAt, 50) ||
      !Number.isFinite(Date.parse(e.createdAt))
    )
      return fail();
    entryIds.add(e.id);
    if (e.kind === "food") {
      if (
        !text(e.name, 100) ||
        !e.name.trim() ||
        !["Breakfast", "Lunch", "Dinner", "Snack"].includes(e.meal) ||
        !isObject(e.nutrients)
      )
        return fail();
      for (const key of ["calories", ...nutrientKeys])
        if (!number(e.nutrients[key])) return fail();
      if (e.nutritionText !== undefined && !text(e.nutritionText, 2000))
        return fail();
      if (
        e.migration !== undefined &&
        (!isObject(e.migration) ||
          !text(e.migration.source, 60) ||
          !e.migration.source.trim() ||
          !number(e.migration.calorieBudget, 0.1))
      )
        return fail();
    } else if (e.kind === "water") {
      if (!number(e.amount, 1)) return fail();
    } else if (e.kind === "exercise") {
      if (!text(e.name, 100) || !e.name.trim() || !number(e.minutes, 1, 1440))
        return fail();
    } else if (e.kind === "measurement") {
      if (
        !number(e.weight, 0.1, 1000) ||
        (e.waist !== undefined && !number(e.waist, 0.1, 1000)) ||
        !text(e.note)
      )
        return fail();
    } else return fail();
  }
  return data as Data;
}
export function calorieBudget(profile: Profile, entries: Entry[]): number {
  const imported = entries.find((e) => e.kind === "food" && e.migration);
  return imported?.kind === "food"
    ? imported.migration!.calorieBudget
    : profile.targets.calories;
}
export function csvExport(data: Data): string {
  const rows: (string | number)[][] = [
    [
      "profile",
      "date",
      "type",
      "description",
      "meal",
      "calories_kcal",
      "protein_g",
      "carbs_g",
      "fiber_g",
      "fat_g",
      "water_ml",
      "exercise_minutes",
      "weight_kg",
      "waist_cm",
      "note",
      "calorie_budget_kcal",
      "calories_remaining_kcal",
      "import_source",
      "nutrition_text",
    ],
  ];
  for (const e of data.entries) {
    const food = e.kind === "food" ? e : undefined;
    rows.push([
      data.profiles.find((p) => p.id === e.profileId)?.name ?? "",
      e.date,
      e.kind,
      "name" in e ? e.name : "",
      food?.meal ?? "",
      food?.nutrients.calories ?? "",
      food?.nutrients.protein ?? "",
      food?.nutrients.carbs ?? "",
      food?.nutrients.fiber ?? "",
      food?.nutrients.fat ?? "",
      e.kind === "water" ? e.amount : "",
      e.kind === "exercise" ? e.minutes : "",
      e.kind === "measurement" ? e.weight : "",
      e.kind === "measurement" ? (e.waist ?? "") : "",
      e.kind === "measurement" ? e.note : "",
      e.kind === "food" && e.migration ? e.migration.calorieBudget : "",
      e.kind === "food" && e.migration
        ? e.migration.calorieBudget - e.nutrients.calories
        : "",
      e.kind === "food" && e.migration ? e.migration.source : "",
      e.kind === "food" ? (e.nutritionText ?? "") : "",
    ]);
  }
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value);
            // Keep user-entered labels from becoming spreadsheet formulas.
            if (typeof value === "string" && /^[=+@\-\t\r]/.test(s))
              s = `'${s}`;
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
