import { sendWorker as externalBundlerAsyncSendWorker } from "./external-bundler-async";
import { confirmWorker as externalBundlerAsyncConfirmWorker } from "./external-bundler-async";

import { confirmWorker as externalBundlerSyncConfirmWorker } from "./external-bundler";

export {
  externalBundlerAsyncSendWorker,
  externalBundlerAsyncConfirmWorker,
  externalBundlerSyncConfirmWorker,
};

export async function closeAllWorkers() {
  await externalBundlerAsyncSendWorker.close();
  await externalBundlerAsyncConfirmWorker.close();
  await externalBundlerSyncConfirmWorker.close();
}
