import { config } from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// .env.testファイルを読み込む
config({ path: ".env.test" });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    // テストファイルを順次実行（実DB使用のため）
    fileParallelism: false,
    exclude: ["node_modules", "e2e"],
  },
  server: {
    host: "0.0.0.0",
  },
});
