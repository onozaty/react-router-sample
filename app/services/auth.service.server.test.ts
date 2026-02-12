import { resetDb, createTestUser } from "@test/helpers/db";
import { beforeEach, describe, expect, it } from "vitest";
import { commitSession, getSession } from "~/lib/sessions.server";
import { authenticateUser, getAuthUser } from "./auth.service.server";

describe("auth.service.server", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("getAuthUser", () => {
    it("セッションにuserIdがある場合、ユーザーを返す", async () => {
      // テストユーザーを作成
      const { user } = await createTestUser({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      });

      // セッションを作成
      const session = await getSession();
      session.set("userId", user.userId);
      const cookie = await commitSession(session);

      // リクエストを作成
      const request = new Request("http://localhost", {
        headers: { Cookie: cookie },
      });

      // テスト実行
      const authUser = await getAuthUser(request);

      expect(authUser).toMatchObject({
        userId: user.userId,
        email: user.email,
        username: user.username,
      });
    });

    it("セッションにuserIdがない場合、nullを返す", async () => {
      const request = new Request("http://localhost");

      const authUser = await getAuthUser(request);

      expect(authUser).toBeNull();
    });

    it("存在しないuserIdの場合、nullを返す", async () => {
      // 存在しないuserIdをセッションに設定
      const session = await getSession();
      session.set("userId", 99999);
      const cookie = await commitSession(session);

      const request = new Request("http://localhost", {
        headers: { Cookie: cookie },
      });

      const authUser = await getAuthUser(request);

      expect(authUser).toBeNull();
    });
  });

  describe("authenticateUser", () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await createTestUser({
        email: "auth@example.com",
        username: "authuser",
        password: "correct-password",
      });
    });

    it("正しいメールとパスワードでユーザーを返す", async () => {
      const result = await authenticateUser(
        "auth@example.com",
        "correct-password",
      );

      expect(result).toMatchObject({
        email: "auth@example.com",
        username: "authuser",
      });
    });

    it("メールが存在しない場合、nullを返す", async () => {
      const result = await authenticateUser(
        "nonexistent@example.com",
        "password",
      );

      expect(result).toBeNull();
    });

    it("パスワードが間違っている場合、nullを返す", async () => {
      const result = await authenticateUser(
        "auth@example.com",
        "wrong-password",
      );

      expect(result).toBeNull();
    });
  });
});
