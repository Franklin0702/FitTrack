import React, { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import {
  Data,
  dayLabel,
  Entry,
  nutrientKeys,
  Profile,
  shiftDay,
  totals,
  calorieBudget,
  dayKey,
} from "./model";
import { calculateStreak } from "./streak";
import { StreakCard } from "./streak-ui";
import {
  Bar,
  Button,
  C,
  Card,
  Chip,
  Empty,
  Heading,
  Icon,
  IconButton,
  Label,
  Muted,
  Ring,
  s,
} from "./ui";

export type ScreenProps = {
  data: Data;
  profile: Profile;
  day: string;
  onAdd: (kind: Entry["kind"]) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onTab: (
    tab: "overview" | "diary" | "progress" | "settings" | "streak",
  ) => void;
};
const fmt = (n: number) => Number(n.toFixed(1)).toLocaleString();
const colors = {
  protein: C.coral,
  carbs: C.yellow,
  fiber: C.violet,
  fat: C.blue,
};

export function EntryRow({
  entry,
  onEdit,
  onDelete,
  showDate = false,
}: {
  entry: Entry;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
  showDate?: boolean;
}) {
  const meta =
    entry.kind === "food"
      ? {
          icon: "leaf",
          bg: "#F5EEE5",
          color: C.coral,
          name: entry.name,
          detail: `${entry.meal} · P ${fmt(entry.nutrients.protein)}g · C ${fmt(entry.nutrients.carbs)}g · F ${fmt(entry.nutrients.fat)}g · Fiber ${fmt(entry.nutrients.fiber)}g`,
          value: fmt(entry.nutrients.calories),
          unit: "kcal",
        }
      : entry.kind === "water"
        ? {
            icon: "drop",
            bg: "#EAF2F6",
            color: C.blue,
            name: "Water",
            detail: "A little hydration goes a long way",
            value: fmt(entry.amount),
            unit: "ml",
          }
        : entry.kind === "exercise"
          ? {
              icon: "activity",
              bg: C.mint,
              color: C.green,
              name: entry.name,
              detail: "Movement logged",
              value: fmt(entry.minutes),
              unit: "min",
            }
          : {
              icon: "scale",
              bg: "#F1EDF5",
              color: C.violet,
              name: "Body check-in",
              detail:
                [entry.waist ? `Waist ${fmt(entry.waist)} cm` : "", entry.note]
                  .filter(Boolean)
                  .join(" · ") || "Weight logged",
              value: fmt(entry.weight),
              unit: "kg",
            };
  const compact = useWindowDimensions().width < 520;
  return (
    <View style={[s.row, { paddingVertical: 14, gap: compact ? 8 : 13 }]}>
      {!compact && (
        <View style={[s.iconTile, { backgroundColor: meta.bg }]}>
          <Icon name={meta.icon} color={meta.color} size={19} />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${meta.name}`}
        onPress={() => onEdit(entry)}
        style={{ flex: 1, gap: 4 }}
      >
        <Label>{meta.name}</Label>
        <Muted style={{ fontSize: 11 }}>
          {showDate ? `${dayLabel(entry.date)} · ` : ""}
          {meta.detail}
        </Muted>
      </Pressable>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Label style={{ fontSize: 15 }}>{meta.value}</Label>
        <Muted style={{ fontSize: 10 }}>{meta.unit}</Muted>
      </View>
      <IconButton
        name="trash"
        onPress={() => onDelete(entry)}
        label={`Delete ${meta.name}`}
        color={C.muted}
      />
    </View>
  );
}

export function Overview(props: ScreenProps) {
  const { data, profile, day, onAdd, onTab } = props;
  const wide = useWindowDimensions().width > 1120;
  const entries = data.entries.filter(
    (e) => e.profileId === profile.id && e.date === day,
  );
  const sum = totals(entries),
    target = profile.targets,
    remaining = calorieBudget(profile, entries) - sum.calories;
  const latestWeight = data.entries
    .filter(
      (e): e is Extract<Entry, { kind: "measurement" }> =>
        e.profileId === profile.id && e.kind === "measurement" && e.date <= day,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0];
  const allProfileEntries = data.entries.filter(
    (e) => e.profileId === profile.id,
  );
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 6));
  const weekly = days.map(
    (d) => totals(allProfileEntries.filter((e) => e.date === d)).calories,
  );
  return (
    <View style={{ gap: 22 }}>
      <StreakCard
        streak={calculateStreak(profile, data.entries, dayKey())}
        onPress={() => onTab("streak")}
      />
      <View style={[s.wrap, { alignItems: "stretch" }]}>
        <Card style={{ flex: wide ? 1.15 : 1, minWidth: 260 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={s.row}>
              <Icon name="fire" color={C.coral} size={19} />
              <Heading style={{ fontSize: 17 }}>Your calorie budget</Heading>
            </View>
            <Muted style={{ fontSize: 10 }}>DAILY</Muted>
          </View>
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Ring value={sum.calories} max={calorieBudget(profile, entries)}>
              <Text
                style={{
                  fontSize: 37,
                  fontWeight: "700",
                  color: remaining < 0 ? C.coral : C.ink,
                  letterSpacing: -1.5,
                }}
              >
                {fmt(Math.abs(remaining))}
              </Text>
              <Muted>
                {remaining < 0 ? "kcal over budget" : "kcal remaining"}
              </Muted>
            </Ring>
          </View>
          <View style={[s.row, { justifyContent: "space-around" }]}>
            <View style={{ alignItems: "center", gap: 5 }}>
              <Muted>Consumed</Muted>
              <Heading style={{ fontSize: 19 }}>
                {fmt(sum.calories)}{" "}
                <Text
                  style={{ color: C.muted, fontSize: 11, fontWeight: "400" }}
                >
                  kcal
                </Text>
              </Heading>
            </View>
            <View style={{ height: 30, width: 1, backgroundColor: C.line }} />
            <View style={{ alignItems: "center", gap: 5 }}>
              <Muted>Daily budget</Muted>
              <Heading style={{ fontSize: 19 }}>
                {fmt(calorieBudget(profile, entries))}{" "}
                <Text
                  style={{ color: C.muted, fontSize: 11, fontWeight: "400" }}
                >
                  kcal
                </Text>
              </Heading>
            </View>
          </View>
          <View style={{ marginTop: 24 }}>
            <Button icon="plus" onPress={() => onAdd("food")}>
              Log food
            </Button>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <View style={s.row}>
            <Icon name="leaf" color={C.green} size={19} />
            <Heading style={{ fontSize: 17 }}>Nutrient budgets</Heading>
          </View>
          <Muted style={{ marginTop: 6 }}>
            Good things, in your own balance.
          </Muted>
          <View style={{ gap: 23, marginTop: 27 }}>
            {nutrientKeys.map((key) => (
              <View key={key} style={{ gap: 9 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <View style={[s.row, { gap: 8 }]}>
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: colors[key],
                      }}
                    />
                    <Label style={{ textTransform: "capitalize" }}>{key}</Label>
                  </View>
                  <Text
                    style={{ fontSize: 12, color: C.ink, fontWeight: "600" }}
                  >
                    {fmt(sum[key])}{" "}
                    <Text style={{ color: C.muted, fontWeight: "400" }}>
                      / {fmt(target[key])} g
                    </Text>
                  </Text>
                </View>
                <Bar value={sum[key]} max={target[key]} color={colors[key]} />
                <Muted style={{ fontSize: 11, lineHeight: 13 }}>
                  {fmt(Math.abs(target[key] - sum[key]))} g{" "}
                  {sum[key] > target[key] ? "over budget" : "remaining"}
                </Muted>
              </View>
            ))}
          </View>
        </Card>
        <View
          style={{
            flex: wide ? 0.95 : undefined,
            minWidth: 260,
            width: wide ? undefined : "100%",
            gap: 16,
          }}
        >
          <Card
            style={{
              flex: 1,
              backgroundColor: "#EAF1F3",
              borderColor: "#E0E9EB",
              padding: 21,
            }}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={s.row}>
                <Icon name="drop" color={C.blue} size={19} />
                <Heading style={{ fontSize: 16 }}>Stay hydrated</Heading>
              </View>
              <IconButton
                name="plus"
                onPress={() => onAdd("water")}
                label="Add custom water amount"
              />
            </View>
            <Text
              style={{
                fontSize: 28,
                color: C.ink,
                fontWeight: "700",
                marginTop: 15,
              }}
            >
              {fmt(sum.water / 1000)}{" "}
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: "400" }}>
                / {fmt(target.water / 1000)} L
              </Text>
            </Text>
            <View style={{ marginTop: 13 }}>
              <Bar value={sum.water} max={target.water} color={C.blue} />
            </View>
            <View style={{ marginTop: 16 }}>
              <Button
                secondary
                small
                icon="plus"
                onPress={() => onAdd("water")}
              >
                Add water
              </Button>
            </View>
          </Card>
          <Card
            style={{
              flex: 1,
              backgroundColor: "#F0F2E7",
              borderColor: "#E7E9DB",
              padding: 21,
            }}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={s.row}>
                <Icon name="activity" color={C.green} size={19} />
                <Heading style={{ fontSize: 16 }}>Make a move</Heading>
              </View>
              <IconButton
                name="plus"
                onPress={() => onAdd("exercise")}
                label="Log exercise"
              />
            </View>
            <Text
              style={{
                fontSize: 28,
                color: C.ink,
                fontWeight: "700",
                marginTop: 15,
              }}
            >
              {fmt(sum.exercise)}{" "}
              <Text style={{ fontSize: 13, color: C.muted, fontWeight: "400" }}>
                / {fmt(target.exercise)} min
              </Text>
            </Text>
            <View style={{ marginTop: 13 }}>
              <Bar value={sum.exercise} max={target.exercise} />
            </View>
            <Muted style={{ fontSize: 11, marginTop: 13 }}>
              {sum.exercise >= target.exercise
                ? "Daily movement goal reached. Nice work!"
                : profile.routine.length
                  ? profile.routine.slice(0, 2).join(" · ")
                  : "Every bit of movement counts."}
            </Muted>
          </Card>
        </View>
      </View>
      <View style={s.wrap}>
        <Card style={{ flex: 1.6, minWidth: 260 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Heading style={{ fontSize: 17 }}>The daily journal</Heading>
            <Pressable
              accessibilityRole="button"
              onPress={() => onTab("diary")}
            >
              <Text style={{ color: C.green, fontSize: 12, fontWeight: "600" }}>
                View all →
              </Text>
            </Pressable>
          </View>
          {entries.length ? (
            entries
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 4)
              .map((e, i) => (
                <View
                  key={e.id}
                  style={
                    i > 0
                      ? { borderTopWidth: 1, borderTopColor: C.line }
                      : undefined
                  }
                >
                  <EntryRow
                    entry={e}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                  />
                </View>
              ))
          ) : (
            <Empty
              icon="book"
              title="A fresh page for your day"
              detail="Log your first meal, a glass of water, or a little movement. It all adds up."
              action="Add your first meal"
              onPress={() => onAdd("food")}
            />
          )}
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Heading style={{ fontSize: 17 }}>One day at a time</Heading>
            <Icon name="chart" color={C.green} size={18} />
          </View>
          <Muted style={{ fontSize: 12, marginTop: 6 }}>
            Calories over the last 7 days
          </Muted>
          <View
            style={{
              height: 125,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 12,
              marginTop: 17,
            }}
          >
            {days.map((d, i) => (
              <View key={d} style={{ flex: 1, alignItems: "center", gap: 9 }}>
                <View
                  style={{
                    width: "75%",
                    height: 90,
                    justifyContent: "flex-end",
                    backgroundColor: "#F1F4ED",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: `${(weekly[i] / Math.max(target.calories, ...weekly)) * 100}%`,
                      width: "100%",
                      backgroundColor: d === day ? C.green : "#BBD2A8",
                      minHeight: weekly[i] ? 3 : 0,
                      borderRadius: 5,
                    }}
                  />
                </View>
                <Muted style={{ fontSize: 10 }}>
                  {new Date(d + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "narrow",
                  })}
                </Muted>
              </View>
            ))}
          </View>
          <View style={[s.divider, { marginVertical: 20 }]} />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View>
              <Muted style={{ fontSize: 11 }}>Latest weight</Muted>
              <Heading style={{ fontSize: 20, marginTop: 4 }}>
                {latestWeight ? `${fmt(latestWeight.weight)} kg` : "—"}
              </Heading>
            </View>
            <Button
              secondary
              small
              onPress={() => onAdd("measurement")}
              icon="plus"
            >
              Check in
            </Button>
          </View>
        </Card>
      </View>
      <View style={[s.row, { justifyContent: "center", paddingVertical: 5 }]}>
        <Icon name="shield" color={C.muted} size={14} />
        <Muted style={{ fontSize: 11 }}>
          Your journey, your data. Stored only on this device.
        </Muted>
      </View>
    </View>
  );
}

export function Diary(props: ScreenProps) {
  const [filter, setFilter] = useState("All");
  const entries = props.data.entries.filter(
    (e) => e.profileId === props.profile.id && e.date === props.day,
  );
  const filtered = entries.filter(
    (e) => filter === "All" || e.kind === filter.toLowerCase(),
  );
  const total = totals(entries);
  return (
    <View style={{ gap: 22 }}>
      <Card>
        <View
          style={[
            s.wrap,
            { alignItems: "center", justifyContent: "space-between" },
          ]}
        >
          <View>
            <Heading>
              {fmt(total.calories)}{" "}
              <Text style={{ fontSize: 13, fontWeight: "400", color: C.muted }}>
                of {fmt(calorieBudget(props.profile, entries))} kcal used
              </Text>
            </Heading>
            <Muted style={{ marginTop: 6 }}>
              Each entry is a small part of the bigger picture.
            </Muted>
          </View>
          <View style={s.wrap}>
            <Button
              small
              secondary
              icon="drop"
              onPress={() => props.onAdd("water")}
            >
              Water
            </Button>
            <Button
              small
              secondary
              icon="activity"
              onPress={() => props.onAdd("exercise")}
            >
              Exercise
            </Button>
            <Button small icon="plus" onPress={() => props.onAdd("food")}>
              Log food
            </Button>
          </View>
        </View>
        <View style={{ marginTop: 22 }}>
          <Bar
            value={total.calories}
            max={calorieBudget(props.profile, entries)}
          />
        </View>
      </Card>
      <View style={[s.wrap, { gap: 8 }]}>
        {["All", "Food", "Water", "Exercise", "Measurement"].map((f) => (
          <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </View>
      <Card>
        <Heading style={{ fontSize: 17 }}>
          {dayLabel(props.day)}’s entries{" "}
          <Text style={{ color: C.muted, fontWeight: "400", fontSize: 13 }}>
            ({filtered.length})
          </Text>
        </Heading>
        {filtered.length ? (
          filtered
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((entry, i) => (
              <View
                key={entry.id}
                style={
                  i > 0 ? { borderTopWidth: 1, borderColor: C.line } : undefined
                }
              >
                <EntryRow
                  entry={entry}
                  onEdit={props.onEdit}
                  onDelete={props.onDelete}
                />
              </View>
            ))
        ) : (
          <Empty
            icon="book"
            title="Nothing logged here yet"
            detail="Use the buttons above to start tracking this day. You can edit any entry by tapping its name."
          />
        )}
      </Card>
    </View>
  );
}

export function Progress(props: ScreenProps) {
  const [range, setRange] = useState(30);
  const all = props.data.entries.filter(
    (e) => e.profileId === props.profile.id && e.date <= props.day,
  );
  const since = shiftDay(props.day, -range + 1);
  const entries = all.filter((e) => e.date >= since);
  const measurements = entries
    .filter(
      (e): e is Extract<Entry, { kind: "measurement" }> =>
        e.kind === "measurement",
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );
  const latest = all
    .filter(
      (e): e is Extract<Entry, { kind: "measurement" }> =>
        e.kind === "measurement",
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0];
  const loggedDays = new Set(
    entries.filter((e) => e.kind === "food").map((e) => e.date),
  );
  const total = totals(entries);
  const avg = loggedDays.size
    ? Math.round(total.calories / loggedDays.size)
    : 0;
  const max =
    Math.max(
      ...measurements.map((e) => e.weight),
      props.profile.targets.weight,
    ) + 1;
  const min =
    Math.min(
      ...measurements.map((e) => e.weight),
      props.profile.targets.weight,
    ) - 1;
  const y = (weight: number) => 155 - ((weight - min) / (max - min)) * 130;
  const startDate = new Date(since + "T12:00:00").getTime(),
    endDate = new Date(props.day + "T12:00:00").getTime();
  const points = measurements.map((e) => ({
    x:
      25 +
      ((new Date(e.date + "T12:00:00").getTime() - startDate) /
        (endDate - startDate || 1)) *
        550,
    y: y(e.weight),
  }));
  const change =
    measurements.length > 1
      ? measurements[measurements.length - 1].weight - measurements[0].weight
      : null;
  const stats = [
    {
      label: "Latest weight",
      value: latest ? `${fmt(latest.weight)} kg` : "—",
      detail: latest ? dayLabel(latest.date) : "Your first check-in awaits",
      icon: "scale",
    },
    {
      label: "Change in this period",
      value:
        change === null ? "—" : `${change > 0 ? "+" : ""}${fmt(change)} kg`,
      detail: "Every journey has its own pace",
      icon: "chart",
    },
    {
      label: "Average daily calories",
      value: loggedDays.size ? `${fmt(avg)} kcal` : "—",
      detail: `Across ${loggedDays.size} days with food logs`,
      icon: "fire",
    },
  ];
  return (
    <View style={{ gap: 22 }}>
      <View
        style={[
          s.wrap,
          { justifyContent: "space-between", alignItems: "center" },
        ]}
      >
        <View style={[s.row, { gap: 7 }]}>
          {[7, 30, 90].map((n) => (
            <Chip
              key={n}
              selected={range === n}
              onPress={() => setRange(n)}
            >{`${n} days`}</Chip>
          ))}
        </View>
        <Button small icon="plus" onPress={() => props.onAdd("measurement")}>
          Log measurements
        </Button>
      </View>
      <View style={s.wrap}>
        {stats.map((stat) => (
          <Card key={stat.label} style={{ flex: 1, minWidth: 240 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Muted>{stat.label}</Muted>
              <Icon name={stat.icon} color={C.green} size={19} />
            </View>
            <Heading style={{ fontSize: 28, marginTop: 14 }}>
              {stat.value}
            </Heading>
            <Muted style={{ fontSize: 11, marginTop: 8 }}>{stat.detail}</Muted>
          </Card>
        ))}
      </View>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View>
            <Heading>Weight over time</Heading>
            <Muted style={{ marginTop: 5 }}>
              Goal: {fmt(props.profile.targets.weight)} kg · {dayLabel(since)} –{" "}
              {dayLabel(props.day)}
            </Muted>
          </View>
          <Icon name="chart" color={C.green} />
        </View>
        {points.length ? (
          <View style={{ marginTop: 25 }}>
            <Svg
              width="100%"
              height={210}
              viewBox="0 0 600 190"
              accessibilityLabel={`Weight chart with ${measurements.length} measurements`}
            >
              <Line
                x1={25}
                y1={y(props.profile.targets.weight)}
                x2={575}
                y2={y(props.profile.targets.weight)}
                stroke={C.coral}
                strokeDasharray="5 5"
              />
              <Line x1={25} y1={170} x2={575} y2={170} stroke={C.line} />
              {points.length > 1 && (
                <Path
                  d={points
                    .map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`)
                    .join(" ")}
                  stroke={C.green}
                  strokeWidth={3}
                  fill="none"
                />
              )}
              {points.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={C.green}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Svg>
            <View style={[s.row, { gap: 7 }]}>
              <View
                style={{ width: 17, height: 2, backgroundColor: C.coral }}
              />
              <Muted style={{ fontSize: 11 }}>
                Goal weight · Measurements are listed below.
              </Muted>
            </View>
          </View>
        ) : (
          <Empty
            icon="chart"
            title="Your progress will take shape here"
            detail="Log a measurement to start your chart. Small steps make a meaningful story."
            action="Log your first check-in"
            onPress={() => props.onAdd("measurement")}
          />
        )}
      </Card>
      <View style={s.wrap}>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <Heading style={{ fontSize: 17 }}>Consistency, at a glance</Heading>
          <Muted style={{ marginTop: 6 }}>
            Days you logged food during this period
          </Muted>
          <View style={[s.wrap, { gap: 7, marginTop: 20 }]}>
            {Array.from({ length: range }, (_, i) => shiftDay(since, i)).map(
              (d) => (
                <View
                  key={d}
                  accessibilityLabel={`${d}: ${loggedDays.has(d) ? "food logged" : "no food logs"}`}
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: 5,
                    backgroundColor: loggedDays.has(d) ? C.green : "#EDF1E9",
                  }}
                />
              ),
            )}
          </View>
          <Muted style={{ marginTop: 15, fontSize: 12 }}>
            {loggedDays.size} of {range} days logged · {fmt(total.exercise)}{" "}
            minutes of movement
          </Muted>
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <Heading style={{ fontSize: 17 }}>Measurement history</Heading>
          {measurements.length ? (
            measurements
              .slice()
              .reverse()
              .map((e, i) => (
                <View
                  key={e.id}
                  style={
                    i > 0
                      ? { borderTopWidth: 1, borderColor: C.line }
                      : undefined
                  }
                >
                  <EntryRow
                    entry={e}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                    showDate
                  />
                </View>
              ))
          ) : (
            <Muted style={{ marginTop: 20 }}>
              No measurements in this period. Try another date range or add a
              check-in.
            </Muted>
          )}
        </Card>
      </View>
    </View>
  );
}

export function Settings({
  profile,
  data,
  onProfile,
  onReminder,
  onExport,
  onImport,
  onDeleteProfile,
}: {
  profile: Profile;
  data: Data;
  onProfile: () => void;
  onReminder: () => void;
  onExport: (format: "json" | "csv") => void;
  onImport: () => void;
  onDeleteProfile: () => void;
}) {
  return (
    <View style={{ gap: 22 }}>
      <Card>
        <View
          style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}
        >
          <View style={s.row}>
            <View
              style={[
                s.iconTile,
                { width: 52, height: 52, backgroundColor: C.mint },
              ]}
            >
              <Text style={{ fontSize: 23, fontWeight: "600", color: C.green }}>
                {profile.name[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Heading>{profile.name}</Heading>
              <Muted>
                One of {data.profiles.length} local{" "}
                {data.profiles.length === 1 ? "profile" : "profiles"}
              </Muted>
            </View>
          </View>
          <Button secondary small icon="edit" onPress={onProfile}>
            Edit profile & goals
          </Button>
        </View>
        <View style={[s.wrap, { marginTop: 26 }]}>
          {Object.entries(profile.targets).map(([key, value]) => (
            <View key={key} style={{ minWidth: 110, flex: 1, gap: 7 }}>
              <Muted style={{ textTransform: "capitalize", fontSize: 12 }}>
                {key === "weight" ? "Goal weight" : key}
              </Muted>
              <Label>
                {fmt(value)}{" "}
                {key === "calories"
                  ? "kcal"
                  : key === "water"
                    ? "ml"
                    : key === "exercise"
                      ? "min"
                      : key === "weight"
                        ? "kg"
                        : "g"}
              </Label>
            </View>
          ))}
        </View>
        <View style={[s.divider, { marginVertical: 22 }]} />
        <Label>Your exercise routine</Label>
        <Muted style={{ marginTop: 8 }}>
          {profile.routine.join(" · ") ||
            "Add your favorite activities in profile settings to quickly log your routine."}
        </Muted>
      </Card>
      <Card>
        <View
          style={[
            s.wrap,
            { justifyContent: "space-between", alignItems: "center" },
          ]}
        >
          <View style={[s.row, { flex: 1, minWidth: 220 }]}>
            <View style={[s.iconTile, { backgroundColor: "#F6EFE0" }]}>
              <Icon name="bell" color={C.yellow} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Heading style={{ fontSize: 17 }}>Make check-ins a habit</Heading>
              <Muted>
                {profile.reminder.enabled
                  ? `${profile.reminder.frequency === "daily" ? "Every day" : "Every Monday"} at ${String(profile.reminder.hour).padStart(2, "0")}:${String(profile.reminder.minute).padStart(2, "0")}`
                  : "Schedule a gentle reminder for your measurements."}
              </Muted>
            </View>
          </View>
          <Button secondary small onPress={onReminder}>
            Manage reminders
          </Button>
        </View>
      </Card>
      <Card>
        <View style={s.row}>
          <Icon name="shield" color={C.green} />
          <Heading style={{ fontSize: 17 }}>Your data belongs to you</Heading>
        </View>
        <Muted style={{ marginTop: 10, maxWidth: 650 }}>
          All profiles and logs live on this device. There is no account, cloud
          sync, or advertising. Export a backup regularly so you can restore
          your history or move to another device.
        </Muted>
        <View style={[s.wrap, { marginTop: 22 }]}>
          <Button secondary icon="download" onPress={() => onExport("json")}>
            Export full backup
          </Button>
          <Button secondary icon="download" onPress={() => onExport("csv")}>
            Export logs as CSV
          </Button>
          <Button secondary icon="upload" onPress={onImport}>
            Import backup
          </Button>
        </View>
        <Muted style={{ marginTop: 14, fontSize: 11 }}>
          Backups include all profiles, targets, routines, reminders, and
          entries. CSV contains logged entries for spreadsheets. Import replaces
          the data on this device.
        </Muted>
      </Card>
      <Card style={{ borderColor: "#EDD8D3" }}>
        <Heading style={{ fontSize: 16 }}>Delete this profile</Heading>
        <Muted style={{ marginTop: 7, marginBottom: 16 }}>
          Permanently remove {profile.name} and their entries from this device.
          Other profiles will remain.
        </Muted>
        <View style={{ alignSelf: "flex-start" }}>
          <Button danger small icon="trash" onPress={onDeleteProfile}>
            Delete profile
          </Button>
        </View>
      </Card>
      <Muted style={{ textAlign: "center", fontSize: 11, padding: 10 }}>
        FIT TRACK · A little more in tune with you.
      </Muted>
    </View>
  );
}
