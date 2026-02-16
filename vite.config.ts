import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    sourcemap: process.env.E2E_COVERAGE === "1",
    // カバレッジ計測時はminifyを無効にしてソースマップの精度を上げる
    minify: process.env.E2E_COVERAGE === "1" ? false : undefined,
    rollupOptions: isSsrBuild
      ? {
          input: "./server/app.ts",
        }
      : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: "127.0.0.1",
  },
}));
