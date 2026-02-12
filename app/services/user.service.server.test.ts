import { resetDb, createTestUser } from "@test/helpers/db";
import * as bcrypt from "bcrypt";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "~/lib/db.server";
import {
  checkEmailExists,
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateLastLogin,
  updateUser,
} from "./user.service.server";

describe("user.service.server", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("getAllUsers", () => {
    it("ユーザーリストを作成日降順で返す", async () => {
      // 複数ユーザーを作成（時間をずらして）
      const user1 = await createUser({
        email: "user1@example.com",
        username: "user1",
        password: "password1",
      });

      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms待機

      const user2 = await createUser({
        email: "user2@example.com",
        username: "user2",
        password: "password2",
      });

      const users = await getAllUsers();

      // 作成日降順なので、user2が先
      expect(users).toEqual([
        expect.objectContaining({ userId: user2.userId }),
        expect.objectContaining({ userId: user1.userId }),
      ]);
    });
  });

  describe("getUserById", () => {
    it("存在するユーザーを返す", async () => {
      const { user } = await createTestUser({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      });

      const result = await getUserById(user.userId);

      expect(result).toMatchObject({
        userId: user.userId,
        email: "test@example.com",
        username: "testuser",
      });
    });

    it("存在しないユーザーの場合nullを返す", async () => {
      const result = await getUserById(99999);

      expect(result).toBeNull();
    });
  });

  describe("createUser", () => {
    it("ユーザーとUserAuthが正しく作成される", async () => {
      const newUser = await createUser({
        email: "new@example.com",
        username: "newuser",
        password: "newpassword",
      });

      expect(newUser).toMatchObject({
        email: "new@example.com",
        username: "newuser",
      });

      // UserAuthが作成されていることを確認
      const userAuth = await prisma.userAuth.findUnique({
        where: { userId: newUser.userId },
      });

      expect(userAuth).not.toBeNull();
      expect(userAuth?.hashedPassword).toBeTruthy();
    });

    it("パスワードがハッシュ化されている", async () => {
      const password = "testpassword123";
      const newUser = await createUser({
        email: "hash@example.com",
        username: "hashuser",
        password,
      });

      const userAuth = await prisma.userAuth.findUnique({
        where: { userId: newUser.userId },
      });

      // ハッシュ化されたパスワードは元のパスワードと異なる
      expect(userAuth?.hashedPassword).not.toBe(password);
      // bcrypt.compareで検証可能
      const isValid = await bcrypt.compare(password, userAuth!.hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe("updateUser", () => {
    it("ユーザー情報（email、username）が正しく更新される", async () => {
      const { user } = await createTestUser({
        email: "old@example.com",
        username: "olduser",
        password: "password123",
      });

      const updatedUser = await updateUser(user.userId, {
        email: "new@example.com",
        username: "newuser",
      });

      expect(updatedUser).toMatchObject({
        email: "new@example.com",
        username: "newuser",
      });
    });

    it("パスワード更新が正しく動作する", async () => {
      const { user } = await createTestUser({
        email: "user@example.com",
        username: "user",
        password: "oldpassword",
      });

      const newPassword = "newpassword123";
      await updateUser(user.userId, {
        password: newPassword,
      });

      // 新しいパスワードで認証できることを確認
      const userAuth = await prisma.userAuth.findUnique({
        where: { userId: user.userId },
      });

      const isValid = await bcrypt.compare(
        newPassword,
        userAuth!.hashedPassword,
      );
      expect(isValid).toBe(true);
    });
  });

  describe("deleteUser", () => {
    it("ユーザーとUserAuthが削除される", async () => {
      const { user } = await createTestUser({
        email: "delete@example.com",
        username: "deleteuser",
        password: "password123",
      });

      await deleteUser(user.userId);

      // Userが削除されていることを確認
      const deletedUser = await prisma.user.findUnique({
        where: { userId: user.userId },
      });
      expect(deletedUser).toBeNull();

      // UserAuthもCascade削除されていることを確認
      const deletedUserAuth = await prisma.userAuth.findUnique({
        where: { userId: user.userId },
      });
      expect(deletedUserAuth).toBeNull();
    });
  });

  describe("checkEmailExists", () => {
    it("既存メールの場合trueを返す", async () => {
      await createTestUser({
        email: "exists@example.com",
        username: "user",
        password: "password",
      });

      const result = await checkEmailExists("exists@example.com");

      expect(result).toBe(true);
    });

    it("新規メールの場合falseを返す", async () => {
      const result = await checkEmailExists("notexists@example.com");

      expect(result).toBe(false);
    });

    it("excludeUserIdが正しく動作する", async () => {
      const { user } = await createTestUser({
        email: "myemail@example.com",
        username: "myuser",
        password: "password",
      });

      // 自分のメールアドレスをチェック（excludeUserIdなし）
      const result1 = await checkEmailExists("myemail@example.com");
      expect(result1).toBe(true);

      // 自分のメールアドレスをチェック（excludeUserIdあり）
      const result2 = await checkEmailExists(
        "myemail@example.com",
        user.userId,
      );
      expect(result2).toBe(false);
    });
  });

  describe("updateLastLogin", () => {
    it("lastLoginAtが更新される", async () => {
      const { user } = await createTestUser({
        email: "login@example.com",
        username: "loginuser",
        password: "password",
      });

      // 最初はlastLoginAtがnull
      const userAuthBefore = await prisma.userAuth.findUnique({
        where: { userId: user.userId },
      });
      expect(userAuthBefore?.lastLoginAt).toBeNull();

      // updateLastLogin実行
      await updateLastLogin(user.userId);

      // lastLoginAtが設定されている
      const userAuthAfter = await prisma.userAuth.findUnique({
        where: { userId: user.userId },
      });
      expect(userAuthAfter?.lastLoginAt).not.toBeNull();
      expect(userAuthAfter?.lastLoginAt).toBeInstanceOf(Date);
    });
  });
});
