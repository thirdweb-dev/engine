import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.POSTGRES_CONNECTION_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
