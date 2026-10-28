import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvExport,
  Data,
  dayKey,
  defaultTargets,
  emptyData,
  Entry,
  parseBackup,
  shiftDay,
  totals,
} from "../src/model";
import { calculateStreak, daysBetween, streakDayStatus } from "../src/streak";
import {
  applyMigration,
  applySeed,
  migrationTemplate,
  parseMigration,
  validateSeed,
} from "../src/migration";
import { nutritionFromText, parseNutritionText } from "../src/nutrition-text";

const profile = {
  id: "p1",
  name: "Alex",
  createdAt: "2026-10-01T12:00:00.000Z",
  targets: { ...defaultTargets },
  routine: ["Walk"],
  reminder: {
    enabled: false,
    frequency: "weekly" as const,
    hour: 9,
    minute: 0,
  },
};
const base = {
  profileId: "p1",
  date: "2026-10-27",
  createdAt: "2026-10-27T12:00:00.000Z",
};
const food: Entry = {
  ...base,
  id: "f1",
  kind: "food",
  name: "Lunch",
  meal: "Lunch",
  nutrients: { calories: 550, protein: 25, carbs: 60, fiber: 8, fat: 20 },
};
function data(): Data {
  return {
    version: 1,
    activeProfileId: "p1",
    profiles: [structuredClone(profile)],
    entries: [structuredClone(food)],
  };
}

test("compact nutrition format maps all units, keeping fat and fiber separate", () => {
  assert.deepEqual(nutritionFromText("100k|20P|30C|15F|5Fi"), {
    calories: 100,
    protein: 20,
    carbs: 30,
    fat: 15,
    fiber: 5,
  });
  assert.deepEqual(parseNutritionText("5Fi"), { fiber: 5 });
  assert.deepEqual(parseNutritionText("15F"), { fat: 15 });
});
test("nutrition tokens can appear in prose, in any order and case, with decimals", () => {
  assert.deepEqual(
    parseNutritionText(
      "Breakfast: oats (5fi | 100K), yogurt 20.5 p and berries 30 C. Fat: .5f.",
    ),
    { fiber: 5, calories: 100, protein: 20.5, carbs: 30, fat: 0.5 },
  );
  assert.deepEqual(parseNutritionText("12,5P | 0F | 0.25Fi"), {
    protein: 12.5,
    fat: 0,
    fiber: 0.25,
  });
  assert.deepEqual(parseNutritionText("Toast 100k 5P. Yogurt 150k 10P."), {
    calories: 250,
    protein: 15,
  });
});
test("missing and invalid nutrition tokens are ignored without reusing manual values", () => {
  assert.deepEqual(nutritionFromText("Yogurt: 20P and no other values"), {
    calories: 0,
    protein: 20,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });
  assert.deepEqual(
    parseNutritionText(
      "unknown text | 100kcal | 5Fiber | -20P | - 15C | NaNF | 1e3P | meal20P | 1.2.3F | 1000001k | −5Fi",
    ),
    {},
  );
  assert.deepEqual(nutritionFromText(""), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });
});
test("compact text survives backup and CSV round-trips without affecting old entries", () => {
  const d = data();
  const entry = d.entries[0];
  if (entry.kind !== "food") throw new Error("Expected a food entry");
  entry.nutritionText = "Lunch: 100k|20P|30C|15F|5Fi";
  entry.nutrients = nutritionFromText(entry.nutritionText);
  assert.deepEqual(parseBackup(JSON.stringify(d)), d);
  assert.ok(csvExport(d).includes('"Lunch: 100k|20P|30C|15F|5Fi"'));
  assert.deepEqual(parseBackup(JSON.stringify(data())), data());
  entry.nutritionText = "a".repeat(2001);
  assert.throws(() => parseBackup(JSON.stringify(d)));
});

test("budgets include food, water, movement without adding exercise calories", () => {
  const entries: Entry[] = [
    food,
    { ...food, id: "f2" },
    { ...base, id: "w", kind: "water", amount: 500 },
    { ...base, id: "e", kind: "exercise", name: "Walk", minutes: 30 },
    { ...base, id: "m", kind: "measurement", weight: 75, note: "" },
  ];
  assert.deepEqual(totals(entries), {
    calories: 1100,
    protein: 50,
    carbs: 120,
    fiber: 16,
    fat: 40,
    water: 500,
    exercise: 30,
  });
  assert.equal(defaultTargets.calories - totals(entries).calories, 900);
});
test("empty journal has zero totals", () => {
  assert.equal(totals([]).calories, 0);
  assert.equal(totals([]).water, 0);
});
test("local date navigation crosses month, year and leap boundaries", () => {
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDay("2026-10-31", 1), "2026-11-01");
  assert.equal(dayKey(new Date(2026, 9, 27, 23, 59)), "2026-10-27");
});
test("full backup preserves profiles, goals, routines, and all entry kinds", () => {
  const d = data();
  d.entries.push(
    { ...base, id: "w", kind: "water", amount: 500 },
    { ...base, id: "e", kind: "exercise", name: "Walk", minutes: 30 },
    {
      ...base,
      id: "m",
      kind: "measurement",
      weight: 75,
      waist: 80,
      note: "Feeling good",
    },
  );
  assert.deepEqual(parseBackup(JSON.stringify(d)), d);
  assert.deepEqual(parseBackup(JSON.stringify(emptyData())), emptyData());
});
test("malformed and unsupported backups are rejected", () => {
  for (const raw of [
    "{",
    "null",
    "{}",
    "[]",
    JSON.stringify({ ...data(), version: 2 }),
  ])
    assert.throws(() => parseBackup(raw));
});
test("backup cannot contain orphaned entries, duplicate IDs, invalid dates, or negative nutrients", () => {
  const variants: Data[] = [];
  let d = data();
  d.entries[0].profileId = "missing";
  variants.push(d);
  d = data();
  d.entries.push({ ...food });
  variants.push(d);
  d = data();
  d.profiles.push({ ...profile });
  variants.push(d);
  d = data();
  d.entries[0].date = "2026-02-30";
  variants.push(d);
  d = data();
  (d.entries[0] as typeof food).nutrients.calories = -1;
  variants.push(d);
  d = data();
  d.profiles[0].targets.water = 0;
  variants.push(d);
  d = data();
  d.profiles[0].reminder.hour = 25;
  variants.push(d);
  d = data();
  d.activeProfileId = "missing";
  variants.push(d);
  for (const invalid of variants)
    assert.throws(() => parseBackup(JSON.stringify(invalid)));
});
test("CSV escapes quotes, newlines, and spreadsheet formulas", () => {
  const d = data();
  d.profiles[0].name = "=SUM(A1)";
  (d.entries[0] as typeof food).name = 'Rice, "beans"\nand salad';
  const csv = csvExport(d);
  assert.ok(csv.includes('"\'=SUM(A1)"'));
  assert.ok(csv.includes('"Rice, ""beans""\nand salad"'));
  assert.ok(csv.includes('"550","25","60","8","20"'));
});

function logs(...dates: string[]): Entry[] {
  return dates.map((date, i) => ({
    ...base,
    date,
    id: `water-${i}`,
    kind: "water",
    amount: 250,
  }));
}
test("one flame per date regardless of entry count or kind, scoped to profile", () => {
  const s = calculateStreak(
    profile,
    [
      ...logs("2026-10-26", "2026-10-27", "2026-10-27"),
      { ...food, profileId: "other" },
      ...logs("2026-10-28"),
    ],
    "2026-10-27",
  );
  assert.equal(s.current, 2);
  assert.equal(s.freezesRemaining, 2);
  assert.equal(s.todayLogged, true);
  assert.equal(calculateStreak(profile, [], "2026-10-27").current, 0);
});
test("two consecutive missed days freeze; today remains open", () => {
  const s = calculateStreak(profile, logs("2026-10-24"), "2026-10-27");
  assert.equal(s.current, 1);
  assert.equal(s.freezesRemaining, 0);
  assert.equal(s.todayLogged, false);
  assert.deepEqual([...s.frozenDates], ["2026-10-25", "2026-10-26"]);
  const continued = calculateStreak(
    profile,
    logs("2026-10-24", "2026-10-27"),
    "2026-10-27",
  );
  assert.equal(continued.current, 2);
  assert.equal(continued.freezesRemaining, 0);
});
test("third completed missed day breaks streak, next entry starts with fresh freezes", () => {
  const broken = calculateStreak(
    profile,
    logs("2026-10-23", "2026-10-24"),
    "2026-10-28",
  );
  assert.equal(broken.current, 0);
  assert.equal(broken.best, 2);
  assert.equal(broken.freezesRemaining, 2);
  const reset = calculateStreak(
    profile,
    logs("2026-10-23", "2026-10-24", "2026-10-28"),
    "2026-10-28",
  );
  assert.equal(reset.current, 1);
  assert.equal(reset.best, 2);
  assert.equal(reset.freezesRemaining, 2);
});
test("freezes are two total per streak, not two per gap", () => {
  const s = calculateStreak(
    profile,
    logs("2026-10-20", "2026-10-22", "2026-10-24", "2026-10-26"),
    "2026-10-26",
  );
  assert.equal(s.current, 1);
  assert.equal(s.best, 3);
  assert.equal(s.freezesRemaining, 2);
});
test("backfilling and deleting entries recalculates protection deterministically", () => {
  assert.equal(
    calculateStreak(profile, logs("2026-10-20", "2026-10-24"), "2026-10-24")
      .current,
    1,
  );
  assert.equal(
    calculateStreak(
      profile,
      logs("2026-10-20", "2026-10-22", "2026-10-24"),
      "2026-10-24",
    ).current,
    3,
  );
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2);
});
test("streak-only import carries a count without fabricating nutrition or daily history", () => {
  const p = applySeed(
    profile,
    validateSeed("120", "2026-10-26", "Yazio", "2026-10-27"),
  );
  const s = calculateStreak(p, logs("2026-10-26", "2026-10-27"), "2026-10-27");
  assert.equal(s.current, 121);
  assert.equal(s.best, 121);
  assert.equal(streakDayStatus(s, "2026-10-25"), "missed");
  assert.equal(
    streakDayStatus(calculateStreak(p, [], "2026-10-27"), "2026-10-26"),
    "imported",
  );
  const today = applySeed(
    profile,
    validateSeed("120", "2026-10-27", "Yazio", "2026-10-27"),
  );
  assert.equal(
    calculateStreak(today, logs("2026-10-27"), "2026-10-27").current,
    120,
  );
  assert.equal(calculateStreak(today, [], "2026-10-27").todayLogged, true);
});
test("old carried streaks use freezes and can expire; invalid seeds are rejected", () => {
  const p = applySeed(
    profile,
    validateSeed("120", "2026-10-24", "Yazio", "2026-10-27"),
  );
  assert.equal(calculateStreak(p, [], "2026-10-27").freezesRemaining, 0);
  assert.equal(calculateStreak(p, [], "2026-10-28").current, 0);
  for (const n of ["0", "-1", "1.5", "Infinity", ""])
    assert.throws(() => validateSeed(n, "2026-10-26", "Yazio", "2026-10-27"));
  assert.throws(() => validateSeed("2", "2026-02-30", "Yazio", "2026-10-27"));
  assert.throws(() => validateSeed("2", "2026-10-28", "Yazio", "2026-10-27"));
});
test("CSV and JSON migrations preserve daily budgets, balance and all nutrients", () => {
  const csv = parseMigration("\uFEFF" + migrationTemplate, "2026-10-27");
  const json = parseMigration(
    JSON.stringify({
      days: [
        {
          date: "2026-01-01",
          calories_consumed: 1750,
          calorie_budget: 2000,
          protein_g: 110,
          carbs_g: 200,
          fiber_g: 28,
          fat_g: 55,
          calories_remaining: 250,
        },
      ],
    }),
    "2026-10-27",
  );
  assert.deepEqual(csv, json);
  const migrated = applyMigration(
    { ...data(), entries: [] },
    profile.id,
    csv,
    "Yazio",
  );
  assert.equal(migrated.entries.length, 1);
  assert.deepEqual(totals(migrated.entries), {
    calories: 1750,
    protein: 110,
    carbs: 200,
    fiber: 28,
    fat: 55,
    water: 0,
    exercise: 0,
  });
  const saved = parseBackup(JSON.stringify(migrated));
  assert.deepEqual(saved, migrated);
  assert.ok(csvExport(saved).includes('"2000","250","Yazio"'));
});
test("migration retries update matching imports; overlapping local food is never double counted", () => {
  const days = parseMigration(migrationTemplate, "2026-10-27");
  const migrated = applyMigration(
    { ...data(), entries: [] },
    profile.id,
    days,
    "Yazio",
  );
  const again = applyMigration(migrated, profile.id, days, "Yazio");
  assert.equal(again.entries.length, 1);
  const conflicting = { ...data(), entries: [{ ...food, date: days[0].date }] };
  assert.throws(
    () => applyMigration(conflicting, profile.id, days, "Yazio"),
    /already food logged/,
  );
  assert.equal(conflicting.entries.length, 1);
});
test("invalid daily migrations fail before making changes", () => {
  const valid = {
    date: "2026-10-26",
    calories_consumed: 2100,
    calorie_budget: 2000,
    protein_g: 110,
    carbs_g: 200,
    fiber_g: 28,
    fat_g: 55,
    calories_remaining: -100,
  };
  assert.equal(
    parseMigration(JSON.stringify([valid]), "2026-10-27")[0].nutrients.calories,
    2100,
  );
  for (const rows of [
    [{ ...valid, calories_remaining: 100 }],
    [{ ...valid, protein_g: -1 }],
    [{ ...valid, date: "2026-02-30" }],
    [{ ...valid, date: "2026-10-28" }],
    [{ ...valid, fiber_g: null }],
    [valid, valid],
    [],
  ])
    assert.throws(() => parseMigration(JSON.stringify(rows), "2026-10-27"));
  assert.throws(() => parseMigration("date,calories\n2026-10-26,100"));
  assert.throws(() => parseMigration(migrationTemplate + "2026-01-02,100"));
});
test("old backups remain readable, and new streak fields round-trip with validation", () => {
  assert.deepEqual(parseBackup(JSON.stringify(data())), data());
  const d = data();
  d.profiles[0] = {
    ...profile,
    streak: {
      seed: { days: 120, lastDate: "2026-10-26", source: "Yazio" },
      celebratedDates: ["2026-10-27"],
    },
  };
  assert.deepEqual(parseBackup(JSON.stringify(d)), d);
  const invalid = structuredClone(d);
  invalid.profiles[0].streak!.seed!.days = -3;
  assert.throws(() => parseBackup(JSON.stringify(invalid)));
});
