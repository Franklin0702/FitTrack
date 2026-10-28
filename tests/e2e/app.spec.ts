import { expect, test, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function createProfile(page: Page, name = "Alex") {
  await page
    .getByRole("button", { name: "Create your first profile", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Profile name", exact: true })
    .fill(name);
  await page
    .getByRole("textbox", {
      name: "Your exercise routine (one activity per line)",
      exact: true,
    })
    .fill("Morning walk\nStrength training");
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .click();
  await expect(
    page.getByText(`Looking after you, ${name}.`, { exact: true }),
  ).toBeVisible();
}

test("nutrition paragraph previews, disables individual inputs, and saves only found values", async ({
  page,
}) => {
  await page.goto("/");
  await createProfile(page);
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Food or meal name", exact: true })
    .fill("Lunch");
  const calories = page.getByRole("textbox", { name: "Calories", exact: true });
  const protein = page.getByRole("textbox", { name: "Protein", exact: true });
  const text = page.getByRole("textbox", {
    name: "Nutrition text (optional)",
    exact: true,
  });
  await calories.fill("900");
  await protein.fill("88");
  await text.fill("100k|20P|30C|15F|5Fi");
  for (const [name, value] of [
    ["Calories", "100"],
    ["Protein", "20"],
    ["Carbs", "30"],
    ["Fat", "15"],
    ["Fiber", "5"],
  ]) {
    const field = page.getByRole("textbox", { name, exact: true });
    await expect(field).toHaveValue(value);
    await expect(field).not.toBeEditable();
  }
  await text.fill("");
  await expect(calories).toBeEditable();
  await expect(calories).toHaveValue("900");
  await expect(protein).toHaveValue("88");
  await text.fill("Lunch: 100k|20P|30C|15F|5Fi");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByText("1,900", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Daily journal", exact: true }).click();
  await page.getByRole("button", { name: "Edit Lunch", exact: true }).click();
  await expect(text).toHaveValue("Lunch: 100k|20P|30C|15F|5Fi");
  await text.fill("Yogurt: 15P | unknown calories | -3F");
  await expect(calories).toHaveValue("");
  await expect(protein).toHaveValue("15");
  await expect(
    page.getByRole("textbox", { name: "Fat", exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edit Lunch", exact: true }).click();
  await expect(text).toHaveValue("Yogurt: 15P | unknown calories | -3F");
  await expect(calories).not.toBeEditable();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export full backup", exact: true })
    .click();
  const backup = JSON.parse(
    await readFile((await (await downloadPromise).path())!, "utf8"),
  );
  expect(backup.entries[0].nutrients).toEqual({
    calories: 0,
    protein: 15,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });
  expect(backup.entries[0].nutritionText).toBe(
    "Yogurt: 15P | unknown calories | -3F",
  );
});
test("daily tracking, edits, persistence, and separate profile budgets", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await createProfile(page);
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Food or meal name" })
    .fill("Yogurt & berries");
  await page
    .getByRole("textbox", { name: "Calories", exact: true })
    .fill("350");
  await page.getByRole("textbox", { name: "Protein", exact: true }).fill("25");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByText("1,650", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await page.getByRole("button", { name: "500 ml", exact: true }).click();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("button", { name: "Log exercise", exact: true }).click();
  await page.getByRole("button", { name: "Morning walk", exact: true }).click();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByRole("textbox", { name: "Weight", exact: true }).fill("74.5");
  await page
    .getByRole("textbox", { name: "Waist (optional)", exact: true })
    .fill("82");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.reload();
  await expect(page.getByText("1,650", { exact: true })).toBeVisible();
  await expect(page.getByText("74.5 kg", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/overview-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Daily journal", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Yogurt & berries", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Calories", exact: true })
    .fill("400");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("400", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Yogurt & berries", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Yogurt & berries", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "My progress", exact: true }).click();
  await expect(
    page.getByText("74.5 kg", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create another profile", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Profile name", exact: true })
    .fill("Sam");
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .click();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Looking after you, Sam.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2,000", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Morning walk", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("backup export, validated import, and restoring all profiles", async ({
  page,
}) => {
  await page.goto("/");
  await createProfile(page);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export full backup", exact: true })
    .click();
  const download = await downloadPromise;
  const backup = await readFile((await download.path())!, "utf8");
  expect(JSON.parse(backup).profiles[0].name).toBe("Alex");
  const fileChooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import backup", exact: true })
    .click();
  await (
    await fileChooser
  ).setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(
    page.getByText("Replace data with this backup?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replace and restore", exact: true })
    .click();
  await expect(
    page.getByText("Looking after you, Alex.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  const invalidChooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import backup", exact: true })
    .click();
  await (
    await invalidChooser
  ).setFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(
    page.getByText(/not a valid Fit Track version 1 backup/),
  ).toBeVisible();
  await expect(
    page.getByText("Your data belongs to you", { exact: true }),
  ).toBeVisible();
});

test("carried streak celebrates once, persists, uses two freezes and restarts after a third missed day", async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date("2026-10-27T16:00:00Z") });
  await page.goto("/");
  await createProfile(page);
  await page.getByRole("tab", { name: "My streak", exact: true }).click();
  await page
    .getByRole("button", { name: "Migrate from another app", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Current streak", exact: true })
    .fill("120");
  await page
    .getByRole("textbox", {
      name: "Last logged date (YYYY-MM-DD)",
      exact: true,
    })
    .fill("2026-10-26");
  await page
    .getByRole("button", { name: "Review migration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm migration", exact: true })
    .click();
  await expect(page.getByText("120 day streak", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(
    page.getByText("121 day streak. You showed up!", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("121 day streak", { exact: true })).toBeVisible();
  await expect(
    page.getByText("121 day streak. You showed up!", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(
    page.getByText("121 day streak. You showed up!", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit profile & goals", exact: true })
    .click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByRole("tab", { name: "My streak", exact: true }).click();
  await expect(page.getByText("121 day streak", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/streak-${info.project.name}.png`,
    fullPage: true,
  });
  await page.clock.fastForward(2 * 86400000);
  await expect(page.getByText("1 of 2 left", { exact: true })).toBeVisible();
  await page.clock.fastForward(86400000);
  await expect(page.getByText("0 of 2 left", { exact: true })).toBeVisible();
  await expect(page.getByText("121 day streak", { exact: true })).toBeVisible();
  await page.clock.fastForward(86400000);
  await expect(page.getByText("0 day streak", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Earn today’s flame", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Food or meal name" })
    .fill("A fresh start");
  await page
    .getByRole("textbox", { name: "Calories", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(
    page.getByText("1 day streak. You showed up!", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2 of 2 left", { exact: true })).toBeVisible();
});

test("full daily migration carries calorie balance and nutrients, protects gaps, and survives editing", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-27T16:00:00Z") });
  await page.goto("/");
  await createProfile(page);
  await page.getByRole("tab", { name: "My streak", exact: true }).click();
  await page
    .getByRole("button", { name: "Migrate from another app", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Full nutrition history", exact: true })
    .click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Choose CSV or JSON", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "daily.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date,calories_consumed,calorie_budget,protein_g,carbs_g,fiber_g,fat_g,calories_remaining\n2026-10-24,1700,2200,90,200,20,60,500\n2026-10-27,1500,1800,100,180,25,45,300\n",
    ),
  });
  await expect(
    page.getByText("2 days ready to review", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review migration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm migration", exact: true })
    .click();
  await expect(page.getByText("2 day streak", { exact: true })).toBeVisible();
  await expect(page.getByText("0 of 2 left", { exact: true })).toBeVisible();
  await expect(page.getByLabel("2026-10-25: Frozen")).toBeVisible();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByText("300", { exact: true })).toBeVisible();
  await expect(page.getByText("1,800 kcal", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Daily journal", exact: true }).click();
  await expect(
    page.getByText("of 1,800 kcal used", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Yazio · daily totals", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Calories", exact: true })
    .fill("1600");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("of 1,800 kcal used", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByText("200", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export full backup", exact: true })
    .click();
  const backup = JSON.parse(
    await readFile((await (await downloadPromise).path())!, "utf8"),
  );
  const today = backup.entries.find(
    (e: { date: string }) => e.date === "2026-10-27",
  );
  expect(today.migration).toEqual({ source: "Yazio", calorieBudget: 1800 });
  expect(today.nutrients).toEqual({
    calories: 1600,
    protein: 100,
    carbs: 180,
    fiber: 25,
    fat: 45,
  });
});
