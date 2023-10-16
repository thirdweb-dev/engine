import cron from "node-cron";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { updateMinedTx } from "../tasks/updateMinedTx";
import { updateMinedUserOps } from "../tasks/updateMinedUserOps";

export const minedTxListener = async () => {
  const config = await getConfiguration();

  if (!config.minedTxListenerCronSchedule) {
    return;
  }

  cron.schedule(config.minedTxListenerCronSchedule, async () => {
    await updateMinedTx();
    await updateMinedUserOps();
  });
};
