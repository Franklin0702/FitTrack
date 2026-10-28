import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Data,
  dayKey,
  dayLabel,
  emptyData,
  Entry,
  parseBackup,
  Profile,
  shiftDay,
  csvExport,
} from "./src/model";
import { loadData, saveData } from "./src/storage";
import { syncReminders } from "./src/reminders";
import { exportFile, pickBackup } from "./src/transfer";
import { EntryForm, ProfileForm, ReminderForm } from "./src/forms";
import type { Settings, ScreenProps } from "./src/screens";
import { ScreenContext } from "./src/screen-context";
import { Slot, router, usePathname } from "expo-router";
import { calculateStreak } from "./src/streak";
import { StreakCelebration } from "./src/streak-ui";
import { MigrationForm, Migration } from "./src/migration-form";
import { applyMigration, applySeed } from "./src/migration";
import {
  Button,
  C,
  Heading,
  Icon,
  IconButton,
  Muted,
  s,
  Sheet,
} from "./src/ui";

type Tab = "overview" | "diary" | "progress" | "settings" | "streak";
type Dialog =
  | { type: "entry"; kind: Entry["kind"]; entry?: Entry }
  | { type: "profile"; profile?: Profile }
  | { type: "profiles" }
  | { type: "reminder" }
  | { type: "migration" }
  | null;
type Confirmation = {
  title: string;
  detail: string;
  action: string;
  run: () => Promise<void>;
};
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "diary", label: "Daily journal", icon: "book" },
  { id: "progress", label: "My progress", icon: "chart" },
  { id: "streak", label: "My streak", icon: "fire" },
  { id: "settings", label: "Settings", icon: "user" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <FitTrack />
    </SafeAreaProvider>
  );
}
function FitTrack() {
  const [data, setData] = useState<Data>(emptyData),
    dataRef = useRef(data);
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const pathname = usePathname();
  const tab: Tab =
    pathname === "/diary"
      ? "diary"
      : pathname === "/progress"
        ? "progress"
        : pathname === "/streak"
          ? "streak"
          : pathname === "/settings"
            ? "settings"
            : "overview";
  const [day, setDay] = useState(dayKey());
  const [, setToday] = useState(dayKey());
  const [celebration, setCelebration] = useState<{
    count: number;
    profileId: string;
    date: string;
  } | null>(null);
  const dismissCelebration = useCallback(() => setCelebration(null), []);
  const [dialog, setDialog] = useState<Dialog>(null),
    [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false),
    [notice, setNotice] = useState("");
  const mutation = useRef(Promise.resolve());
  const previousToday = useRef(dayKey());
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const desktop = useWindowDimensions().width >= 900;
  const profile =
    data.profiles.find((p) => p.id === data.activeProfileId) ??
    data.profiles[0];
  useEffect(() => {
    setCelebration(null);
  }, [profile?.id]);
  const commit = useCallback(
    (update: (previous: Data) => Data): Promise<void> => {
      const operation = mutation.current
        .catch(() => {})
        .then(async () => {
          const next = update(dataRef.current);
          await saveData(next);
          dataRef.current = next;
          setData(next);
        });
      mutation.current = operation;
      return operation;
    },
    [],
  );
  const report = (error: unknown) =>
    setNotice(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
    );
  const restore = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const saved = await loadData();
      dataRef.current = saved;
      setData(saved);
    } catch (e) {
      setLoadError(
        `Your saved data could not be opened. ${e instanceof Error ? e.message : ""}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void restore();
  }, [restore]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    if (loading || loadError) return;
    void syncReminders(data.profiles).catch(() =>
      setNotice(
        "Your data is saved, but reminders could not be scheduled. Check notification permissions in device settings.",
      ),
    );
  }, [loading, loadError, data.profiles]);
  useEffect(() => {
    if (loading || loadError) return;
    let disposed = false;
    let subscription: { remove: () => void } | undefined;
    if (Platform.OS !== "web")
      void import("expo-notifications")
        .then(async (notifications) => {
          const open = (
            response: import("expo-notifications").NotificationResponse | null,
          ) => {
            if (!response || disposed) return;
            const profileId =
              response.notification.request.content.data?.profileId;
            if (typeof profileId === "string")
              void commit((d) =>
                d.profiles.some((p) => p.id === profileId)
                  ? { ...d, activeProfileId: profileId }
                  : d,
              ).catch(report);
            router.replace("/progress");
            setDay(dayKey());
          };
          if (disposed) return;
          subscription =
            notifications.addNotificationResponseReceivedListener(open);
          open(await notifications.getLastNotificationResponseAsync());
          await notifications.clearLastNotificationResponseAsync();
        })
        .catch(report);
    return () => {
      disposed = true;
      subscription?.remove();
    };
  }, [commit, loading, loadError]);
  useEffect(() => {
    const refreshDay = () => {
      const today = dayKey(),
        previous = previousToday.current;
      previousToday.current = today;
      setToday(today);
      setDay((current) =>
        current === previous || current > today ? today : current,
      );
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshDay();
    });
    const timer = setInterval(refreshDay, 30000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  function navigate(next: Tab) {
    router.navigate(next === "overview" ? "/" : `/${next}`);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  async function saveProfile(p: Profile) {
    await commit((d) => ({
      ...d,
      activeProfileId: p.id,
      profiles: d.profiles.some((existing) => existing.id === p.id)
        ? d.profiles.map((existing) => (existing.id === p.id ? p : existing))
        : [...d.profiles, p],
    }));
    setNotice("Profile saved. Make this journey your own.");
  }
  async function saveEntry(entry: Entry) {
    let earned: { count: number; profileId: string; date: string } | null =
      null;
    await commit((d) => {
      const p = d.profiles.find((p) => p.id === entry.profileId);
      if (!p) throw new Error("This profile no longer exists.");
      const isNew = !d.entries.some((e) => e.id === entry.id);
      const firstToday =
        isNew &&
        entry.date === dayKey() &&
        !d.entries.some((e) => e.profileId === p.id && e.date === entry.date) &&
        p.streak?.seed?.lastDate !== entry.date &&
        !p.streak?.celebratedDates?.includes(entry.date);
      const entries = isNew
        ? [...d.entries, entry]
        : d.entries.map((e) => (e.id === entry.id ? entry : e));
      if (!firstToday) return { ...d, entries };
      const updated: Profile = {
        ...p,
        streak: {
          ...p.streak,
          celebratedDates: [...(p.streak?.celebratedDates ?? []), entry.date],
        },
      };
      earned = {
        count: calculateStreak(updated, entries).current,
        profileId: p.id,
        date: entry.date,
      };
      return {
        ...d,
        entries,
        profiles: d.profiles.map((existing) =>
          existing.id === p.id ? updated : existing,
        ),
      };
    });
    if (earned) setCelebration(earned);
    setNotice("Entry saved on this device.");
  }
  async function migrate(migration: Migration) {
    if (!profile) return;
    await commit((d) => {
      if (migration.kind === "full")
        return applyMigration(d, profile.id, migration.days, migration.source);
      return {
        ...d,
        profiles: d.profiles.map((p) =>
          p.id === profile.id ? applySeed(p, migration.seed) : p,
        ),
      };
    });
    setNotice("Migration saved. Your journey continues here.");
  }
  function deleteEntry(entry: Entry) {
    setConfirm({
      title: "Delete this entry?",
      detail:
        "This will remove the entry and update your daily totals. This action cannot be undone.",
      action: "Delete entry",
      run: async () => {
        await commit((d) => ({
          ...d,
          entries: d.entries.filter((e) => e.id !== entry.id),
        }));
        setNotice("Entry deleted. Your totals are up to date.");
      },
    });
  }
  async function exportData(format: "json" | "csv") {
    try {
      await exportFile(
        format === "json"
          ? JSON.stringify(dataRef.current, null, 2)
          : csvExport(dataRef.current),
        `fittrack-${dayKey()}.${format}`,
        format === "json" ? "application/json" : "text/csv",
      );
      setNotice(
        Platform.OS === "web"
          ? "Export downloaded. Keep your backup somewhere safe."
          : "Export ready. Use the share menu to save a copy.",
      );
    } catch (e) {
      report(e);
    }
  }
  async function importData() {
    try {
      const raw = await pickBackup();
      if (raw === null) return;
      const imported = parseBackup(raw);
      setConfirm({
        title: "Replace data with this backup?",
        detail: `This backup contains ${imported.profiles.length} profiles and ${imported.entries.length} entries. All profiles and entries currently on this device will be replaced. Export a backup first if you want to keep them. Imported reminders will be turned off until you enable them on this device.`,
        action: "Replace and restore",
        run: async () => {
          await commit(() => ({
            ...imported,
            activeProfileId:
              imported.activeProfileId ?? imported.profiles[0]?.id ?? null,
            profiles: imported.profiles.map((p) => ({
              ...p,
              reminder: { ...p.reminder, enabled: false },
            })),
          }));
          setDay(dayKey());
          navigate("overview");
          setNotice("Backup restored. Your history is ready.");
        },
      });
    } catch (e) {
      report(e);
    }
  }
  const screenProps: ScreenProps | null = profile
    ? {
        data,
        profile,
        day,
        onAdd: (kind) => {
          if (tab === "streak") setDay(dayKey());
          setDialog({ type: "entry", kind });
        },
        onEdit: (entry) =>
          setDialog({ type: "entry", kind: entry.kind, entry }),
        onDelete: deleteEntry,
        onTab: navigate,
      }
    : null;
  const settingsProps: React.ComponentProps<typeof Settings> | null = profile
    ? {
        data,
        profile,
        onProfile: () => setDialog({ type: "profile", profile }),
        onReminder: () => setDialog({ type: "reminder" }),
        onExport: exportData,
        onImport: importData,
        onDeleteProfile: () =>
          setConfirm({
            title: `Delete ${profile.name}?`,
            detail:
              "This permanently removes this profile, its targets, routine, reminders, and all its entries. Export a backup before deleting if you want to keep a copy.",
            action: "Delete profile",
            run: async () => {
              await commit((d) => {
                const profiles = d.profiles.filter((p) => p.id !== profile.id);
                return {
                  ...d,
                  profiles,
                  entries: d.entries.filter((e) => e.profileId !== profile.id),
                  activeProfileId: profiles[0]?.id ?? null,
                };
              });
              navigate("overview");
              setNotice("Profile and its entries deleted.");
            },
          }),
      }
    : null;
  const brand = (
    <View style={[s.row, { gap: 10 }]}>
      <View
        style={{
          width: 34,
          height: 36,
          backgroundColor: C.green,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="leaf" color="white" size={22} />
      </View>
      <Text
        style={{
          fontSize: 23,
          fontWeight: "700",
          letterSpacing: -1,
          color: C.ink,
        }}
      >
        fittrack<Text style={{ color: C.green }}>.</Text>
      </Text>
    </View>
  );
  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <Slot />
        <ActivityIndicator color={C.green} size="large" />
        <Muted>Opening your local journal…</Muted>
      </SafeAreaView>
    );
  if (loadError)
    return (
      <SafeAreaView style={styles.center}>
        <Slot />
        <Icon name="shield" color={C.danger} size={40} />
        <Heading>Your data needs attention</Heading>
        <Muted style={{ maxWidth: 440, textAlign: "center" }}>
          {loadError}
        </Muted>
        <Button onPress={restore}>Try opening again</Button>
        <Muted>Your saved data has not been overwritten.</Muted>
      </SafeAreaView>
    );
  return (
    <ScreenContext.Provider
      value={{
        screen: screenProps,
        settings: settingsProps,
        onMigrate: () => setDialog({ type: "migration" }),
      }}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.bg }}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {desktop && (
            <View style={styles.sidebar}>
              <View style={{ paddingLeft: 10, marginBottom: 45 }}>{brand}</View>
              <Text style={styles.navCaption}>YOUR SPACE</Text>
              <View style={{ gap: 8 }}>
                {tabs.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === t.id }}
                    onPress={() => navigate(t.id)}
                    style={[
                      styles.navItem,
                      tab === t.id && { backgroundColor: C.mint },
                    ]}
                  >
                    <Icon
                      name={t.icon}
                      color={tab === t.id ? C.green : C.muted}
                      size={20}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: tab === t.id ? C.green : C.muted,
                        fontWeight: tab === t.id ? "600" : "400",
                      }}
                    >
                      {t.label}
                    </Text>
                    {tab === t.id && (
                      <View
                        style={{
                          marginLeft: "auto",
                          width: 5,
                          height: 5,
                          borderRadius: 5,
                          backgroundColor: C.green,
                        }}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1 }} />
              <View
                style={{
                  backgroundColor: "#F1F4E9",
                  padding: 18,
                  borderRadius: 16,
                  gap: 10,
                }}
              >
                <Icon name="sun" color={C.green} />
                <Heading style={{ fontSize: 15 }}>A little, every day.</Heading>
                <Muted style={{ fontSize: 12 }}>
                  Build habits that feel good. This space is yours.
                </Muted>
              </View>
              <View style={[s.row, { marginTop: 26, paddingHorizontal: 10 }]}>
                <Icon name="shield" color={C.muted} size={14} />
                <Muted style={{ fontSize: 11 }}>Private by nature</Muted>
              </View>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View
              style={[styles.topbar, { paddingHorizontal: desktop ? 38 : 20 }]}
            >
              {desktop ? (
                <Muted style={{ fontSize: 12 }}>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Muted>
              ) : (
                brand
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch profile"
                onPress={() => setDialog({ type: "profiles" })}
                style={[s.row, { gap: 9 }]}
              >
                <View style={styles.avatar}>
                  <Text
                    style={{ color: C.green, fontWeight: "700", fontSize: 13 }}
                  >
                    {profile ? profile.name[0].toUpperCase() : "?"}
                  </Text>
                </View>
                {desktop && (
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 13,
                      color: C.ink,
                      maxWidth: 160,
                    }}
                    numberOfLines={1}
                  >
                    {profile?.name ?? "Your profile"}
                  </Text>
                )}
                <Icon name="down" size={14} />
              </Pressable>
            </View>
            {notice ? (
              <Pressable
                accessibilityRole="alert"
                onPress={() => setNotice("")}
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: C.mint,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: C.green, fontSize: 13 }}>{notice}</Text>
              </Pressable>
            ) : null}
            <ScrollView
              ref={scroll}
              contentContainerStyle={{
                padding: desktop ? 38 : 20,
                paddingTop: desktop ? 30 : 22,
                gap: 25,
                maxWidth: 1520,
                width: "100%",
                alignSelf: "center",
                paddingBottom: 40,
              }}
            >
              {profile ? (
                <>
                  <View
                    style={[
                      s.wrap,
                      {
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 18,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 230 }}>
                      <Muted
                        style={{
                          fontSize: 10,
                          letterSpacing: 2,
                          fontWeight: "600",
                          marginBottom: 5,
                        }}
                      >
                        SMALL STEPS. LASTING CHANGE.
                      </Muted>
                      <Heading
                        style={{
                          fontSize: desktop ? 30 : 27,
                          letterSpacing: -1,
                        }}
                      >
                        {tab === "overview"
                          ? `Looking after you, ${profile.name}.`
                          : tab === "diary"
                            ? "Your daily journal"
                            : tab === "progress"
                              ? "See how far you’ve come"
                              : tab === "streak"
                                ? "Keep your spark alive"
                                : "Your space, your way"}
                      </Heading>
                      <Muted style={{ marginTop: 7 }}>
                        {tab === "overview"
                          ? "A little more balance, one day at a time."
                          : tab === "diary"
                            ? "Meals, movement, and everything in between."
                            : tab === "progress"
                              ? "Celebrate the habits behind the numbers."
                              : tab === "streak"
                                ? "Every day you show up is a reason to keep going."
                                : "Personal goals. Private data. All in your control."}
                      </Muted>
                    </View>
                    {tab !== "settings" && tab !== "streak" && (
                      <View
                        style={[
                          s.row,
                          {
                            gap: 3,
                            borderWidth: 1,
                            borderColor: C.line,
                            borderRadius: 11,
                            padding: 4,
                            backgroundColor: C.white,
                          },
                        ]}
                      >
                        <IconButton
                          name="left"
                          onPress={() => setDay(shiftDay(day, -1))}
                          label="Previous day"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Return to today"
                          onPress={() => setDay(dayKey())}
                          style={{ minWidth: 88, alignItems: "center" }}
                        >
                          <Text
                            style={{
                              color: C.ink,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {dayLabel(day)}
                          </Text>
                          {day !== dayKey() && (
                            <Text style={{ color: C.muted, fontSize: 9 }}>
                              Back to today
                            </Text>
                          )}
                        </Pressable>
                        <IconButton
                          name="chevron"
                          onPress={() => setDay(shiftDay(day, 1))}
                          disabled={day >= dayKey()}
                          label="Next day"
                        />
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View
                  style={{ alignItems: "center", paddingVertical: 60, gap: 20 }}
                >
                  <View
                    style={{
                      backgroundColor: C.mint,
                      width: 100,
                      height: 100,
                      borderRadius: 35,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="leaf" size={52} color={C.green} />
                  </View>
                  <Muted style={{ letterSpacing: 2, fontSize: 11 }}>
                    A LITTLE MORE IN TUNE WITH YOU
                  </Muted>
                  <Heading
                    style={{ fontSize: 36, textAlign: "center", maxWidth: 500 }}
                  >
                    Make room for a healthier everyday.
                  </Heading>
                  <Muted
                    style={{
                      maxWidth: 410,
                      textAlign: "center",
                      fontSize: 15,
                      lineHeight: 24,
                    }}
                  >
                    Track your nutrition, water, movement, and progress in one
                    calm space. No ads, no account. Just your goals, at your
                    pace.
                  </Muted>
                  <View style={{ marginTop: 12 }}>
                    <Button
                      icon="plus"
                      onPress={() => setDialog({ type: "profile" })}
                    >
                      Create your first profile
                    </Button>
                  </View>
                  <Button secondary icon="upload" onPress={importData}>
                    Restore a backup
                  </Button>
                  <View style={[s.row, { marginTop: 26 }]}>
                    <Icon name="shield" size={16} color={C.green} />
                    <Muted>Everything stays on your device.</Muted>
                  </View>
                </View>
              )}
              <Slot />
            </ScrollView>
            {!desktop && (
              <View style={styles.bottomNav}>
                {tabs.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityRole="tab"
                    accessibilityLabel={t.label}
                    accessibilityState={{ selected: tab === t.id }}
                    onPress={() => navigate(t.id)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      gap: 5,
                      paddingVertical: 10,
                    }}
                  >
                    <Icon
                      name={t.icon}
                      color={tab === t.id ? C.green : C.muted}
                      size={20}
                    />
                    <Text
                      style={{
                        fontSize: 9,
                        color: tab === t.id ? C.green : C.muted,
                        fontWeight: tab === t.id ? "700" : "400",
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        {dialog?.type === "profile" && (
          <ProfileForm
            profile={dialog.profile}
            onSave={saveProfile}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === "entry" && profile && (
          <EntryForm
            kind={dialog.kind}
            initial={dialog.entry}
            profile={profile}
            date={dialog.entry?.date ?? day}
            onSave={saveEntry}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === "reminder" && profile && (
          <ReminderForm
            profile={profile}
            onClose={() => setDialog(null)}
            onSave={async (p) => {
              const next = dataRef.current.profiles.map((existing) =>
                existing.id === p.id ? p : existing,
              );
              const scheduled = await syncReminders(next, p.reminder.enabled);
              if (p.reminder.enabled && !scheduled)
                throw new Error(
                  "Notifications are not allowed. Enable them in your device settings, then try again.",
                );
              await saveProfile(p);
            }}
          />
        )}
        {dialog?.type === "profiles" && (
          <Sheet
            title="Your profiles"
            subtitle="Different people. Different chapters. Always local."
            onClose={() => setDialog(null)}
          >
            {data.profiles.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => {
                  void commit((d) => ({ ...d, activeProfileId: p.id }))
                    .then(() => {
                      setDialog(null);
                      setDay(dayKey());
                    })
                    .catch(report);
                }}
                style={[
                  s.row,
                  {
                    padding: 15,
                    borderRadius: 12,
                    backgroundColor: p.id === profile?.id ? C.mint : C.bg,
                  },
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={{ color: C.green, fontWeight: "700" }}>
                    {p.name[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontWeight: "600", color: C.ink }}>
                  {p.name}
                </Text>
                {p.id === profile?.id && (
                  <Icon name="check" color={C.green} size={19} />
                )}
              </Pressable>
            ))}
            <Button icon="plus" onPress={() => setDialog({ type: "profile" })}>
              Create another profile
            </Button>
            <Muted>
              Unlimited profiles, without an account. Each has its own goals and
              daily logs.
            </Muted>
          </Sheet>
        )}
        {dialog?.type === "migration" && profile && (
          <MigrationForm
            profile={profile}
            data={data}
            onSave={migrate}
            onClose={() => setDialog(null)}
          />
        )}
        {celebration && celebration.profileId === profile?.id && (
          <StreakCelebration
            key={`${celebration.profileId}:${celebration.date}`}
            count={celebration.count}
            onDone={dismissCelebration}
          />
        )}
        {confirm && (
          <Sheet
            title={confirm.title}
            onClose={() => {
              if (!confirmBusy) setConfirm(null);
            }}
          >
            <Muted>{confirm.detail}</Muted>
            <Button
              danger
              onPress={async () => {
                setConfirmBusy(true);
                try {
                  await confirm.run();
                  setConfirm(null);
                } catch (e) {
                  report(e);
                } finally {
                  setConfirmBusy(false);
                }
              }}
              busy={confirmBusy}
            >
              {confirm.action}
            </Button>
            <Button
              secondary
              disabled={confirmBusy}
              onPress={() => setConfirm(null)}
            >
              Keep current data
            </Button>
          </Sheet>
        )}
      </SafeAreaView>
    </ScreenContext.Provider>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    gap: 20,
  },
  sidebar: {
    width: 236,
    padding: 24,
    paddingTop: 36,
    backgroundColor: "white",
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  navCaption: {
    color: "#9AA69E",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.8,
    paddingLeft: 14,
    marginBottom: 17,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 13,
    borderRadius: 12,
  },
  topbar: {
    height: 80,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderBottomColor: C.line,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopColor: C.line,
    borderTopWidth: 1,
    paddingHorizontal: 8,
  },
});
