import { test as base, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const COVERAGE_ENABLED = process.env.E2E_COVERAGE === "1";
const CLIENT_COVERAGE_DIR = path.resolve("coverage-e2e/.v8/client");

export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ context }, use, testInfo) => {
      const isChromium = test.info().project.name === "chromium";

      if (COVERAGE_ENABLED && isChromium) {
        context.on("page", (page) => {
          page.coverage.startJSCoverage({ resetOnNavigation: false });
        });
      }

      await use();

      if (!COVERAGE_ENABLED || !isChromium) return;

      const coverageList = await Promise.all(
        context.pages().map((page) => page.coverage.stopJSCoverage()),
      );
      const entries = coverageList.flat();
      if (entries.length === 0) return;

      await mkdir(CLIENT_COVERAGE_DIR, { recursive: true });
      const fileName = `${testInfo.project.name}-${Date.now()}.json`;
      await writeFile(
        path.join(CLIENT_COVERAGE_DIR, fileName),
        JSON.stringify(entries),
        "utf8",
      );

      // サーバー側のV8カバレッジをフラッシュする。
      try {
        const request = context.request;
        await request.post("/__coverage/flush");
      } catch {
        // Best effort.
      }
    },
    { scope: "test", auto: true },
  ],
});

export { expect };
