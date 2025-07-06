import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 環境変数から管理者ユーザーの情報を取得
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "Administrator";

  console.log("🌱 データベースのシード処理を開始します...");

  // 既存の管理者ユーザーをチェック
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log(`✅ 管理者ユーザー (${adminEmail}) は既に存在します。`);
    return;
  }

  // パスワードをハッシュ化
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  // 管理者ユーザーを作成
  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      username: adminUsername,
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
    await prisma.$disconnect();
  });
