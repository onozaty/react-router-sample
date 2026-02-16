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

    const table = page.getByRole("table");
    const rows = table.getByRole("row");

    // ヘッダー行 + データ1行
    await expect(rows).toHaveCount(2);

    // ヘッダー行の検証
    await expect(rows.first().getByRole("columnheader")).toHaveText([
      "ID",
      "メールアドレス",
      "ユーザー名",
      "作成日時",
      "操作",
    ]);

    // データ行の検証
    const cells = rows.nth(1).getByRole("cell");
    await expect(cells.nth(0)).toHaveText("1");
    await expect(cells.nth(1)).toHaveText("admin@example.com");
    await expect(cells.nth(2)).toHaveText("Administrator");
    await expect(cells.nth(3)).not.toBeEmpty();
    await expect(rows.nth(1).getByRole("link", { name: "編集" })).toBeVisible();
  });

  test("複数ユーザーが表示される", async ({ page }) => {
    await createTestUser({
      email: "user2@example.com",
      username: "User Two",
      password: "password123",
    });

    await page.goto("/users");

    const table = page.getByRole("table");
    const rows = table.getByRole("row");

    // ヘッダー行 + データ2行
    await expect(rows).toHaveCount(3);

    // 1行目のデータ検証（作成日降順なので、後に作成したuser2が先）
    const row1Cells = rows.nth(1).getByRole("cell");
    await expect(row1Cells.nth(1)).toHaveText("user2@example.com");
    await expect(row1Cells.nth(2)).toHaveText("User Two");

    // 2行目のデータ検証
    const row2Cells = rows.nth(2).getByRole("cell");
    await expect(row2Cells.nth(1)).toHaveText("admin@example.com");
    await expect(row2Cells.nth(2)).toHaveText("Administrator");
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
