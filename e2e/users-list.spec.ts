import type { Page } from "@playwright/test";
import { createTestUser, resetDb } from "@test/helpers/db";
import { expect, test } from "./coverage";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("admin@example.com");
  await page.getByLabel("パスワード").fill("admin123");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("ユーザー一覧", () => {
  test.beforeEach(async ({ page }) => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
    await login(page);
  });

  test("ユーザー一覧ページが正しく表示される", async ({ page }) => {
    await page.goto("/users");

    await expect(page).toHaveTitle("ユーザー管理");
    await expect(
      page.getByRole("heading", { name: "ユーザー管理" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規ユーザー登録" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByText("ユーザー一覧"),
    ).toBeVisible();
  });

  test("登録済みユーザーがテーブルに表示される", async ({ page }) => {
    await page.goto("/users");

    await expect(
      page.getByRole("cell", { name: "admin@example.com" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Administrator" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "編集" })).toBeVisible();
  });

  test("複数ユーザーが表示される", async ({ page }) => {
    await createTestUser({
      email: "user2@example.com",
      username: "User Two",
      password: "password123",
    });

    await page.goto("/users");

    await expect(
      page.getByRole("cell", { name: "admin@example.com" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "user2@example.com" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "User Two" })).toBeVisible();
  });

  test("新規ユーザー登録ページに遷移できる", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "新規ユーザー登録" }).click();

    await expect(page).toHaveURL("/users/new");
  });

  test("編集ページに遷移できる", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await expect(page).toHaveURL(/\/users\/\d+\/edit/);
  });
});
