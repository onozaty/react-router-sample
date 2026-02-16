import type MCR from "monocart-coverage-reports";

const ROOT = process.cwd();

// file:// URL や絶対パスをプロジェクトルートからの相対パスに変換する。
export function toRelativePath(filePath: string): string {
  let p = filePath;

  if (p.startsWith("file://")) {
    try {
      p = decodeURIComponent(new URL(p).pathname);
    } catch {
      return filePath;
    }
  }

  if (p.startsWith(`${ROOT}/`)) {
    return p.substring(ROOT.length + 1);
  }

  return p;
}

// 各カバレッジスクリプトで共通の MCR 設定。
// スクリプトごとに name, outputDir, inputDir 等を追加して使用する。
export const commonMcrOptions: Partial<MCR.CoverageReportOptions> = {
  reports: [["v8"], ["console-details", { skipPercent: 0 }]],
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
  sourceFilter: {
    "**/*.test.*": false,
    "**/*.spec.*": false,
    "**/app/**": true,
    "**/*": false,
  },
  sourcePath: (filePath: string) => toRelativePath(filePath),
};
