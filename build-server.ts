import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = "build/";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(projectDir, "server.ts")],
  outfile: path.join(projectDir, outDir, "server.js"),
  bundle: true,
  platform: "node",
  external: ["*"],
  target: "es2022",
  format: "esm",
  minify: false,
  sourcemap: true,
});
