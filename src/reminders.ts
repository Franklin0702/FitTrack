import { Platform } from "react-native";
import { Profile } from "./model";

let pending: Promise<unknown> = Promise.resolve();
export function syncReminders(
  profiles: Profile[],
  requestPermission = false,
): Promise<boolean> {
  const operation = pending
    .catch(() => {})
    .then(() => schedule(profiles, requestPermission));
  pending = operation;
  return operation;
}
async function schedule(
  profiles: Profile[],
  requestPermission: boolean,
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("measurements", {
      name: "Measurement reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission)
    permission = await Notifications.requestPermissionsAsync();
  // This app owns its scheduled local notifications; rebuild them after profile changes.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!permission.granted) return false;
  for (const profile of profiles) {
    if (!profile.reminder.enabled) continue;
    const { hour, minute, frequency } = profile.reminder;
    await Notifications.scheduleNotificationAsync({
      identifier: `measurement-${profile.id}`,
      content: {
        title: `A little check-in, ${profile.name}`,
        body: "Log your weight and measurements in Fit Track. Every step counts.",
        data: { profileId: profile.id, screen: "progress" },
      },
      trigger:
        frequency === "daily"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
              channelId: "measurements",
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 2,
              hour,
              minute,
              channelId: "measurements",
            },
    });
  }
  return true;
}
