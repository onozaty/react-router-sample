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

test.describe("ユーザー新規作成", () => {
  test.beforeEach(async ({ page }) => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
    await login(page);
  });

  test("ユーザー登録ページが正しく表示される", async ({ page }) => {
    await page.goto("/users/new");

    await expect(page).toHaveTitle("ユーザー登録");
    await expect(
      page.getByRole("heading", { name: "ユーザー登録" }),
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("ユーザー名")).toBeVisible();
    await expect(page.getByLabel(/^パスワード \*$/)).toBeVisible();
    await expect(page.getByLabel(/^パスワード確認/)).toBeVisible();
    await expect(page.getByRole("button", { name: "登録" })).toBeVisible();
    await expect(page.getByRole("link", { name: "キャンセル" })).toBeVisible();
  });

  test("新規ユーザーを登録できる", async ({ page }) => {
    await page.goto("/users/new");

    await page.getByLabel("メールアドレス").fill("newuser@example.com");
    await page.getByLabel("ユーザー名").fill("New User");
    await page.getByLabel(/^パスワード \*$/).fill("password123");
    await page.getByLabel(/^パスワード確認/).fill("password123");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(page).toHaveURL("/users");
    await expect(
      page.getByRole("cell", { name: "newuser@example.com" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "New User" })).toBeVisible();
  });

  test("メールアドレスのバリデーションエラーが表示される", async ({ page }) => {
    await page.goto("/users/new");

    await page.getByLabel("メールアドレス").fill("invalid-email");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(
      page.getByText("有効なメールアドレスを入力してください"),
    ).toBeVisible();
  });

  test("パスワードが短い場合にバリデーションエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/users/new");

    await page.getByLabel(/^パスワード \*$/).fill("12345");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(
      page.getByText("パスワードは6文字以上で入力してください"),
    ).toBeVisible();
  });

  test("パスワード不一致のバリデーションエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/users/new");

    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel(/^パスワード \*$/).fill("password123");
    await page.getByLabel(/^パスワード確認/).fill("different123");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(page.getByText("パスワードが一致しません")).toBeVisible();
  });

  test("重複するメールアドレスでエラーが表示される", async ({ page }) => {
    await page.goto("/users/new");

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel(/^パスワード \*$/).fill("password123");
    await page.getByLabel(/^パスワード確認/).fill("password123");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(
      page.getByText("このメールアドレスは既に使用されています"),
    ).toBeVisible();
  });

  test("キャンセルでユーザー一覧に戻れる", async ({ page }) => {
    await page.goto("/users/new");
    await page.getByRole("link", { name: "キャンセル" }).click();

    await expect(page).toHaveURL("/users");
  });
});
