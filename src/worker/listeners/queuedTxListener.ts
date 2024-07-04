// let processTxStarted = false;
// let task: cron.ScheduledTask;

// export const queuedTxListener = async (): Promise<void> => {
//   logger({
//     service: "worker",
//     level: "info",
//     message: `Listening for queued transactions`,
//   });

//   const config = await getConfig();

//   if (!config.minedTxListenerCronSchedule) {
//     return;
//   }
//   if (task) {
//     task.stop();
//   }

//   task = cron.schedule(config.minedTxListenerCronSchedule, async () => {
//     if (!processTxStarted) {
//       processTxStarted = true;
//       await processTx();
//       processTxStarted = false;
//     } else {
//       logger({
//         service: "worker",
//         level: "warn",
//         message: `processTx already running, skipping`,
//       });
//     }
//   });
// };
