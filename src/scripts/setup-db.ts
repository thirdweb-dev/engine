import { execSync } from "child_process";
import { prisma } from "../db/client";

const main = async () => {
  const [{ exists: hasWalletsTable }]: [{ exists: boolean }] =
    await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM   pg_tables
        WHERE  schemaname = 'public'
        AND    tablename = 'wallets'
      );
    `;

  const schema =
    process.env.NODE_ENV === "production"
      ? `./dist/prisma/schema.prisma`
      : `./src/prisma/schema.prisma`;

  if (hasWalletsTable) {
    execSync(`npx prisma migrate reset --force --schema ${schema}`, {
      stdio: "inherit",
    });
  } else {
    execSync(`npx prisma migrate deploy --schema ${schema}`, {
      stdio: "inherit",
    });
  }

  execSync(`npx prisma generate --schema ${schema}`, { stdio: "inherit" });
};

main();
