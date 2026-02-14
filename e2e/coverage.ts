import { test as base, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const COVERAGE_ENABLED = process.env.E2E_COVERAGE === "1";
const CLIENT_COVERAGE_DIR = path.resolve("coverage-e2e/.v8/client");

function toSafeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export const test = base.extend({
  page: async ({ page, request }, use, testInfo) => {
    if (COVERAGE_ENABLED) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    await use(page);

    if (!COVERAGE_ENABLED) {
      return;
    }

    const entries = await page.coverage.stopJSCoverage();
    await mkdir(CLIENT_COVERAGE_DIR, { recursive: true });

    const fileName = toSafeFileName(
      [
        testInfo.project.name,
        testInfo.title,
        `retry-${testInfo.retry}`,
        Date.now().toString(),
      ].join("-"),
    );

    await writeFile(
      path.join(CLIENT_COVERAGE_DIR, `${fileName}.json`),
      JSON.stringify(entries),
      "utf8",
    );

    // Flush server-side V8 coverage while server is still running.
    try {
      await request.post("/__coverage/flush");
    } catch {
      // Best effort.
    }
  },
});

export { expect };
