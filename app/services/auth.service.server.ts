import { unstable_createContext } from "react-router";
import bcrypt from "bcrypt";
import { getSession } from "~/sessions.server";
import { prisma } from "~/lib/db.server";

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

  const user = await prisma.user.findUnique({
    where: { userId },
  });

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
  const user = await prisma.user.findUnique({
    where: { email },
    include: { userAuth: true },
  });

  if (!user || !user.userAuth) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.userAuth.hashedPassword);
  if (!isValid) {
    return null;
  }

  return {
    userId: user.userId,
    email: user.email,
    username: user.username,
  };
};
