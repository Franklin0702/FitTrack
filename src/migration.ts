import { Data, dayKey, Entry, id, isDay, Nutrients, Profile } from "./model";

export type MigrationDay = {
  date: string;
  nutrients: Nutrients;
  calorieBudget: number;
};
export const migrationColumns = [
  "date",
  "calories_consumed",
  "calorie_budget",
  "protein_g",
  "carbs_g",
  "fiber_g",
  "fat_g",
] as const;
export const migrationTemplate = `${migrationColumns.join(",")},calories_remaining\n2026-01-01,1750,2000,110,200,28,55,250\n`;

function csvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length)
        throw new Error(
          "Unexpected quote in CSV. Use the downloaded template.",
        );
      else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (c !== ",") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (c === "\r" && raw[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quote.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseMigration(raw: string, today = dayKey()): MigrationDay[] {
  if (raw.length > 25_000_000)
    throw new Error("Choose a migration file smaller than 25 MB.");
  raw = raw.replace(/^\uFEFF/, "").trim();
  let records: unknown;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      records = Array.isArray(parsed) ? parsed : parsed.days;
    } catch {
      throw new Error(
        "Invalid JSON. Use an array of daily totals or an object with a days array.",
      );
    }
  } else {
    const [headers, ...rows] = csvRows(raw);
    if (
      !headers ||
      new Set(headers).size !== headers.length ||
      !migrationColumns.every((c) => headers.includes(c))
    )
      throw new Error(
        `Use these CSV columns: ${migrationColumns.join(", ")}. Download the template to get started.`,
      );
    records = rows.map((row, i) => {
      if (row.length !== headers.length)
        throw new Error(
          `Row ${i + 2} has a different number of columns from the header.`,
        );
      return Object.fromEntries(headers.map((h, index) => [h, row[index]]));
    });
  }
  if (!Array.isArray(records) || !records.length || records.length > 100000)
    throw new Error(
      "The file must contain between 1 and 100,000 daily totals.",
    );
  const dates = new Set<string>();
  const result = records.map((record: unknown, i) => {
    if (!record || typeof record !== "object" || Array.isArray(record))
      throw new Error(`Day ${i + 1} is invalid.`);
    const r = record as Record<string, unknown>;
    if (!isDay(r.date) || r.date > today)
      throw new Error(
        `Day ${i + 1}: use a real YYYY-MM-DD date, no later than today.`,
      );
    if (dates.has(r.date))
      throw new Error(
        `There are two rows for ${r.date}. Combine them into one daily total.`,
      );
    dates.add(r.date);
    const num = (key: string, min = 0) => {
      const value = r[key];
      if (
        (typeof value !== "string" && typeof value !== "number") ||
        String(value).trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < min ||
        Number(value) > 1000000
      )
        throw new Error(
          `${r.date}: ${key} must be a number between ${min} and 1000000.`,
        );
      return Number(value);
    };
    const calories = num("calories_consumed"),
      budget = num("calorie_budget", 0.1);
    if (r.calories_remaining !== undefined && r.calories_remaining !== "") {
      const remaining = Number(r.calories_remaining);
      if (
        !["string", "number"].includes(typeof r.calories_remaining) ||
        !Number.isFinite(remaining) ||
        Math.abs(remaining - (budget - calories)) > 0.1
      )
        throw new Error(
          `${r.date}: calories_remaining must equal calorie_budget minus calories_consumed.`,
        );
    }
    return {
      date: r.date,
      calorieBudget: budget,
      nutrients: {
        calories,
        protein: num("protein_g"),
        carbs: num("carbs_g"),
        fiber: num("fiber_g"),
        fat: num("fat_g"),
      },
    };
  });
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function validateSeed(
  days: string,
  lastDate: string,
  source: string,
  today = dayKey(),
) {
  const n = Number(days);
  if (!Number.isInteger(n) || n < 1 || n > 1000000)
    throw new Error("Enter a whole streak count from 1 to 1,000,000.");
  if (!isDay(lastDate) || lastDate > today)
    throw new Error(
      "Use a real last logged date (YYYY-MM-DD), no later than today.",
    );
  if (!source.trim() || source.trim().length > 60)
    throw new Error("Enter an app name of up to 60 characters.");
  return { days: n, lastDate, source: source.trim() };
}
export function applyMigration(
  data: Data,
  profileId: string,
  days: MigrationDay[],
  source: string,
): Data {
  if (!source.trim() || source.trim().length > 60)
    throw new Error("Enter an app name of up to 60 characters.");
  if (!data.profiles.some((p) => p.id === profileId))
    throw new Error("This profile no longer exists.");
  const dates = new Set(days.map((d) => d.date));
  const conflicts = data.entries.filter(
    (e) =>
      e.profileId === profileId &&
      dates.has(e.date) &&
      e.kind === "food" &&
      (!e.migration || e.migration.source !== source.trim()),
  );
  if (conflicts.length)
    throw new Error(
      `There is already food logged on ${conflicts[0].date}. Import into a new profile or remove overlapping food entries first so calories are not counted twice.`,
    );
  const imported: Entry[] = days.map((d) => ({
    id: id(),
    profileId,
    date: d.date,
    createdAt: new Date().toISOString(),
    kind: "food",
    name: `${source.trim()} · daily totals`,
    meal: "Snack",
    nutrients: d.nutrients,
    migration: { source: source.trim(), calorieBudget: d.calorieBudget },
  }));
  return {
    ...data,
    entries: [
      ...data.entries.filter(
        (e) =>
          !(
            e.profileId === profileId &&
            dates.has(e.date) &&
            e.kind === "food" &&
            e.migration?.source === source.trim()
          ),
      ),
      ...imported,
    ],
  };
}
export function applySeed(
  profile: Profile,
  seed: NonNullable<NonNullable<Profile["streak"]>["seed"]>,
): Profile {
  return { ...profile, streak: { ...profile.streak, seed } };
}
