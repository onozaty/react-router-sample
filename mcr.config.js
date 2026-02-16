/** @type {import('monocart-coverage-reports').CoverageReportOptions} */
const config = {
  name: "Unit Test Coverage",
  outputDir: "coverage",
  reports: [
    // raw データをマージ用に出力
    ["raw"],
    ["v8"],
    ["console-details", { skipPercent: 0 }],
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
  sourceFilter: {
    "**/*.test.*": false,
    "**/*.spec.*": false,
    "**/app/**": true,
    "**/*": false,
  },
};

export default config;
