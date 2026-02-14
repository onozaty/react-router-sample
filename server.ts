import compression from "compression";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import * as v8 from "node:v8";
import { logger } from "./app/lib/logger.server";

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

// Custom logging middleware for start and end logs
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  const requestLogger = logger.child({
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
  });

  // Start log
  requestLogger.info("Request started");

  // End log when response finishes
  res.on("finish", () => {
    const duration = performance.now() - start;
    requestLogger.info(
      {
        statusCode: res.statusCode,
        duration: `${duration.toFixed(3)}ms`,
      },
      "Request completed",
    );
  });

  next();
});

app.use(compression());
app.disable("x-powered-by");

// Flush V8 coverage on demand during E2E to avoid missing data on forced shutdown.
if (process.env.E2E_COVERAGE === "1") {
  app.post("/__coverage/flush", (_req, res) => {
    try {
      v8.takeCoverage();
      res.status(204).end();
    } catch (error) {
      logger.warn({ error }, "Failed to flush V8 coverage");
      res.status(500).end();
    }
  });
}

if (DEVELOPMENT) {
  logger.info("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      console.warn("Error during SSR:", error);
      next(error);
    }
  });
} else {
  logger.info("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
