import React, { useState } from "react";
import { Text, View } from "react-native";
import { Data, dayKey, Profile, shiftDay } from "./model";
import {
  applyMigration,
  MigrationDay,
  migrationTemplate,
  parseMigration,
  validateSeed,
} from "./migration";
import { calculateStreak } from "./streak";
import { exportFile, pickBackup } from "./transfer";
import { Button, C, Card, Chip, Field, Heading, Muted, s, Sheet } from "./ui";

export type Migration =
  | { kind: "full"; source: string; days: MigrationDay[] }
  | { kind: "seed"; seed: { days: number; lastDate: string; source: string } };
export function MigrationForm({
  profile,
  data,
  onSave,
  onClose,
}: {
  profile: Profile;
  data: Data;
  onSave: (migration: Migration) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"full" | "seed">("seed");
  const [source, setSource] = useState("Yazio"),
    [count, setCount] = useState("");
  const [lastDate, setLastDate] = useState(shiftDay(dayKey(), -1));
  const [days, setDays] = useState<MigrationDay[] | null>(null);
  const [review, setReview] = useState<Migration | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const report = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Could not read this file.");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const raw = await pickBackup(true);
      if (raw !== null) {
        setDays(parseMigration(raw));
        setReview(null);
      }
    } catch (e) {
      setDays(null);
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function prepare() {
    setError("");
    try {
      if (mode === "seed")
        setReview({
          kind: "seed",
          seed: validateSeed(count, lastDate, source),
        });
      else {
        if (!days)
          throw new Error("Choose a CSV or JSON file with daily totals first.");
        applyMigration(data, profile.id, days, source);
        setReview({ kind: "full", source: source.trim(), days });
      }
    } catch (e) {
      report(e);
    }
  }
  const previewStreak =
    review?.kind === "full"
      ? calculateStreak(
          profile,
          applyMigration(data, profile.id, review.days, review.source).entries,
        )
      : null;
  return (
    <Sheet
      title={review ? "Keep your momentum" : "Bring your journey with you"}
      subtitle={`Migration into ${profile.name}. Other profiles stay as they are.`}
      onClose={busy ? () => {} : onClose}
    >
      {!review ? (
        <>
          <View style={[s.wrap, { gap: 8 }]}>
            <Chip
              selected={mode === "seed"}
              onPress={() => {
                setMode("seed");
                setError("");
              }}
            >
              Streak only
            </Chip>
            <Chip
              selected={mode === "full"}
              onPress={() => {
                setMode("full");
                setError("");
              }}
            >
              Full nutrition history
            </Chip>
          </View>
          <Field
            label="Previous app"
            value={source}
            onChange={(v) => setSource(v.slice(0, 60))}
            placeholder="Yazio, or another app"
          />
          {mode === "seed" ? (
            <>
              <Muted>
                Keep the streak you worked for. Enter the count shown in your
                previous app and the last day that count includes.
              </Muted>
              <Field
                label="Current streak"
                numeric
                value={count}
                onChange={setCount}
                placeholder="e.g. 120"
                suffix="days"
              />
              <Field
                label="Last logged date (YYYY-MM-DD)"
                value={lastDate}
                onChange={setLastDate}
                placeholder="YYYY-MM-DD"
              />
              <View style={s.row}>
                <Chip
                  selected={lastDate === shiftDay(dayKey(), -1)}
                  onPress={() => setLastDate(shiftDay(dayKey(), -1))}
                >
                  Yesterday
                </Chip>
                <Chip
                  selected={lastDate === dayKey()}
                  onPress={() => setLastDate(dayKey())}
                >
                  Today
                </Chip>
              </View>
              <Muted>
                If the count includes today, today is already credited. If it
                ends yesterday, your first entry today adds one. Older dates use
                the same two-freeze rule.
              </Muted>
            </>
          ) : (
            <>
              <Muted>
                Import daily dates, calories consumed, calorie budgets, and
                protein, carbs, fiber, and fat. Convert your previous app’s
                export to this template, with one total per day. Every imported
                day counts toward your streak.
              </Muted>
              <Button
                secondary
                small
                icon="download"
                onPress={async () => {
                  try {
                    await exportFile(
                      migrationTemplate,
                      "fittrack-migration-template.csv",
                      "text/csv",
                    );
                  } catch (e) {
                    report(e);
                  }
                }}
              >
                Download CSV template
              </Button>
              <Button secondary icon="upload" onPress={load} busy={busy}>
                Choose CSV or JSON
              </Button>
              {days && (
                <Card style={{ backgroundColor: C.mint }}>
                  <Heading style={{ fontSize: 16 }}>
                    {days.length} days ready to review
                  </Heading>
                  <Muted style={{ marginTop: 6 }}>
                    {days[0].date} – {days[days.length - 1].date}
                  </Muted>
                </Card>
              )}
              <Muted style={{ fontSize: 11 }}>
                JSON uses the same column names inside an array, or a{" "}
                {`{"days": [...]}`} object. The optional calories_remaining
                value must match budget minus consumed calories. Existing
                imports from the same app and date are updated; overlapping food
                from elsewhere must be resolved first.
              </Muted>
            </>
          )}
          <Button onPress={prepare} disabled={busy}>
            Review migration
          </Button>
        </>
      ) : (
        <>
          <Card
            style={{
              backgroundColor: "#FFF4E9",
              borderColor: "#F2DECB",
              gap: 9,
            }}
          >
            <Heading>
              {review.kind === "seed"
                ? `${review.seed.days.toLocaleString()} days from ${review.seed.source}`
                : `${review.days.length} daily nutrition records`}
            </Heading>
            <Muted>
              {review.kind === "seed"
                ? `Count through ${review.seed.lastDate}. This replaces any previous carried streak count for this profile. Local food and measurements remain.`
                : `${review.days[0].date} – ${review.days[review.days.length - 1].date} · ${review.source}`}
            </Muted>
            {review.kind === "full" && (
              <>
                <Muted>
                  {Math.round(
                    review.days.reduce((n, d) => n + d.nutrients.calories, 0),
                  ).toLocaleString()}{" "}
                  total kcal, with daily budgets and all four nutrients.
                </Muted>
                <Muted>
                  Resulting current streak: {previewStreak?.current} logged
                  days. Matching daily imports from this app will be replaced.
                </Muted>
              </>
            )}
          </Card>
          <Muted>
            Migration adds no celebration for past days. Your next new daily
            entry will celebrate your progress. Two freezes protect completed
            missed days in each streak.
          </Muted>
          <Button
            icon="check"
            busy={busy}
            onPress={async () => {
              setError("");
              setBusy(true);
              try {
                await onSave(review);
                onClose();
              } catch (e) {
                report(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm migration
          </Button>
          <Button secondary disabled={busy} onPress={() => setReview(null)}>
            Back to details
          </Button>
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}
