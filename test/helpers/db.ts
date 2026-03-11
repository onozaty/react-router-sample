import * as bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { db, userAuths, users } from "~/lib/db.server";

/**
 * テスト用にデータベースをリセット
 * 全テーブルをTRUNCATEし、AUTO_INCREMENTをリセット
 */
export async function resetDb() {
  const tablenames = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`,
  );

  const tables = tablenames
    .map((row) => row.tablename)
    .map((name) => `"public"."${name}"`)
    .join(", ");

  if (!tables) return;

  try {
    await db.execute(
      sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`),
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

  return await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: data.email, username: data.username })
      .returning();

    const [auth] = await tx
      .insert(userAuths)
      .values({ userId: user.userId, hashedPassword })
      .returning();

    return { user: { ...user, userAuth: auth }, password: data.password };
  });
}
