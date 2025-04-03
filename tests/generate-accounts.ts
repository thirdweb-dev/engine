// const engineUrl = "https://engine-v3-test-instance-yl1c.engine-aws-usw2.zeet.app";
// const AUTH_TOKEN =
//   "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIweEJEZjEyMzYwQjFDNWZiQmVGOUM1NDM4QTI4QTBEYzA0QzQ3MkVBMzgiLCJzdWIiOiIweEJEZjEyMzYwQjFDNWZiQmVGOUM1NDM4QTI4QTBEYzA0QzQ3MkVBMzgiLCJhdWQiOiJ0aGlyZHdlYi5jb20iLCJleHAiOjQ4OTQzMDAzNTYsIm5iZiI6MTc0MDcwMDM1NiwiaWF0IjoxNzQwNzAwMzU2LCJqdGkiOiI2NmU2YzczZi1lMzdjLTRhOWUtYWQ5OC0yZGEyMGRiYTg3ODQiLCJjdHgiOnsicGVybWlzc2lvbnMiOlsiQURNSU4iXX19.MHgyYzc3ZWEzZjIzNjE5YzVkZDIyNTdkMGE2OTljNzg3MDcwY2M0ZmJlZDVhNzA1ZDZhZjQxODVlOTZmZGZmZDU0MzNlMTA4ZTQxOWJmZDUwZjQ4MDAxNmU4ODk0ZmFjZDQ0OGM1MGY3YWQ1ZmZkZDM3NDU3NDhkODRjNzU3ZmMyZjFi";
const engineUrl = "http://localhost:3005";
const AUTH_TOKEN = "Bearer ndnypk25YsSSenDFx30k7L3UlOqH8fdtuW9NAr9ydYWQPjHb0sDEgb_8d3SjLl6gy3ryovgl656P2tv52kR93g";


// Configuration
const TOTAL_ACCOUNTS = 1000;
const BATCH_SIZE = 50; // Process 50 accounts at a time

const accounts: unknown[] = [];

// Simple sleep function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Warm up connection
await fetch(`${engineUrl}/system/health`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  },
});

// Process in batches
for (let i = 0; i < TOTAL_ACCOUNTS; i += BATCH_SIZE) {
  const batchSize = Math.min(BATCH_SIZE, TOTAL_ACCOUNTS - i);
  const batchPromises = Array.from({ length: batchSize }, (_, j) => {
    const index = i + j;
    return fetch(`${engineUrl}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_TOKEN,
      },
      body: JSON.stringify({
        type: "local",
        label: `load-test-${index}`,
      }),
    })
      .then((res) => res.json())
      .then((data) => accounts.push(data));
  });

  await Promise.all(batchPromises);

  // Small delay between batches
  if (i + BATCH_SIZE < TOTAL_ACCOUNTS) {
    await sleep(200);
  }
}

// Only output the accounts JSON
console.log(JSON.stringify(accounts, null, 2));
