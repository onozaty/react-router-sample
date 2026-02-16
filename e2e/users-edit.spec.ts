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

test.describe("ユーザー編集", () => {
  test.beforeEach(async ({ page }) => {
    await resetDb();
    await createTestUser({
      email: "admin@example.com",
      username: "Administrator",
      password: "admin123",
    });
    await login(page);
  });

  test("ユーザー編集ページが正しく表示される", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await expect(page).toHaveTitle("ユーザー編集");
    await expect(
      page.getByRole("heading", { name: "ユーザー編集" }),
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toHaveValue(
      "admin@example.com",
    );
    await expect(page.getByLabel("ユーザー名")).toHaveValue("Administrator");
    await expect(page.getByRole("button", { name: "更新" })).toBeVisible();
    await expect(page.getByRole("link", { name: "キャンセル" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ユーザーを削除" }),
    ).toBeVisible();
  });

  test("ユーザー情報を更新できる", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await page.getByLabel("メールアドレス").clear();
    await page.getByLabel("メールアドレス").fill("updated@example.com");
    await page.getByLabel("ユーザー名").clear();
    await page.getByLabel("ユーザー名").fill("Updated User");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(page).toHaveURL("/users");
    await expect(
      page.getByRole("cell", { name: "updated@example.com" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Updated User" }),
    ).toBeVisible();
  });

  test("メールアドレスのバリデーションエラーが表示される", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await page.getByLabel("メールアドレス").clear();
    await page.getByLabel("メールアドレス").fill("invalid-email");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByText("有効なメールアドレスを入力してください"),
    ).toBeVisible();
  });

  test("重複するメールアドレスでエラーが表示される", async ({ page }) => {
    await createTestUser({
      email: "other@example.com",
      password: "password123",
    });

    await page.goto("/users");
    await page
      .getByRole("row", { name: /admin@example\.com/ })
      .getByRole("link", { name: "編集" })
      .click();

    await page.getByLabel("メールアドレス").clear();
    await page.getByLabel("メールアドレス").fill("other@example.com");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByText("このメールアドレスは既に使用されています"),
    ).toBeVisible();
  });

  test("ユーザーを削除できる", async ({ page }) => {
    await createTestUser({
      email: "delete-me@example.com",
      username: "Delete Me",
      password: "password123",
    });

    await page.goto("/users");
    await expect(
      page.getByRole("cell", { name: "delete-me@example.com" }),
    ).toBeVisible();

    await page
      .getByRole("row", { name: /delete-me@example\.com/ })
      .getByRole("link", { name: "編集" })
      .click();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "ユーザーを削除" }).click();

    await expect(page).toHaveURL("/users");
    await expect(
      page.getByRole("cell", { name: "delete-me@example.com" }),
    ).not.toBeVisible();
  });

  test("パスワードを更新できる", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await page.getByLabel("パスワード", { exact: true }).fill("newpassword123");
    await page.getByLabel("パスワード確認").fill("newpassword123");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(page).toHaveURL("/users");

    // 変更後のパスワードでログインできることを確認
    await page.goto("/logout");
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("newpassword123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/");
  });

  test("パスワードが6文字未満の場合エラーが表示される", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await page.getByLabel("パスワード", { exact: true }).fill("short");
    await page.getByLabel("パスワード確認").fill("short");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByText(
        "パスワードは6文字以上で、確認用パスワードと一致している必要があります",
      ),
    ).toBeVisible();
  });

  test("パスワードと確認用パスワードが一致しない場合エラーが表示される", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    await page.getByLabel("パスワード", { exact: true }).fill("password123");
    await page.getByLabel("パスワード確認").fill("different456");
    await page.getByRole("button", { name: "更新" }).click();

    await expect(
      page.getByText(
        "パスワードは6文字以上で、確認用パスワードと一致している必要があります",
      ),
    ).toBeVisible();
  });

  test("削除確認ダイアログでキャンセルすると削除されない", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();

    page.on("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "ユーザーを削除" }).click();

    // 編集ページに留まっていることを確認
    await expect(page).toHaveURL(/\/users\/\d+\/edit/);
    await expect(
      page.getByRole("heading", { name: "ユーザー編集" }),
    ).toBeVisible();
  });

  test("キャンセルでユーザー一覧に戻れる", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "編集" }).click();
    await page.getByRole("link", { name: "キャンセル" }).click();

    await expect(page).toHaveURL("/users");
  });
});
