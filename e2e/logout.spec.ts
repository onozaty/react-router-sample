import { createTestUser, resetDb } from "@test/helpers/db";
import { expect, test } from "./coverage";

test.describe("ログアウト", () => {
  test.beforeEach(async () => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
  });

  test("ヘッダーのログアウトボタンでログアウトできる", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(page).toHaveURL("/login");
  });

  test("ログアウト後に認証が必要なページにアクセスするとリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("admin123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });
});
