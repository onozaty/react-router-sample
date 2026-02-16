import MCR from "monocart-coverage-reports";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commonMcrOptions } from "./coverage-config";

const ROOT = process.cwd();
const V8_COVERAGE_ROOT = path.join(ROOT, "coverage-e2e", ".v8");
const E2E_OUTPUT_DIR = path.join(ROOT, "coverage-e2e");
const CLIENT_DIR = path.join(V8_COVERAGE_ROOT, "client");
const SERVER_DIR = path.join(V8_COVERAGE_ROOT, "server");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// クライアント側のHTTP URL → file:// URL に変換する。
// MCR は file:// URL からソースを自動読み込みするが、HTTP URLは読めないため変換が必要。
function toLocalClientFileUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const base = new URL(BASE_URL);
    if (url.origin !== base.origin) {
      return null;
    }

    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith("/assets/") || !pathname.endsWith(".js")) {
      return null;
    }

    const distFile = path.join(
      ROOT,
      "build",
      "client",
      pathname.replace(/^\/+/, ""),
    );
    if (!existsSync(distFile)) {
      return null;
    }
    // サーバー専用ルート（loader/actionのみ）から生成される空チャンクを除外
    const content = readFileSync(distFile, "utf8")
      .replace(/\/\/#\s*sourceMappingURL=.*/g, "")
      .trim();
    if (content.length === 0) {
      return null;
    }
    return `file://${distFile}`;
  } catch {
    return null;
  }
}

// ディレクトリ内の JSON ファイルを読み込み、V8 カバレッジエントリを返す。
async function loadV8Entries(
  dir: string,
  extractEntries: (data: unknown) => MCR.V8CoverageEntry[],
): Promise<MCR.V8CoverageEntry[]> {
  if (!existsSync(dir)) {
    return [];
  }
  const allEntries: MCR.V8CoverageEntry[] = [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  for (const fileName of files) {
    const data = JSON.parse(await readFile(path.join(dir, fileName), "utf8"));
    allEntries.push(...extractEntries(data));
  }
  return allEntries;
}

// --- レポートインスタンスを作成 ---
const report = MCR({
  name: "E2E Coverage (Client + Server)",
  outputDir: E2E_OUTPUT_DIR,
  // .v8/ の生データを保持するため clean は無効にする。
  // 古いデータは playwright.config.ts のコマンドで事前にクリアされる。
  clean: false,
  cleanCache: true,
  ...commonMcrOptions,
  // マージ用の raw データも出力する
  reports: [["raw"], ...(commonMcrOptions.reports ?? [])],
  entryFilter: (entry: MCR.V8CoverageEntry) =>
    String(entry?.url ?? "").startsWith("file://"),
});

// --- V8 カバレッジデータを追加 ---
// サーバー: NODE_V8_COVERAGE が出力する {result: [...]} 形式
// file:// URL のためソースは MCR が自動読み込みする。
const serverEntries = await loadV8Entries(SERVER_DIR, (data) => {
  const result = (data as { result?: unknown })?.result;
  return Array.isArray(result) ? (result as MCR.V8CoverageEntry[]) : [];
});

// クライアント: Playwright の page.coverage.stopJSCoverage() が出力する [...] 形式
// HTTP URL を file:// URL に変換して MCR がソースを読めるようにする。
const clientEntries = await loadV8Entries(CLIENT_DIR, (data) =>
  Array.isArray(data) ? (data as MCR.V8CoverageEntry[]) : [],
);
for (const entry of clientEntries) {
  const fileUrl = toLocalClientFileUrl(entry.url);
  if (fileUrl) {
    entry.url = fileUrl;
  }
}

// report.add() は source が未設定のエントリを除外するため、
// ビルド成果物の file:// URL からソースを読み込んで補完する。
const allEntries = [...serverEntries, ...clientEntries];
for (const entry of allEntries) {
  if (typeof entry.source !== "string" && entry.url?.startsWith("file://")) {
    const filePath = fileURLToPath(entry.url);
    if (filePath.includes("/build/") && existsSync(filePath)) {
      entry.source = readFileSync(filePath, "utf8");
    }
  }
}

if (allEntries.length === 0) {
  console.error(
    "No coverage data found in coverage-e2e/.v8/client or coverage-e2e/.v8/server",
  );
  process.exit(1);
}

await report.add(allEntries);

// --- レポート生成 ---
await report.generate();
console.log("coverage report: coverage-e2e/index.html");
