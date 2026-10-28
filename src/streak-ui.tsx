import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { dayKey, shiftDay } from "./model";
import type { ScreenProps } from "./screens";
import { calculateStreak, Streak, streakDayStatus } from "./streak";
import {
  Button,
  C,
  Card,
  Heading,
  Icon,
  IconButton,
  Label,
  Muted,
  s,
} from "./ui";

export function StreakCard({
  streak,
  onPress,
}: {
  streak: Streak;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View streak"
      onPress={onPress}
    >
      <Card
        style={{
          backgroundColor: "#FFF4E9",
          borderColor: "#F2DECB",
          padding: 20,
        }}
      >
        <View
          style={[s.row, { flexWrap: "wrap", justifyContent: "space-between" }]}
        >
          <View style={[s.row, { flex: 1, minWidth: 200 }]}>
            <View style={[s.iconTile, { backgroundColor: "#FFE4C8" }]}>
              <Icon name="fire" color="#D77335" size={27} />
            </View>
            <View style={{ gap: 4, flex: 1 }}>
              <Heading style={{ fontSize: 18 }}>
                {streak.current} day streak
              </Heading>
              <Muted style={{ fontSize: 12 }}>
                {streak.todayLogged
                  ? "Today is in the books. Keep that spark alive."
                  : streak.current
                    ? "Your next entry keeps the fire going."
                    : "Your next entry is a fresh start."}
              </Muted>
            </View>
          </View>
          <View style={[s.row, { gap: 7 }]}>
            {[0, 1].map((i) => (
              <Icon
                key={i}
                name="freeze"
                size={18}
                color={i < streak.freezesRemaining ? C.blue : "#D6D5CF"}
              />
            ))}
            <Label style={{ fontSize: 11 }}>
              {streak.freezesRemaining}/2 freezes
            </Label>
            <Icon name="chevron" size={16} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function StreakScreen({
  data,
  profile,
  onAdd,
  onMigrate,
}: ScreenProps & { onMigrate: () => void }) {
  const today = dayKey(),
    streak = calculateStreak(profile, data.entries, today);
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const start = new Date(month + "T12:00:00"),
    offset = (start.getDay() + 6) % 7;
  const next = new Date(start);
  next.setMonth(next.getMonth() + 1);
  const end = shiftDay(dayKey(next), -1);
  const cellCount = Math.ceil((offset + Number(end.slice(-2))) / 7) * 7;
  const statuses = {
    logged: { color: "#D77335", bg: "#FFF0DF", icon: "fire", label: "Logged" },
    imported: {
      color: "#D77335",
      bg: "#FFF8EE",
      icon: "fire",
      label: "Carried streak",
    },
    frozen: { color: C.blue, bg: "#EAF2F6", icon: "freeze", label: "Frozen" },
    pending: {
      color: C.green,
      bg: C.mint,
      icon: "plus",
      label: "Ready for today",
    },
    missed: { color: C.muted, bg: "#F4F6F2", icon: "", label: "No entry" },
    future: { color: "#BBC3BD", bg: "white", icon: "", label: "Upcoming" },
  };
  function move(delta: number) {
    const d = new Date(month + "T12:00:00");
    d.setMonth(d.getMonth() + delta);
    setMonth(dayKey(d));
  }
  return (
    <View style={{ gap: 22 }}>
      <Card
        style={{
          backgroundColor: "#FFF4E9",
          borderColor: "#F2DECB",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Icon name="fire" size={62} color="#D77335" />
        <Heading style={{ fontSize: 44 }}>
          {streak.current} <Text style={{ fontSize: 20 }}>day streak</Text>
        </Heading>
        <Muted style={{ textAlign: "center" }}>
          {streak.todayLogged
            ? "You showed up today. That’s a win worth keeping."
            : streak.current
              ? "One small entry today. One more reason to believe in yourself."
              : "A new streak begins with one small step."}
        </Muted>
        <View style={[s.row, { marginTop: 5 }]}>
          <Icon name="fire" color="#D77335" size={17} />
          <Label>Best streak: {streak.best} days</Label>
        </View>
        {!streak.todayLogged && (
          <Button small icon="plus" onPress={() => onAdd("food")}>
            Earn today’s flame
          </Button>
        )}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={s.row}>
            <Icon name="freeze" color={C.blue} size={25} />
            <Heading style={{ fontSize: 17 }}>A little room for life</Heading>
          </View>
          <Label>{streak.freezesRemaining} of 2 left</Label>
        </View>
        <View style={[s.row, { marginVertical: 20 }]}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[
                s.iconTile,
                {
                  backgroundColor:
                    i < streak.freezesRemaining ? "#EAF2F6" : "#F1F2EF",
                },
              ]}
            >
              <Icon
                name="freeze"
                color={i < streak.freezesRemaining ? C.blue : "#BBC3BD"}
                size={26}
              />
            </View>
          ))}
        </View>
        <Muted>
          Your first entry of any kind earns a day. Each streak has two
          automatic freezes for completed missed days. A freeze preserves your
          count without adding a day. Today stays open until midnight in your
          device’s time zone.
        </Muted>
        <Muted style={{ marginTop: 9 }}>
          A third missed day ends the streak. Your next entry starts a new one
          with two fresh freezes. Calories never decide whether you earn a
          flame.
        </Muted>
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Heading style={{ fontSize: 17 }}>
            {start.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </Heading>
          <View style={s.row}>
            <IconButton
              name="left"
              label="Previous streak month"
              onPress={() => move(-1)}
            />
            <IconButton
              name="chevron"
              label="Next streak month"
              disabled={month.slice(0, 7) >= today.slice(0, 7)}
              onPress={() => move(1)}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", marginTop: 20 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Muted
              key={i}
              style={{ width: "14.2857%", textAlign: "center", fontSize: 11 }}
            >
              {d}
            </Muted>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {Array.from({ length: cellCount }, (_, i) => {
            const date = shiftDay(month, i - offset);
            if (date < month || date > end)
              return (
                <View key={date} style={{ width: "14.2857%", height: 67 }} />
              );
            const meta = statuses[streakDayStatus(streak, date)];
            return (
              <View key={date} style={{ width: "14.2857%", padding: 3 }}>
                <View
                  accessibilityLabel={`${date}: ${meta.label}`}
                  style={{
                    backgroundColor: meta.bg,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    height: 61,
                    gap: 5,
                    borderWidth: date === today ? 1 : 0,
                    borderColor: C.green,
                  }}
                >
                  <Text style={{ fontSize: 11, color: meta.color }}>
                    {Number(date.slice(-2))}
                  </Text>
                  {meta.icon ? (
                    <Icon name={meta.icon} color={meta.color} size={18} />
                  ) : (
                    <View style={{ height: 18 }} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={[s.wrap, { gap: 14, marginTop: 18 }]}>
          {(["logged", "frozen", "imported"] as const).map((key) => (
            <View key={key} style={[s.row, { gap: 5 }]}>
              <Icon
                name={statuses[key].icon}
                color={statuses[key].color}
                size={14}
              />
              <Muted style={{ fontSize: 10 }}>{statuses[key].label}</Muted>
            </View>
          ))}
        </View>
        {streak.seed && (
          <Muted style={{ marginTop: 14, fontSize: 11 }}>
            Carried from {streak.seed.source}: {streak.seed.days} days through{" "}
            {streak.seed.lastDate}. The carried flame marks that date. Earlier
            daily activity was not imported.
          </Muted>
        )}
      </Card>
      <Card>
        <View style={s.row}>
          <Icon name="fire" color="#D77335" />
          <Heading style={{ fontSize: 17 }}>
            Your progress comes with you
          </Heading>
        </View>
        <Muted style={{ marginTop: 10, marginBottom: 18 }}>
          Moving from Yazio or another app? Keep your current streak, or bring
          daily calorie balances and nutrients along too.
        </Muted>
        <Button secondary icon="upload" onPress={onMigrate}>
          Migrate from another app
        </Button>
      </Card>
    </View>
  );
}

export function StreakCelebration({
  count,
  onDone,
}: {
  count: number;
  onDone: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let active = true;
    const animate = (reduce: boolean) => {
      if (!active || reduce) return;
      scale.setValue(0.5);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 4,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(animate)
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (reduce) => {
        if (reduce) {
          scale.stopAnimation();
          scale.setValue(1);
        }
      },
    );
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (active && finished) onDone();
      });
    }, 4000);
    return () => {
      active = false;
      clearTimeout(timer);
      listener.remove();
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, [scale, opacity, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: 88,
        left: 20,
        right: 20,
        zIndex: 100,
        alignItems: "center",
        opacity,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 22,
          padding: 22,
          backgroundColor: "#FFF0DF",
          borderWidth: 1,
          borderColor: "#F1D5B4",
          boxShadow: "0 10px 35px rgba(90, 55, 20, 0.16)",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name="fire" size={52} color="#D77335" />
        </Animated.View>
        <Heading>{count} day streak. You showed up!</Heading>
        <Muted style={{ textAlign: "center" }}>
          {count === 1
            ? "Every great habit begins with one small step. This is yours."
            : "One more day of choosing yourself. Keep that spark alive."}
        </Muted>
      </View>
    </Animated.View>
  );
}
