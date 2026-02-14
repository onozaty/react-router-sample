import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test" });
const coverageEnabled = process.env.E2E_COVERAGE === "1";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",
  fullyParallel: false,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      slowMo: Number(process.env.SLOW_MO) || 0,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: coverageEnabled
      ? "rm -rf coverage-e2e/.v8/server && mkdir -p coverage-e2e/.v8/server && dotenv -e .env.test -- pnpm run build && dotenv -e .env.test -- env E2E_COVERAGE=1 NODE_V8_COVERAGE=coverage-e2e/.v8/server node build/server.js"
      : "dotenv -e .env.test -- pnpm run prd",
    url: "http://localhost:3000",
    reuseExistingServer: coverageEnabled ? false : !process.env.CI,
    timeout: 120_000,
  },
});
