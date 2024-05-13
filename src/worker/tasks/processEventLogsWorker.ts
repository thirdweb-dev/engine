import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import {
  EnqueueEventLogsData,
  PROCESS_EVENT_LOGS_QUEUE_NAME,
} from "../queues/processEventLogsQueue";
import { logWorkerEvents } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { chainId, addresses, fromBlock, toBlock } =
    superjson.parse<EnqueueEventLogsData>(job.data);

  // TODO
};

// Worker
let _worker: Worker | null = null;
if (redis) {
  _worker = new Worker(PROCESS_EVENT_LOGS_QUEUE_NAME, handler, {
    concurrency: 1,
    connection: redis,
  });
  logWorkerEvents(_worker);
}
