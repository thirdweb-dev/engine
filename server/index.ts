import { getEnv } from "../core";
import createServer from "./helpers/server";
import { checkTablesExistence, implementTriggerOnStartUp } from "../core";

const main = async () => {
  const server = await createServer();

  server.listen(
    {
      host: getEnv("HOST"),
      port: Number(getEnv("PORT")),
    },
    (err) => {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
    },
  );

  // Check for the Tables Existence post startup
  await checkTablesExistence(server);
  await implementTriggerOnStartUp(server);
};

main();
