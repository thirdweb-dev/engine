import { type Job, Worker } from "bullmq";
import { TEST_QUEUE_NAME, type TestJobData, type TestJobResult } from ".";
import { redis } from "../../lib/redis";
import { sleep } from "bun";

// Helper function to format time
function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Create the worker
export const testWorker = new Worker<TestJobData, TestJobResult>(
  TEST_QUEUE_NAME,
  async (job: Job<TestJobData, TestJobResult>) => {
    const { action, value } = job.data;
    const timeStr = formatTime();

    console.log(
      `[${timeStr}] Starting to process job ${job.id}, attempt ${
        job.attemptsMade + 1
      }`
    );

    // Sleep for a while before processing
    const sleepTime = 2000; // 2 seconds
    console.log(
      `[${timeStr}] Sleeping for ${sleepTime / 1000} seconds for job ${
        job.id
      }...`
    );
    await sleep(sleepTime);

    const afterSleepTimeStr = formatTime();
    console.log(
      `[${afterSleepTimeStr}] Done sleeping, now processing job ${
        job.id
      }, attempt ${job.attemptsMade + 1}`
    );

    // Process based on action
    if (action === "pass") {
      console.log(`[${afterSleepTimeStr}] Job ${job.id} passed successfully`);
      return {
        status: "passed",
        message: "pass",
        value: value,
        attempts: job.attemptsMade + 1,
      };
    }

    if (action === "fail") {
      // Check if we've reached the retry limit (5 attempts)
      if (job.attemptsMade >= 5) {
        console.log(
          `[${afterSleepTimeStr}] Job ${job.id} failed after ${
            job.attemptsMade + 1
          } attempts, giving up`
        );
        return {
          status: "failed",
          message: `Failed after ${job.attemptsMade + 1} attempts`,
          value: value,
          attempts: job.attemptsMade + 1,
        };
      }

      console.error(
        `[${afterSleepTimeStr}] Job ${job.id} failed, will retry (attempt ${
          job.attemptsMade + 1
        })`
      );
      throw new Error(`Intentional failure on attempt ${job.attemptsMade + 1}`);
    }

    throw new Error(`Unknown action: ${action}`);
  },
  {
    connection: redis,
    settings: {
      // Always return 0 for backoff to test immediate retries
      backoffStrategy: () => {
        return 1000; // Always return 0 to test immediate retry behavior
      },
    },
    concurrency: 5,
  }
);

// Set up event handlers for the worker
testWorker.on("ready", () => {
  console.log("Test worker ready");
});

testWorker.on("error", (err) => {
  console.error("Test worker error", err);
});
