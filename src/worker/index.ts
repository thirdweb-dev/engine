import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";

// Init Redis workers
import "./tasks/queuedTxWorker";
import "./tasks/sentTxWorker";
import "./tasks/webhookWorker";

export const initWorker = async () => {
  // Listen for new & updated configuration data
  await newConfigurationListener();
  await updatedConfigurationListener();

  await chainIndexerListener();
};
