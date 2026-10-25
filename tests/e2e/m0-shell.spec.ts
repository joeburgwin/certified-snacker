import { expect, test } from "@playwright/test";

const run = Date.now().toString(36);
const email = `joe+${run}@example.test`;
const password = "correct-horse-battery";

test.describe.configure({ mode: "serial" });

test("unauthenticated visits are sent to sign-in", async ({ page }) => {
  await page.goto("/week");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fweek/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign up, name the household, land on an empty week", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Joe");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Name your household" }),
  ).toBeVisible();
  await expect(page.getByLabel("You")).toHaveValue("Joe");
  await page.getByLabel("Household").fill("Burgwin HQ");
  await page.getByRole("button", { name: "Create household" }).click();

  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("–");
  await expect(page.getByRole("columnheader")).toHaveCount(8);
  await expect(page.getByText("Your week is empty.")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Dinner" })).toBeVisible();
});

test("signed-in user can sign in again and reach the week", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/week$/);

  // Week navigation keeps canonical Monday dates.
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/week$/);

  // Theme toggle flips the data-theme attribute.
  const html = page.locator("html");
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // Sign out from the account menu.
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
