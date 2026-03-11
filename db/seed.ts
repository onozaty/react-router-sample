import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { userAuths, users } from "./schema";

// シードスクリプトは単体で実行されるため直接接続を作成
const pg = postgres(process.env.DATABASE_URL!);
const db = drizzle(pg, { schema });

async function main() {
  // 環境変数から管理者ユーザーの情報を取得
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "Administrator";

  console.log("🌱 データベースのシード処理を開始します...");

  // 既存の管理者ユーザーをチェック
  const existing = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✅ 管理者ユーザー (${adminEmail}) は既に存在します。`);
    return;
  }

  // パスワードをハッシュ化
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  // 管理者ユーザーを作成
  const [user] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({ email: adminEmail, username: adminUsername })
      .returning();

    await tx.insert(userAuths).values({
      userId: inserted[0].userId,
      hashedPassword,
    });

    return inserted;
  });

  console.log(`✅ 管理者ユーザーを作成しました:`);
  console.log(`   - メールアドレス: ${user.email}`);
  console.log(`   - ユーザー名: ${user.username}`);
  console.log(`   - ユーザーID: ${user.userId}`);
  console.log(`   - パスワード: ${adminPassword}`);
  console.log("🌱 シード処理が完了しました！");
}

main()
  .catch((e) => {
    console.error("❌ シード処理中にエラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pg.end();
  });
