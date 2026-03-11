import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema";

declare global {
  var __db__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

if (!global.__db__) {
  const pg = postgres(process.env.DATABASE_URL!);
  global.__db__ = drizzle(pg, { schema });
}

export const db = global.__db__;
export * from "../../db/schema";
