import React, { useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import {
  defaultTargets,
  Entry,
  id,
  Nutrients,
  Profile,
  Targets,
} from "./model";
import { Button, C, Chip, Field, Heading, Muted, s, Sheet } from "./ui";
import { nutritionFromText, parseSmartEntry } from "./nutrition-text";

function useFormSave(onSave: () => Promise<void>) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await onSave();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, save };
}
function numeric(value: string, label: string, min = 0, max = 1000000) {
  const n = Number(value.replace(",", "."));
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return n;
}
export function EntryForm({
  kind,
  profile,
  date,
  initial,
  onSave,
  onClose,
}: {
  kind: Entry["kind"];
  profile: Profile;
  date: string;
  initial?: Entry;
  onSave: (entry: Entry) => Promise<void>;
  onClose: () => void;
}) {
  const food = initial?.kind === "food" ? initial : undefined;
  const measurement = initial?.kind === "measurement" ? initial : undefined;
  const exercise = initial?.kind === "exercise" ? initial : undefined;
  const [name, setName] = useState(food?.name ?? exercise?.name ?? "");
  const [nutritionText, setNutritionText] = useState(food?.nutritionText ?? "");
  const [smartEntry, setSmartEntry] = useState(Boolean(food?.nutritionText?.trim()));
  const useText = smartEntry && nutritionText.trim().length > 0;
  const parsedSmartEntry = parseSmartEntry(nutritionText);
  const parsedNutrition = parsedSmartEntry.nutrients;
  const mealName = useText && parsedSmartEntry.label ? parsedSmartEntry.label : name;
  const nutritionValue = (key: keyof Nutrients) =>
    useText
      ? parsedNutrition[key] === undefined
        ? ""
        : String(parsedNutrition[key])
      : values[key];
  const [meal, setMeal] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">(
    food?.meal ?? "Breakfast",
  );
  const [values, setValues] = useState<Record<string, string>>({
    calories: food ? String(food.nutrients.calories) : "",
    protein: food ? String(food.nutrients.protein) : "",
    carbs: food ? String(food.nutrients.carbs) : "",
    fiber: food ? String(food.nutrients.fiber) : "",
    fat: food ? String(food.nutrients.fat) : "",
    amount: initial?.kind === "water" ? String(initial.amount) : "250",
    minutes: exercise ? String(exercise.minutes) : "30",
    weight: measurement ? String(measurement.weight) : "",
    waist: measurement?.waist ? String(measurement.waist) : "",
    note: measurement?.note ?? "",
  });
  const set = (key: string) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  const titles = {
    food: "Log a meal",
    water: "Add some water",
    exercise: "Log your movement",
    measurement: "A little check-in",
  };
  const form = useFormSave(async () => {
    const base = {
      id: initial?.id ?? id(),
      profileId: profile.id,
      date,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    let entry: Entry;
    if (kind === "food") {
      if (!mealName.trim()) throw new Error("Give your food or meal a name, or add a label in Smart Entry.");
      entry = {
        ...base,
        kind,
        name: mealName.trim(),
        meal,
        ...(food?.migration ? { migration: food.migration } : {}),
        ...(useText ? { nutritionText: nutritionText.trim() } : {}),
        nutrients: useText
          ? nutritionFromText(nutritionText)
          : {
              calories: numeric(values.calories, "Calories"),
              protein: numeric(values.protein || "0", "Protein"),
              carbs: numeric(values.carbs || "0", "Carbs"),
              fiber: numeric(values.fiber || "0", "Fiber"),
              fat: numeric(values.fat || "0", "Fat"),
            },
      };
    } else if (kind === "water")
      entry = { ...base, kind, amount: numeric(values.amount, "Water", 1) };
    else if (kind === "exercise") {
      if (!name.trim())
        throw new Error(
          "Enter an activity name or choose one from your routine.",
        );
      entry = {
        ...base,
        kind,
        name: name.trim(),
        minutes: numeric(values.minutes, "Duration", 1, 1440),
      };
    } else
      entry = {
        ...base,
        kind,
        weight: numeric(values.weight, "Weight", 0.1, 1000),
        ...(values.waist.trim()
          ? { waist: numeric(values.waist, "Waist", 0.1, 1000) }
          : {}),
        note: values.note.trim(),
      };
    await onSave(entry);
    onClose();
  });
  return (
    <Sheet
      title={initial ? "Edit entry" : titles[kind]}
      subtitle={`${profile.name} · ${new Date(date + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
      onClose={onClose}
    >
      {kind === "food" && (
        <>
          <View style={[s.wrap, { gap: 8 }]}>
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((m) => (
              <Chip key={m} selected={meal === m} onPress={() => setMeal(m)}>
                {m}
              </Chip>
            ))}
          </View>
          <Field
            label="Food or meal name"
            value={mealName}
            editable={!(useText && parsedSmartEntry.label)}
            onChange={setName}
            placeholder="e.g. Greek yogurt & berries"
          />
          <Button small secondary={!smartEntry} expanded={smartEntry} icon="edit" onPress={() => setSmartEntry(enabled => !enabled)}>Smart Entry</Button>
          {smartEntry && <>
          <Field
            label="Nutrition text (optional)"
            value={nutritionText}
            onChange={setNutritionText}
            multiline
            placeholder={'Ate 3 boiled eggs with protein shake L\n30k 20P 15F 30Fi 10C'}
          />
          <Muted style={{ fontSize: 12 }}>
            k = kcal · P = protein · C = carbs · F = fat · Fi = fiber (grams).
            Put tokens anywhere in a paragraph. Repeated units are added
            together. End a label line with L, or use a descriptive first line, to set the meal name.
          </Muted>
          {useText && (
            <View accessibilityLiveRegion="polite">
              <Muted style={{ fontSize: 12 }}>
                {Object.keys(parsedNutrition).length
                  ? "Parsed values are shown below. Missing or invalid values are ignored and contribute zero. Clear nutrition text to use the individual fields."
                  : "No nutrition values found. This entry will contribute zero calories and nutrients. Clear nutrition text to use the individual fields."}
              </Muted>
            </View>
          )}
          </>}
          <Field
            label="Calories"
            numeric
            value={nutritionValue("calories")}
            editable={!useText}
            onChange={set("calories")}
            placeholder="0"
            suffix="kcal"
          />
          <View style={s.wrap}>
            {(["protein", "carbs", "fiber", "fat"] as const).map((key) => (
              <View key={key} style={{ width: "47%", flexGrow: 1 }}>
                <Field
                  label={key[0].toUpperCase() + key.slice(1)}
                  numeric
                  value={nutritionValue(key)}
                  editable={!useText}
                  onChange={set(key)}
                  placeholder="0"
                  suffix="g"
                />
              </View>
            ))}
          </View>
          <Muted>
            Enter totals for the portion you ate. These will be deducted from
            your daily budget.
          </Muted>
        </>
      )}
      {kind === "water" && (
        <>
          <View style={s.wrap}>
            {[250, 500, 750, 1000].map((n) => (
              <Chip
                key={n}
                selected={values.amount === String(n)}
                onPress={() => set("amount")(String(n))}
              >{`${n} ml`}</Chip>
            ))}
          </View>
          <Field
            label="Amount"
            value={values.amount}
            onChange={set("amount")}
            numeric
            suffix="ml"
          />
        </>
      )}
      {kind === "exercise" && (
        <>
          {profile.routine.length > 0 && (
            <>
              <Muted>Choose from your routine, or add another activity.</Muted>
              <View style={[s.wrap, { gap: 8 }]}>
                {profile.routine.map((r, i) => (
                  <Chip
                    key={i}
                    selected={name === r}
                    onPress={() => setName(r)}
                  >
                    {r}
                  </Chip>
                ))}
              </View>
            </>
          )}
          <Field
            label="Activity"
            value={name}
            onChange={setName}
            placeholder="e.g. Morning walk"
          />
          <Field
            label="Duration"
            value={values.minutes}
            onChange={set("minutes")}
            numeric
            suffix="min"
          />
          <Muted>
            Movement is tracked toward your activity goal. It does not increase
            your calorie budget.
          </Muted>
        </>
      )}
      {kind === "measurement" && (
        <>
          <View style={s.wrap}>
            <Field
              label="Weight"
              value={values.weight}
              onChange={set("weight")}
              placeholder="0.0"
              numeric
              suffix="kg"
            />
            <Field
              label="Waist (optional)"
              value={values.waist}
              onChange={set("waist")}
              placeholder="0.0"
              numeric
              suffix="cm"
            />
          </View>
          <Field
            label="Notes (optional)"
            multiline
            value={values.note}
            onChange={(v) => set("note")(v.slice(0, 500))}
            placeholder="How are you feeling?"
          />
          <Muted>
            Progress takes many forms. This is simply a record of where you are
            today.
          </Muted>
        </>
      )}
      {form.error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {form.error}
        </Text>
      ) : null}
      <Button onPress={form.save} busy={form.busy} icon="check">
        {initial ? "Save changes" : "Save entry"}
      </Button>
    </Sheet>
  );
}

const targetFields: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "calories", label: "Daily calories", unit: "kcal" },
  { key: "weight", label: "Goal weight", unit: "kg" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "water", label: "Daily water", unit: "ml" },
  { key: "exercise", label: "Daily movement", unit: "min" },
];
export function ProfileForm({
  profile,
  onClose,
  onSave,
}: {
  profile?: Profile;
  onClose: () => void;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [targets, setTargets] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(profile?.targets ?? defaultTargets).map(([k, v]) => [
        k,
        String(v),
      ]),
    ),
  );
  const [routine, setRoutine] = useState(profile?.routine.join("\n") ?? "");
  const form = useFormSave(async () => {
    if (!name.trim()) throw new Error("Enter a name for this profile.");
    const parsed = Object.fromEntries(
      targetFields.map((f) => [
        f.key,
        numeric(
          targets[f.key],
          f.label,
          0.1,
          f.key === "weight" ? 1000 : f.key === "exercise" ? 1440 : 1000000,
        ),
      ]),
    ) as Targets;
    const activities = routine
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (activities.length > 100 || activities.some((a) => a.length > 100))
      throw new Error(
        "Keep routine activities under 100 characters, with at most 100 activities.",
      );
    await onSave({
      id: profile?.id ?? id(),
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      name: name.trim().slice(0, 60),
      targets: parsed,
      routine: activities,
      ...(profile?.streak ? { streak: profile.streak } : {}),
      reminder: profile?.reminder ?? {
        enabled: false,
        frequency: "weekly",
        hour: 9,
        minute: 0,
      },
    });
    onClose();
  });
  return (
    <Sheet
      title={profile ? "Make it your own" : "Your journey starts here"}
      subtitle={
        profile
          ? "Adjust your profile and daily targets."
          : "Create a local profile. No account, no ads, just you."
      }
      onClose={onClose}
    >
      <Field
        label="Profile name"
        value={name}
        onChange={(v) => setName(v.slice(0, 60))}
        placeholder="e.g. Alex"
      />
      <View style={{ gap: 5 }}>
        <Heading style={{ fontSize: 16 }}>Your daily goals</Heading>
        <Muted>
          These are starting values, not personal recommendations. Set the
          targets that work for you.
        </Muted>
      </View>
      <View style={s.wrap}>
        {targetFields.map((f) => (
          <View key={f.key} style={{ width: "47%", flexGrow: 1 }}>
            <Field
              label={f.label}
              value={targets[f.key]}
              onChange={(v) => setTargets((t) => ({ ...t, [f.key]: v }))}
              numeric
              suffix={f.unit}
            />
          </View>
        ))}
      </View>
      <Field
        label="Your exercise routine (one activity per line)"
        value={routine}
        onChange={setRoutine}
        multiline
        placeholder={"Morning walk\nStrength training\nStretching"}
      />
      {form.error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {form.error}
        </Text>
      ) : null}
      <Button onPress={form.save} busy={form.busy} icon="check">
        {profile ? "Save profile" : "Create my profile"}
      </Button>
    </Sheet>
  );
}
export function ReminderForm({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(profile.reminder.enabled);
  const [frequency, setFrequency] = useState(profile.reminder.frequency);
  const [hour, setHour] = useState(
    String(profile.reminder.hour).padStart(2, "0"),
  );
  const [minute, setMinute] = useState(
    String(profile.reminder.minute).padStart(2, "0"),
  );
  const form = useFormSave(async () => {
    const h = numeric(hour, "Hour", 0, 23),
      m = numeric(minute, "Minute", 0, 59);
    if (!Number.isInteger(h) || !Number.isInteger(m))
      throw new Error("Use whole numbers for hours and minutes.");
    if (enabled && Platform.OS === "web")
      throw new Error(
        "Scheduled reminders are available in the Android and iPhone apps.",
      );
    await onSave({
      ...profile,
      reminder: { enabled, frequency, hour: h, minute: m },
    });
    onClose();
  });
  return (
    <Sheet
      title="A nudge to check in"
      subtitle="A local reminder to log your weight and measurements."
      onClose={onClose}
    >
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <LabelWithDescription />
        <Switch
          accessibilityLabel="Enable measurement reminders"
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: C.line, true: C.green }}
        />
      </View>
      <View style={s.row}>
        <Chip
          selected={frequency === "daily"}
          onPress={() => setFrequency("daily")}
        >
          Every day
        </Chip>
        <Chip
          selected={frequency === "weekly"}
          onPress={() => setFrequency("weekly")}
        >
          Every Monday
        </Chip>
      </View>
      <View style={s.row}>
        <Field label="Hour (24-hour)" numeric value={hour} onChange={setHour} />
        <Field label="Minute" numeric value={minute} onChange={setMinute} />
      </View>
      <Muted>
        Uses this device’s local time.{" "}
        {Platform.OS === "web"
          ? "Install the mobile app to receive reminders."
          : "Your device will ask for notification permission when you enable this."}
      </Muted>
      {form.error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {form.error}
        </Text>
      ) : null}
      <Button onPress={form.save} busy={form.busy}>
        Save reminder
      </Button>
    </Sheet>
  );
}
function LabelWithDescription() {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Heading style={{ fontSize: 16 }}>Measurement reminders</Heading>
      <Muted>A small habit for the bigger picture.</Muted>
    </View>
  );
}
