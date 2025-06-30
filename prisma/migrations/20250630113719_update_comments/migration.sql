-- Prisma Database Comments Generator v1.3.0

-- users comments
COMMENT ON TABLE "users" IS 'ユーザ基本情報テーブル';
COMMENT ON COLUMN "users"."user_id" IS 'ユーザID';
COMMENT ON COLUMN "users"."email" IS 'メールアドレス';
COMMENT ON COLUMN "users"."username" IS 'ユーザ名';
COMMENT ON COLUMN "users"."created_at" IS '作成日時';
COMMENT ON COLUMN "users"."updated_at" IS '更新日時';

-- user_auths comments
COMMENT ON TABLE "user_auths" IS 'ユーザ認証情報テーブル';
COMMENT ON COLUMN "user_auths"."user_id" IS 'ユーザID';
COMMENT ON COLUMN "user_auths"."hashed_password" IS 'パスワード(ハッシュ)';
COMMENT ON COLUMN "user_auths"."last_login_at" IS '最終ログイン日時';
COMMENT ON COLUMN "user_auths"."created_at" IS '作成日時';
COMMENT ON COLUMN "user_auths"."updated_at" IS '更新日時';
