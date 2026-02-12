import * as bcrypt from "bcrypt";
import { prisma } from "~/lib/db.server";

/**
 * テスト用にデータベースをリセット
 * 全テーブルをTRUNCATEし、AUTO_INCREMENTをリセット
 */
export async function resetDb() {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== "_prisma_migrations")
    .map((name) => `"public"."${name}"`)
    .join(", ");

  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`,
    );
  } catch (error) {
    console.log({ error });
  }
}

/**
 * テスト用ユーザーを作成
 */
export async function createTestUser(data: {
  email: string;
  username?: string;
  password: string;
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      userAuth: {
        create: {
          hashedPassword,
        },
      },
    },
    include: {
      userAuth: true,
    },
  });

  return { user, password: data.password };
}
