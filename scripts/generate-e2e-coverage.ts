import MCR from "monocart-coverage-reports";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const V8_COVERAGE_ROOT = path.join(ROOT, "coverage-e2e", ".v8");
const E2E_OUTPUT_DIR = path.join(ROOT, "coverage-e2e");
const CLIENT_DIR = path.join(V8_COVERAGE_ROOT, "client");
const SERVER_DIR = path.join(V8_COVERAGE_ROOT, "server");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// file:// URL や絶対パスをプロジェクトルートからの相対パスに変換する。
function toRelativePath(filePath: string): string {
  let p = filePath;

  if (p.startsWith("file://")) {
    try {
      p = decodeURIComponent(new URL(p).pathname);
    } catch {
      return filePath;
    }
  }

  if (p.startsWith(`${ROOT}/`)) {
    return path.relative(ROOT, p);
  }

  return p;
}

// クライアント側のビルド成果物URL → ローカルファイルパスに変換する。
function toLocalClientDistFile(urlString: string): string | null {
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
    return distFile;
  } catch {
    return null;
  }
}

// サーバー側のビルド成果物URL → ローカルファイルパスに変換する。
function toLocalServerDistFile(urlString: string): string | null {
  if (typeof urlString !== "string" || !urlString.startsWith("file://")) {
    return null;
  }
  try {
    const filePath = decodeURIComponent(new URL(urlString).pathname);
    if (!filePath.includes("/build/server")) {
      return null;
    }
    if (!existsSync(filePath)) {
      return null;
    }
    return filePath;
  } catch {
    return null;
  }
}

// V8 カバレッジエントリを正規化する。
// resolveDistFile で URL からローカルのビルド成果物パスを解決し、
// source と distFile を設定した MCR.V8CoverageEntry を返す。
async function normalizeV8Entries(
  entries: unknown[],
  resolveDistFile: (url: string) => string | null,
): Promise<MCR.V8CoverageEntry[]> {
  const normalized: MCR.V8CoverageEntry[] = [];
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !Array.isArray((entry as MCR.V8CoverageEntry).functions)
    ) {
      continue;
    }
    const v8Entry = entry as MCR.V8CoverageEntry;
    const distFile =
      typeof v8Entry.url === "string" ? resolveDistFile(v8Entry.url) : null;
    if (!distFile) {
      continue;
    }
    normalized.push({
      ...v8Entry,
      distFile,
      source:
        typeof v8Entry.source === "string"
          ? v8Entry.source
          : await readFile(distFile, "utf8"),
      url: `file://${distFile}`,
    });
  }
  return normalized;
}

// ディレクトリ内の JSON ファイルを読み込み、V8 カバレッジをレポートに追加する。
async function addCoverageFromDir(
  dir: string,
  resolveDistFile: (url: string) => string | null,
  extractEntries: (data: unknown) => unknown[],
  report: MCR.CoverageReport,
): Promise<number> {
  if (!existsSync(dir)) {
    return 0;
  }
  let count = 0;
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  for (const fileName of files) {
    const data = JSON.parse(await readFile(path.join(dir, fileName), "utf8"));
    const entries = extractEntries(data);
    if (entries.length === 0) {
      continue;
    }
    const normalized = await normalizeV8Entries(entries, resolveDistFile);
    if (normalized.length > 0) {
      await report.add(normalized);
      count += 1;
    }
  }
  return count;
}

// --- レポートインスタンスを作成 ---
const report = MCR({
  name: "E2E Coverage (Client + Server)",
  outputDir: E2E_OUTPUT_DIR,
  // .v8/ の生データを保持するため clean は無効にする。
  // 古いデータは playwright.config.ts のコマンドで事前にクリアされる。
  clean: false,
  cleanCache: true,
  reports: [
    ["v8"],
    ["text-summary"],
    [
      "console-details",
      {
        skipPercent: 0,
        metrics: ["statements", "branches", "functions", "lines"],
      },
    ],
  ],
  // カバレッジ 0% のファイルもレポートに含める。
  all: {
    dir: ["./app"],
    filter: {
      "**/*.test.*": false,
      "**/*.spec.*": false,
      "**/*.{ts,tsx}": true,
      "**/*": false,
    },
  },
  entryFilter: (entry: MCR.V8CoverageEntry) =>
    String(entry?.url ?? "").startsWith("file://"),
  // V8→ソースパス変換後のフィルタ。app/ 配下のみを対象とする。
  sourceFilter: {
    "**/app/**": true,
    "**/*": false,
  },
  sourcePath: (filePath: string) => toRelativePath(filePath),
});

// --- V8 カバレッジデータを追加 ---
// サーバー: NODE_V8_COVERAGE が出力する {result: [...]} 形式
// クライアント: Playwright の page.coverage.stopJSCoverage() が出力する [...] 形式
const serverCount = await addCoverageFromDir(
  SERVER_DIR,
  toLocalServerDistFile,
  (data) => {
    const result = (data as { result?: unknown })?.result;
    return Array.isArray(result) ? result : [];
  },
  report,
);
const clientCount = await addCoverageFromDir(
  CLIENT_DIR,
  toLocalClientDistFile,
  (data) => (Array.isArray(data) ? data : []),
  report,
);

if (serverCount + clientCount === 0) {
  console.error(
    "No coverage data found in coverage-e2e/.v8/client or coverage-e2e/.v8/server",
  );
  process.exit(1);
}

// --- レポート生成 ---
await report.generate();
console.log("coverage report: coverage-e2e/index.html");
