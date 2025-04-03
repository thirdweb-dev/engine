import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';


const HOST = "http://localhost:3005";
// const AUTH_TOKEN =
//   "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIweEJEZjEyMzYwQjFDNWZiQmVGOUM1NDM4QTI4QTBEYzA0QzQ3MkVBMzgiLCJzdWIiOiIweEJEZjEyMzYwQjFDNWZiQmVGOUM1NDM4QTI4QTBEYzA0QzQ3MkVBMzgiLCJhdWQiOiJ0aGlyZHdlYi5jb20iLCJleHAiOjQ4OTQzMDAzNTYsIm5iZiI6MTc0MDcwMDM1NiwiaWF0IjoxNzQwNzAwMzU2LCJqdGkiOiI2NmU2YzczZi1lMzdjLTRhOWUtYWQ5OC0yZGEyMGRiYTg3ODQiLCJjdHgiOnsicGVybWlzc2lvbnMiOlsiQURNSU4iXX19.MHgyYzc3ZWEzZjIzNjE5YzVkZDIyNTdkMGE2OTljNzg3MDcwY2M0ZmJlZDVhNzA1ZDZhZjQxODVlOTZmZGZmZDU0MzNlMTA4ZTQxOWJmZDUwZjQ4MDAxNmU4ODk0ZmFjZDQ0OGM1MGY3YWQ1ZmZkZDM3NDU3NDhkODRjNzU3ZmMyZjFi";

const AUTH_TOKEN = "Bearer ndnypk25YsSSenDFx30k7L3UlOqH8fdtuW9NAr9ydYWQPjHb0sDEgb_8d3SjLl6gy3ryovgl656P2tv52kR93g";

// Test configuration
export const options = {
  // Standard load test configuration
  stages: [
    { duration: '5s', target: 10 },  // Ramp up to 10 users
    { duration: '10s', target: 50 },   // Ramp up to 50 users
    { duration: '45s', target: 200 },   // Ramp up to 50 users
    // { duration: '15s', target: 500 },   // Ramp up to 50 users
    // { duration: '300s', target: 1000 },   // Ramp up to 50 users
    { duration: '30s', target: 0 }    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
    http_req_duration: ['p(95)<10000'] // 95% of requests should be below 2s
  }
};

// Load wallet data from a file
const wallets = JSON.parse(open('./wallets_local.json'));

export default function () {
  // Pick a random wallet from the list
  const wallet = wallets[randomIntBetween(0, wallets.length - 1)];

  // Get the wallet address
  const fromAddress = wallet.result.smartAccounts && wallet.result.smartAccounts.length > 0
    ? wallet.result.smartAccounts[0].address
    : wallet.result.address;

  // Set up the request
  const url = `${HOST}/contract/write`;
  const payload = JSON.stringify({
    from: fromAddress,
    transactionParams: [
      {
        "method": "function safeMint(address to, uint256 tokenId, uint256 amount)",
        "params": [fromAddress, "0", "1"],
        "contractAddress": "0xd717CC9f5F68BBc4f0bEE120b26004bfd65f272e"
      }
    ],
    chainId: "13337",
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH_TOKEN
    }
  };

  // Make the request
  const response = http.post(url, payload, params);

  // Check if request was successful
  check(response, {
    'status is 200': (r) => r.status === 200,
    'transaction accepted': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result?.transactions[0]?.executionResult?.monitoringStatus === "WILL_MONITOR";
      } catch {
        return false;
      }
    }
  });

  // Add a small sleep between iterations
  sleep(1);
}