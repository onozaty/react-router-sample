import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const pg = postgres(process.env.DATABASE_URL!);
const db = drizzle(pg);

await db.execute(sql`DROP SCHEMA IF EXISTS "public" CASCADE`);
await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`);
await db.execute(sql`CREATE SCHEMA "public"`);

await pg.end();
