import { Queue } from "bullmq";
import { redis } from "../../lib/redis.js";

// Define job data type
export type TestJobData = {
  action: "pass" | "fail";
  value: number;
};

// Define job result type
export type TestJobResult = {
  status: "passed" | "failed";
  message: string;
  attempts: number;
};

// Queue name constant
export const TEST_QUEUE_NAME = "executor_test";

// Create the queue
export const testQueue = new Queue<TestJobData, TestJobResult>(
  TEST_QUEUE_NAME,
  {
    defaultJobOptions: {
      attempts: 10, // Allow up to 10 attempts
      backoff: {
        type: "custom", // Use custom backoff strategy
      },
    },
    connection: redis,
  }
);

await testQueue.setGlobalConcurrency(10000);