import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { unstable_createContext } from "react-router";
import { db, userAuths, users } from "~/lib/db.server";
import { getSession } from "~/lib/sessions.server";

export interface AuthUser {
  userId: number;
  email: string;
  username: string | null;
}

// 型安全なコンテキストを作成
export const authUserContext = unstable_createContext<AuthUser | null>();

export const getAuthUser = async (
  request: Request,
): Promise<AuthUser | null> => {
  // セッションを取得
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return null;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);

  const user = result[0];
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    email: user.email,
    username: user.username,
  };
};

export const authenticateUser = async (email: string, password: string) => {
  const result = await db
    .select({
      userId: users.userId,
      email: users.email,
      username: users.username,
      hashedPassword: userAuths.hashedPassword,
    })
    .from(users)
    .innerJoin(userAuths, eq(users.userId, userAuths.userId))
    .where(eq(users.email, email))
    .limit(1);

  const row = result[0];
  if (!row) {
    return null;
  }

  const isValid = await bcrypt.compare(password, row.hashedPassword);
  if (!isValid) {
    return null;
  }

  return {
    userId: row.userId,
    email: row.email,
    username: row.username,
  };
};
