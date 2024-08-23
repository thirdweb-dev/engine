// let task: cron.ScheduledTask;
// export const retryTxListener = async () => {
//   const config = await getConfig();

//   if (!config.retryTxListenerCronSchedule) {
//     return;
//   }

//   if (task) {
//     task.stop();
//   }

//   task = cron.schedule(config.retryTxListenerCronSchedule, async () => {
//     await retryTx();
//   });
// };
