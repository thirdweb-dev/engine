import { initServer } from "./server";
import { initWorker } from "./worker";

const main = async () => {
  // TODO: Revisit if/when we migrate data to Redis.
  // await initSyncConfigFromPostgres();
  await initServer();
  await initWorker();
};

main();
