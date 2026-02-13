import { expect, test } from "@playwright/test";
import { createTestUser, resetDb } from "@test/helpers/db";

test.describe("ログイン画面", () => {
  test.beforeEach(async ({ page }) => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
    await page.goto("/login");
  });

  test("ログイン画面が正しく表示される", async ({ page }) => {
    await expect(page).toHaveTitle("ログイン");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(
      page.getByText("アカウントにログインしてください"),
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("正しい認証情報でログインできる", async ({ page }) => {
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByText("こんにちは、admin@example.comさん！"),
    ).toBeVisible();
  });

  test("間違ったパスワードでエラーが表示される", async ({ page }) => {
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page.getByText("メールアドレスまたはパスワードが間違っています"),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("存在しないメールアドレスでエラーが表示される", async ({ page }) => {
    await page.getByLabel("メールアドレス").fill("nonexistent@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page.getByText("メールアドレスまたはパスワードが間違っています"),
    ).toBeVisible();
  });

  test("メールアドレスのバリデーションエラーが表示される", async ({ page }) => {
    await page.getByLabel("メールアドレス").fill("invalid-email");
    await page.getByLabel("パスワード").click();

    await expect(
      page.getByText("有効なメールアドレスを入力してください"),
    ).toBeVisible();
  });

  test("パスワード未入力のバリデーションエラーが表示される", async ({
    page,
  }) => {
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("Required")).toBeVisible();
  });

  test("既にログイン済みの場合、トップページにリダイレクトされる", async ({
    page,
  }) => {
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});
