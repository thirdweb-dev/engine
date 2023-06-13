import PQueue from "p-queue";

export const queue = new PQueue({
  concurrency: 1,
  autoStart: true,
});

queue.on("error", (error: any) => {
  console.log(`Process Error. Size: ${queue.size}  Pending: ${queue.pending}`);
  console.error(error);
  throw error;
});
