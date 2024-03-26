import { initSyncConfigFromPostgres } from "./scripts/sync-config-from-postgres";
import { initServer } from "./server";
import { initWorker } from "./worker";

const main = async () => {
  await initSyncConfigFromPostgres();
  await initServer();
  await initWorker();
};

main();
