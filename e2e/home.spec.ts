import { createTestUser, resetDb } from "@test/helpers/db";
import { expect, test } from "./coverage";

test.describe("トップページ", () => {
  test.beforeEach(async () => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
  });

  test("未ログイン時はログインページにリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("ログイン後にトップページが正しく表示される", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("New React Router App");
    await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
    await expect(
      page.getByText("こんにちは、admin@example.comさん！"),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "ユーザー一覧" }),
    ).toBeVisible();
  });

  test("ヘッダーにユーザー情報が表示される", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");

    const header = page.getByRole("banner");
    await expect(
      header.getByText("こんにちは、Administratorさん"),
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "ユーザー一覧" }),
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: "ログアウト" }),
    ).toBeVisible();
  });

  test("トップページからユーザー一覧に遷移できる", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: "ユーザー一覧" }).first().click();
    await expect(page).toHaveURL("/users");
  });
});
