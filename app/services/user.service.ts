import type { User } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(password, salt);
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getUserById = async (userId: number) => {
  return await prisma.user.findUnique({
    where: { userId },
  });
};

export const createUser = async (
  data: Pick<User, "email" | "username"> & { password: string },
) => {
  const { password, ...userData } = data;

  // パスワードをハッシュ化
  const hashedPassword = await hashPassword(password);

  return await prisma.user.create({
    data: {
      ...userData,
      userAuth: {
        create: {
          hashedPassword,
        },
      },
    },
  });
};

export const updateUser = async (
  userId: number,
  data: Partial<Pick<User, "email" | "username">> & { password?: string },
) => {
  const { password, ...userData } = data;

  // ユーザー情報を更新
  const updatedUser = await prisma.user.update({
    where: { userId },
    data: userData,
  });

  // パスワードが提供された場合は認証情報も更新
  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.userAuth.upsert({
      where: { userId },
      update: { hashedPassword },
      create: { userId, hashedPassword },
    });
  }

  return updatedUser;
};

export const deleteUser = async (userId: number) => {
  return await prisma.user.delete({
    where: { userId },
  });
};

export const checkEmailExists = async (
  email: string,
  excludeUserId?: number,
) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { userId: true },
  });

  if (!user) return false;
  if (excludeUserId && user.userId === excludeUserId) return false;

  return true;
};
