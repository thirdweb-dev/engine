import { initServer } from "./server";
import { clearCacheCron } from "./utils/cron/clearCacheCron";
import { initWorker } from "./worker";

const main = async () => {
  initServer();
  initWorker();
  clearCacheCron();
};

main();
