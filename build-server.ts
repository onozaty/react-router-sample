import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dependencies, devDependencies } from "./package.json";

const outDir = "build/";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

// Get all dependency names
const externalDeps = [
  ...Object.keys(dependencies || {}),
  ...Object.keys(devDependencies || {}),
];

await esbuild.build({
  entryPoints: [path.join(projectDir, "server.ts")],
  outfile: path.join(projectDir, outDir, "server.js"),
  bundle: true,
  platform: "node",
  external: externalDeps,
  target: "es2022",
  format: "esm",
  minify: false,
  sourcemap: true,
});
