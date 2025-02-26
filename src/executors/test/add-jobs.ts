import { testQueue } from "./index";

async function addJobs() {
  // Create a new queue instance
  try {
    // Add 5 success jobs
    for (let i = 1; i <= 10; i++) {
      await testQueue.add(`pass-${i}`, { action: "pass", value: i });
    }
    
    // Add 1 failure job
    await testQueue.add("fail-1", { action: "fail", value: 100 });
    
    // Add 5 more success jobs
    for (let i = 11; i <= 20; i++) {
      await testQueue.add(`pass-${i}`, { action: "pass", value: i });
    }
  } finally {
    await testQueue.close();
  }
}

// Run the function and exit
addJobs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error adding jobs:", err);
    process.exit(1);
  }); 