// Verify database connection is configured
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in test environment");
}
