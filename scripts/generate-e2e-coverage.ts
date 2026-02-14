import MCR from "monocart-coverage-reports";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type CounterMap = Record<string, number>;
type BranchCounterMap = Record<string, number[]>;
type LocationMap = Record<
  string,
  { start: { line: number }; end: { line: number } }
>;
type IstanbulCoverageFile = {
  path?: string;
  s?: CounterMap;
  f?: CounterMap;
  b?: BranchCounterMap;
  statementMap?: LocationMap;
  fnMap?: Record<
    string,
    { loc: { start: { line: number }; end: { line: number } } }
  >;
  branchMap?: Record<
    string,
    { loc: { start: { line: number }; end: { line: number } } }
  >;
};
type IstanbulCoverageMap = Record<string, IstanbulCoverageFile>;

const ROOT = process.cwd();
const V8_COVERAGE_ROOT = path.join(ROOT, "coverage-e2e", ".v8");
const E2E_OUTPUT_DIR = path.join(ROOT, "coverage-e2e");
const CLIENT_DIR = path.join(V8_COVERAGE_ROOT, "client");
const SERVER_DIR = path.join(V8_COVERAGE_ROOT, "server");
const UNIT_COVERAGE_FILE = path.join(ROOT, "coverage", "coverage-final.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const INCLUDE_UNIT_COVERAGE = process.env.COVERAGE_INCLUDE_UNIT === "1";
const sourceCache = new Map<string, string>();
const E2E_ISTANBUL_JSON_FILE = path.join(E2E_OUTPUT_DIR, "e2e-istanbul.json");
const E2E_ISTANBUL_JSON_REPORT_FILE = path.relative(
  E2E_OUTPUT_DIR,
  E2E_ISTANBUL_JSON_FILE,
);
// V8→ソースパス変換後のフィルタ。app/ 配下のみを対象とする。
const SOURCE_FILTER = {
  "**/app/**": true,
  "**/*": false,
};
// カバレッジ 0% のファイルもレポートに含めるための全ソースファイル定義。
// dir で app/ 配下に限定し、テストファイルを除外する。
const ALL_SOURCE_FILES = {
  dir: ["./app"],
  filter: {
    "**/*.test.*": false,
    "**/*.spec.*": false,
    "**/*.{ts,tsx}": true,
    "**/*": false,
  },
};

function startLinesMatch(
  mapA: LocationMap | undefined,
  mapB: LocationMap | undefined,
): boolean {
  if (!mapA || !mapB) return false;
  const keysA = Object.keys(mapA);
  const keysB = Object.keys(mapB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((id) => mapA[id]?.start.line === mapB[id]?.start.line);
}

function mergeIstanbulCoverageMaps(
  baseMap: IstanbulCoverageMap,
  addedMap: IstanbulCoverageMap,
): IstanbulCoverageMap {
  const merged = { ...baseMap };

  for (const [filePath, added] of Object.entries(addedMap)) {
    const current = merged[filePath];
    if (!current) {
      merged[filePath] = added;
      continue;
    }

    const addedHasCoverage = Object.values(added.s ?? {}).some((c) => c > 0);
    if (!addedHasCoverage) {
      continue;
    }

    if (!startLinesMatch(current.statementMap, added.statementMap)) {
      console.warn(
        `[merge] skipped ${filePath}: statementMap start lines do not match`,
      );
      continue;
    }

    current.s ??= {};
    current.f ??= {};
    current.b ??= {};

    for (const [id, count] of Object.entries(added.s ?? {})) {
      current.s[id] = (current.s[id] ?? 0) + count;
    }

    for (const [id, count] of Object.entries(added.f ?? {})) {
      current.f[id] = (current.f[id] ?? 0) + count;
    }

    for (const [id, branchCounts] of Object.entries(added.b ?? {})) {
      if (!Array.isArray(branchCounts)) {
        continue;
      }
      if (!Array.isArray(current.b[id])) {
        current.b[id] = [...branchCounts];
        continue;
      }
      for (let i = 0; i < branchCounts.length; i += 1) {
        current.b[id][i] = (current.b[id][i] ?? 0) + branchCounts[i];
      }
    }
  }

  return merged;
}

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

  const rootNoLeadingSlash = ROOT.replace(/^\/+/, "");
  if (p.startsWith(`${rootNoLeadingSlash}/`)) {
    return p.slice(rootNoLeadingSlash.length + 1);
  }

  return p;
}

function normalizeIstanbulCoveragePaths(
  coverageMap: IstanbulCoverageMap,
): IstanbulCoverageMap {
  const normalized: IstanbulCoverageMap = {};

  for (const [filePath, coverage] of Object.entries(coverageMap)) {
    const normalizedPath = toRelativePath(filePath);
    normalized[normalizedPath] = { ...coverage, path: normalizedPath };
  }

  return normalized;
}

async function getSourceText(filePath: string): Promise<string> {
  const cached = sourceCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  const source = await readFile(filePath, "utf8");
  sourceCache.set(filePath, source);
  return source;
}

function isValidV8Entry(entry: unknown): entry is MCR.V8CoverageEntry {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  return Array.isArray((entry as MCR.V8CoverageEntry).functions);
}

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
    return distFile;
  } catch {
    return null;
  }
}

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

// V8 カバレッジエントリを正規化する共通関数。
// resolveDistFile で URL からローカルのビルド成果物パスを解決する。
async function normalizeV8Entries(
  entries: unknown[],
  resolveDistFile: (url: string) => string | null,
): Promise<MCR.V8CoverageEntry[]> {
  const normalized: MCR.V8CoverageEntry[] = [];
  for (const entry of entries) {
    if (!isValidV8Entry(entry)) {
      continue;
    }
    const distFile =
      typeof entry.url === "string" ? resolveDistFile(entry.url) : null;
    if (!distFile) {
      continue;
    }
    const source =
      typeof entry.source === "string"
        ? entry.source
        : await getSourceText(distFile);
    normalized.push({
      ...entry,
      distFile,
      source,
      url: `file://${distFile}`,
    });
  }
  return normalized;
}

const report = MCR({
  name: "E2E Coverage (Client + Server)",
  outputDir: E2E_OUTPUT_DIR,
  clean: true,
  cleanCache: true,
  all: ALL_SOURCE_FILES,
  reports: [
    ["html"],
    ["text-summary"],
    [
      "console-details",
      {
        skipPercent: 0,
        metrics: ["statements", "branches", "functions", "lines"],
      },
    ],
    // coverage:all マージ用の中間成果物として Istanbul JSON を出力する。
    ...(INCLUDE_UNIT_COVERAGE
      ? ([
          ["json", { file: E2E_ISTANBUL_JSON_REPORT_FILE }],
        ] as MCR.ReportDescription[])
      : []),
  ],
  entryFilter: (entry: MCR.V8CoverageEntry) => {
    const url = String(entry?.url ?? "");

    if (url.startsWith(`${BASE_URL}/assets/`)) {
      return true;
    }

    if (url.startsWith("file://") && url.includes("/build/")) {
      return true;
    }

    return false;
  },
  sourceFilter: SOURCE_FILTER,
  sourcePath: (filePath) => toRelativePath(filePath),
});

let addedCount = 0;

if (existsSync(SERVER_DIR)) {
  const files = (await readdir(SERVER_DIR)).filter((file) =>
    file.endsWith(".json"),
  );
  for (const fileName of files) {
    const fullPath = path.join(SERVER_DIR, fileName);
    const data = JSON.parse(await readFile(fullPath, "utf8"));
    const entries = Array.isArray(data?.result) ? data.result : [];
    const normalized = await normalizeV8Entries(entries, toLocalServerDistFile);
    if (normalized.length > 0) {
      await report.add(normalized);
      addedCount += 1;
    }
  }
}

if (existsSync(CLIENT_DIR)) {
  const files = (await readdir(CLIENT_DIR)).filter((file) =>
    file.endsWith(".json"),
  );
  for (const fileName of files) {
    const fullPath = path.join(CLIENT_DIR, fileName);
    const data = JSON.parse(await readFile(fullPath, "utf8"));

    if (Array.isArray(data) && data.length > 0) {
      const normalized = await normalizeV8Entries(data, toLocalClientDistFile);
      if (normalized.length > 0) {
        await report.add(normalized);
        addedCount += 1;
      }
    }
  }
}

if (addedCount === 0) {
  console.error(
    "No coverage data found in coverage-e2e/.v8/client or coverage-e2e/.v8/server",
  );
  process.exit(1);
}

await report.generate();
console.log("coverage report: coverage-e2e/index.html");

// Unit (Vitest) と E2E (MCR) では V8→Istanbul 変換ツールが異なるため、
// statementMap のカラム位置にずれが生じる。istanbul-lib-coverage.merge() は
// 位置情報の不一致を別 statement として扱うため、カウンター ID と行番号で
// マッチングする手動マージを行う。
if (INCLUDE_UNIT_COVERAGE) {
  const e2eIstanbulCoverage = normalizeIstanbulCoveragePaths(
    JSON.parse(await readFile(E2E_ISTANBUL_JSON_FILE, "utf8")),
  );
  let mergedAllCoverage = e2eIstanbulCoverage;

  if (existsSync(UNIT_COVERAGE_FILE)) {
    const unitCoverage = normalizeIstanbulCoveragePaths(
      JSON.parse(await readFile(UNIT_COVERAGE_FILE, "utf8")),
    );
    mergedAllCoverage = mergeIstanbulCoverageMaps(
      e2eIstanbulCoverage,
      unitCoverage,
    );
    console.log("included unit coverage: coverage/coverage-final.json");
  } else {
    console.warn(
      "unit coverage not found: coverage/coverage-final.json (e2e only)",
    );
  }

  const allReport = MCR({
    name: "All Coverage (Unit + E2E)",
    outputDir: path.join(ROOT, "coverage-all"),
    clean: true,
    cleanCache: true,
    all: ALL_SOURCE_FILES,
    reports: [
      ["html"],
      ["text-summary"],
      ["console-details", { skipPercent: 0 }],
    ],
    sourceFilter: SOURCE_FILTER,
    sourcePath: (filePath) => toRelativePath(filePath),
  });

  await allReport.add(mergedAllCoverage);
  await allReport.generate();
  console.log("all coverage report: coverage-all/index.html");
}
