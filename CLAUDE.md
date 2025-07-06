# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**言語設定**: Claude Codeとのやり取りは日本語で行ってください。

## 必須コマンド

### 開発
- `pnpm run dev` - 開発サーバーを起動（HMR有効、http://localhost:5173）
- `pnpm run build` - プロダクションビルドを作成
- `pnpm run typecheck` - TypeScript型チェックを実行（typegen含む）
- `pnpm run format` - Prettierでコードフォーマット

### データベース操作
- `pnpm run db:migrate` - スキーマ修正、マイグレート、生成、デプロイを実行
- `pnpm run db:reset` - データベースをリセット（生成をスキップ）
- `pnpm run db:seed` - 初期データでデータベースをシード

### 型生成
- `pnpm run typegen` - React Router型を生成
- `pnpm run typegen:watch` - 型生成のウォッチモード

## アーキテクチャ概要

### 認証・認可
- **認証システム**: bcryptによるパスワードハッシュ化、セッションベース認証
- **ミドルウェア**: `app/middleware/auth.ts`の`authMiddleware`が`/login`と`/logout`以外の全ルートで認証を処理
- **コンテキスト**: `authUserContext`がReact Routerの`unstable_createContext`経由でアプリ全体にユーザーデータを提供
- **サービス**: 認証ロジックを`auth.service.server.ts`と`user.service.server.ts`に分離

### データベース・データ層
- **ORM**: PostgreSQLでPrismaを使用
- **モデル**: UserとUserAuthテーブルの1対1リレーション
- **共有クライアント**: `app/lib/db.server.ts`がシングルトンPrismaクライアントを提供し、接続問題を回避
- **シーディング**: `prisma/seed.ts`が管理者ユーザーを作成（環境変数で設定可能）

### React Router v7構造
- **ファイルベースルーティング**: `@react-router/fs-routes`の`flatRoutes()`設定を使用
- **ミドルウェア**: `root.tsx`の`unstable_middleware`でグローバル適用
- **レイアウト**: Headerコンポーネントを`root.tsx`のAppコンポーネントに直接統合してグローバル表示
- **型安全性**: ルート、ローダー、アクションの自動型生成

### UIコンポーネント
- **スタイリング**: カスタムユーティリティクラス付きTailwindCSS
- **基本コンポーネント**: `app/components/ui/`にshadcn/ui（Radix UIプリミティブ）を配置（Button、Card、Inputなど）
- **カスタムコンポーネント**: アプリ固有のコンポーネントは`app/components/`に配置（例：Field、Header）
- **ヘッダー**: ユーザー認証状態とナビゲーション付きグローバルヘッダーコンポーネント

### 主要パターン
- **サーバーサイドサービス**: `app/services/`で認証とユーザー管理
- **型安全性**: ルートパラメータ、ローダーデータ、アクションデータでReact Routerの型生成を活用
- **フォーム処理**: 変更にReact RouterのFormコンポーネントを使用
- **セッション管理**: `app/sessions.server.ts`でCookieベースセッションを処理

## データベーススキーマ注意点
- ユーザーはセキュリティのため別の認証テーブル（UserAuth）を持つ
- `@onozaty/prisma-db-comments-generator`を使用してPrismaスキーマからコメントを自動生成
- 一貫性を保つためマイグレーション前にスキーマ修正が実行される

## 開発ルール

### コンポーネント作成
- **shadcn/ui使用**: 新しいUIコンポーネントは可能な限りshadcn/uiを使用
- **ファイル配置**: 
  - shadcn/uiコンポーネント → `app/components/ui/`
  - アプリ固有のコンポーネント → `app/components/`
- **命名規則**: ファイル名は小文字（例：`header.tsx`、`field.tsx`）

### 開発フロー
- **変更後の確認**: 一通りの変更を行った後は必ず`pnpm run typecheck`でエラーが無いことを確認
- **型安全性の維持**: TypeScriptエラーを残したまま作業を終了しない
- **any型の禁止**: `any`型の使用を避け、適切な型定義を行う

### その他
- パッケージマネージャーとしてpnpmを使用
- TypeScript strictモードが有効
- 一貫したフォーマットのためPrettierを設定
- すべての認証ルートはユーザー未認証時に`/login`にリダイレクト
- シードデータには管理者ユーザーが含まれる（デフォルト: admin@example.com/admin123）