import MCR from "monocart-coverage-reports";
import { commonMcrOptions } from "./coverage-config";

const report = MCR({
  name: "Merged Coverage (Unit + E2E)",
  // ユニットテストとE2Eテストのrawデータを統合
  inputDir: ["./coverage/raw", "./coverage-e2e/raw"],
  outputDir: "./coverage-merged",
  ...commonMcrOptions,
});

await report.generate();
console.log("Merged coverage report: coverage-merged/index.html");
