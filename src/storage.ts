import { Platform } from "react-native";
import { Data, emptyData, parseBackup } from "./model";

const KEY = "fittrack.data.v1";
let database: Promise<import("expo-sqlite").SQLiteDatabase> | undefined;
async function db() {
  if (!database)
    database = (async () => {
      const SQLite = await import("expo-sqlite");
      const connection = await SQLite.openDatabaseAsync("fittrack.db");
      await connection.execAsync(
        "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);",
      );
      return connection;
    })();
  return database;
}
export async function loadData(): Promise<Data> {
  const raw =
    Platform.OS === "web"
      ? localStorage.getItem(KEY)
      : (
          await (
            await db()
          ).getFirstAsync<{ data: string }>(
            "SELECT data FROM app_state WHERE id = 1",
          )
        )?.data;
  // The file import size cap should not limit a growing on-device journal.
  return raw ? parseBackup(raw, Infinity) : emptyData();
}
// Serialize writes so rapid taps cannot let an older snapshot overwrite a newer one.
let pending = Promise.resolve();
export function saveData(data: Data): Promise<void> {
  const raw = JSON.stringify(data);
  const operation = pending
    .catch(() => {})
    .then(async () => {
      if (Platform.OS === "web") localStorage.setItem(KEY, raw);
      else
        await (
          await db()
        ).runAsync(
          "INSERT INTO app_state (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
          raw,
        );
    });
  pending = operation;
  return operation;
}
