import { execSync } from "child_process";
import { prisma } from "../../db/client";

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

  console.log(hasWalletsTable);

  if (hasWalletsTable) {
    execSync("yarn prisma migrate reset --force", { stdio: "inherit" });
  } else {
    execSync("yarn prisma migrate deploy", { stdio: "inherit" });
  }

  execSync("yarn prisma generate", { stdio: "inherit" });
};

main();
