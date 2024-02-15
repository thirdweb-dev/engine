import { initServer } from "./server";
import { initWorker } from "./worker";

const main = async () => {
  initServer();
  initWorker();
};

main();
