import { expect, test } from "@playwright/test";

test("homepage introduces Acme and links to login", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Welcome to Acme.")).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Please log in to continue." }),
  ).toBeVisible();
});

test("login form exposes required email and password inputs", async ({
  page,
}) => {
  await page.goto("/login");

  const email = page.getByRole("textbox", { name: "Email" });
  const password = page.getByLabel("Password");

  await expect(email).toHaveAttribute("type", "email");
  await expect(email).toHaveAttribute("required", "");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("minlength", "6");
  await expect(password).toHaveAttribute("required", "");
});

test("login form blocks invalid email and short passwords", async ({
  page,
}) => {
  await page.goto("/login");

  const email = page.getByRole("textbox", { name: "Email" });
  const password = page.getByLabel("Password");

  await email.fill("not-an-email");
  await password.fill("12345");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(email).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);

  await email.fill("user@example.com");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(password).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);
});

test("unauthenticated dashboard visitors are sent to login", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(
    page.getByRole("heading", { name: "Please log in to continue." }),
  ).toBeVisible();
});
