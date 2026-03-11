import bcrypt from "bcrypt";
import { desc, eq } from "drizzle-orm";
import { db, userAuths, users } from "~/lib/db.server";
import type { User } from "~/lib/db.server";

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(password, salt);
};

export const getAllUsers = async () => {
  return await db.select().from(users).orderBy(desc(users.createdAt));
};

export const getUserById = async (userId: number) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  return result[0] ?? null;
};

export const createUser = async (
  data: Pick<User, "email" | "username"> & { password: string },
) => {
  const { password, ...userData } = data;

  // パスワードをハッシュ化
  const hashedPassword = await hashPassword(password);

  return await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values(userData).returning();

    await tx.insert(userAuths).values({
      userId: user.userId,
      hashedPassword,
    });

    return user;
  });
};

export const updateUser = async (
  userId: number,
  data: Partial<Pick<User, "email" | "username">> & { password?: string },
) => {
  const { password, ...userData } = data;

  return await db.transaction(async (tx) => {
    let updatedUser: User | undefined;

    if (Object.keys(userData).length > 0) {
      const [result] = await tx
        .update(users)
        .set(userData)
        .where(eq(users.userId, userId))
        .returning();
      updatedUser = result;
    } else {
      const result = await tx
        .select()
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
      updatedUser = result[0];
    }

    // パスワードが提供された場合は認証情報も更新
    if (password) {
      const hashedPassword = await hashPassword(password);
      await tx
        .insert(userAuths)
        .values({ userId, hashedPassword })
        .onConflictDoUpdate({
          target: userAuths.userId,
          set: { hashedPassword },
        });
    }

    return updatedUser;
  });
};

export const deleteUser = async (userId: number) => {
  const [deleted] = await db
    .delete(users)
    .where(eq(users.userId, userId))
    .returning();
  return deleted;
};

export const checkEmailExists = async (
  email: string,
  excludeUserId?: number,
) => {
  const result = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) return false;
  if (excludeUserId && result[0].userId === excludeUserId) return false;

  return true;
};

export const updateLastLogin = async (userId: number) => {
  await db
    .update(userAuths)
    .set({ lastLoginAt: new Date() })
    .where(eq(userAuths.userId, userId));
};
