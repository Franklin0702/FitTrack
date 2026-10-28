# Running Fit Track

The original README is the product specification. This implementation uses React Native, TypeScript, Expo, and Expo Router, with no account, API server, advertising, or analytics. Screen routes live in `src/app/`; the root layout keeps profile data, date selection, and dialogs available across routes.

## Development

Use Node.js 22.14 or newer (22 LTS recommended).

```sh
npm install
npm start
```

Open the project in an Expo Go version compatible with the installed Expo SDK. Scan the QR code on Android, or with the camera on iPhone. Your development machine and phone must be able to reach each other.

```sh
npm run android  # Android emulator or connected Android device
npm run ios      # iOS simulator; requires macOS and Xcode
npm run web      # browser development preview
```

For a native development build, use `npx expo run:android` or `npx expo run:ios` with the corresponding platform SDK installed. Before distributing a build, choose your own app identifiers in `app.json` and configure signing for your developer accounts.

## Included features

- Unlimited independent profiles, each with a name, calorie and nutrient targets, water and exercise goals, goal weight, and exercise routine.
- Daily food transactions with calories, protein, carbs, fiber, and fat. Budgets show consumption, remaining amounts, and overages.
- Water and exercise logs, with saved routine activities for quick entry.
- Weight and optional waist measurements, plus notes.
- Editable and deletable entries, date navigation for past days, and filtered daily journals.
- Seven-day calorie bars, weight charts, 7/30/90-day progress ranges, logged-day consistency, weight changes, and average calories on days with food logs.
- Daily or Monday measurement reminders at a chosen local time on Android and iPhone. Notification permission is requested when enabling a reminder. Tapping a reminder opens progress for that profile.
- Full JSON backup export and restore across devices, plus CSV export of all logged entries.
- A fire-themed streak card and page with a monthly activity calendar, best streak, two automatic freezes per streak, and an animated message for the first new entry today. The animation respects reduced-motion settings.
- Migration from other apps using daily nutrition CSV/JSON files, or by carrying over a current streak count and its last credited date.

## Nutrition paragraphs

Food entries have an optional **Nutrition text** field. For example, `100k|20P|30C|15F|5Fi` means 100 kcal, 20 g protein, 30 g carbs, 15 g fat, and 5 g fiber. Tokens can appear anywhere in a paragraph, in any order; letters are case-insensitive. Spaces and decimal values are supported. Repeated units are added together, so `Toast 100k 5P. Yogurt 150k 10P.` totals 250 kcal and 15 g protein. Values describe the portion eaten; nutrition is not inferred from food names.

While nutrition text contains anything beyond whitespace, calories and nutrient inputs turn gray and become read-only previews. Missing, unknown, negative, or invalid values are ignored and contribute zero for that entry, even when manual fields had values beforehand. A paragraph with no recognized tokens saves zero calories and nutrients, with a visible notice in the form. Clear the paragraph to restore the manual fields and their previous draft values.

The paragraph and its parsed totals persist when editing, exporting, and restoring entries. CSV exports include a `nutrition_text` column. Entries without a paragraph continue to use manual nutrition fields.

## Streaks and freezes

Any entry type earns a flame for its local calendar date; additional entries that day do not increase the count. There is no calorie or nutrient target requirement. Each streak gets two freezes for completed missed days, even when those missed days are separated by logged days. Frozen dates preserve the count but do not add days. Today is never frozen before it ends. A third missed day ends the streak; the next logged day starts at one with two fresh freezes. The best streak remains visible.

Dates use the device's local time zone. Backfilling or deleting daily entries recalculates the streak and frozen dates from the remaining history. Only a new first entry on the current day celebrates; editing, reloading, migration, and backfilling do not replay the animation. Deleting and re-adding today's entries does not replay a celebration that was already saved. Streaks and celebration history are independent for each profile and included in full Fit Track backups. Existing version 1 backups remain compatible.

Open **My streak → Migrate from another app** to choose either migration option:

- **Streak only:** enter the previous app's current count and last credited date. For example, 120 days through yesterday becomes 121 after the first entry today. If the count includes today, adding an entry today does not count that date twice. Older dates are subject to the two-freeze rule. Only the last credited date is marked on the calendar; earlier daily logs are not invented.
- **Full nutrition history:** download the CSV template, convert daily totals from your previous app (such as Yazio) into that format, and select the CSV or an equivalent JSON file. Review the dates and resulting streak before confirming. This imports daily summaries, rather than individual meal records. It does not connect to the previous app's account or read proprietary ZIP/PDF archives.

The daily migration columns are:

```csv
date,calories_consumed,calorie_budget,protein_g,carbs_g,fiber_g,fat_g,calories_remaining
2026-01-01,1750,2000,110,200,28,55,250
```

Use one row per day, ISO dates, plain numeric values, kcal for calories, and grams for nutrients. `calories_remaining` is optional; when provided it must equal budget minus consumed calories, including negative balances. All other columns are required. JSON accepts the same fields in an array or in a `{"days": [...]}` object. Dates later than today, duplicate dates, missing nutrients, negative consumption, and invalid balances are rejected before saving. Missing dates are subject to the normal freeze rules; imported daily records count as logged days.

Imports merge into the selected profile. Re-importing the same source and date replaces that daily summary, preventing duplicates. Food already logged locally or imported from another source on an overlapping date must be resolved first, or imported into a separate profile. Water, exercise, measurements, and other profiles remain intact. Imported calorie budgets are preserved for each date in the dashboard and journal, even after editing that daily summary. CSV log exports include those original budgets, balances, and source labels. Profile calorie targets continue to apply to days without imported budgets.

Food is entered manually using totals for the portion consumed. There is no remote food catalog. Exercise does not increase the calorie budget. The goal values offered during profile creation are editable starting values, not individualized nutrition advice. Targets apply to the whole journal, including past dates, so editing them also changes historical budget comparisons.

## Local storage and backups

Android and iPhone persist a versioned data snapshot in SQLite (`fittrack.db`), with serialized writes and WAL journaling. The web preview uses browser local storage instead. Profiles and logs remain separate by profile ID.

Export a full JSON backup from Settings to move all profiles, goals, routines, reminders, and entries to another device. Import validates the file before showing a replacement confirmation. Restore replaces local data, and restored reminders are disabled until enabled on the new device. CSV is for spreadsheet analysis and cannot be restored as a backup.

Clearing browser storage, uninstalling the app, or losing the device can remove the local journal. Browser private mode or storage restrictions can prevent saving; failed saves are reported and do not replace the visible state. Export backups regularly. Backup files contain your personal data in plain text; save them in a location you control.

Scheduled notifications and native file sharing require the mobile app. Browsers can export/import files but do not schedule reminders. The browser preview is not an offline-installable PWA. Installed native builds work without a network connection; the development app needs Metro to load its code.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build:mobile
```

`test:e2e` builds the web app and exercises it in desktop and phone-sized Chromium browsers. Screenshots and failure traces are saved in `test-results/`. The mobile bundle check exports JavaScript for both Android and iOS; it does not compile signed app binaries or verify notification delivery on a physical device.

```sh
npm run build:web
npm run preview
```

The production browser preview is served at `http://127.0.0.1:4173`. App artwork is source-controlled in `assets/brand.svg`; regenerate app icons using `npm run icons`.

At implementation time, `npm audit` reports an inherited Zod advisory through Expo's CLI. Zod is used by that CLI's development-tool schemas, not by Fit Track's journal or backup parser. The suggested automated fix downgrades Expo across major SDK versions, so it has not been applied.
