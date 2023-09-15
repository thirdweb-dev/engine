async function fetchWalletData() {
  try {
    // Fetch data from API
    const url = "http://localhost:3005/wallet/getAll";
    console.log("Fetching data from:", url);

    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      // credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7xOVqKVj0mHwOOW2AOx2N-a3GqLCQ7Z9s9-sw",
      },
    });
    const data = await response.json();

    // Get table element
    const table = document.getElementById("walletTable");

    // Clear existing rows
    table.innerHTML = "<tr><th>Address</th><th>Wallet Type</th></tr>";

    // Populate table
    for (const item of data.result) {
      const row = table.insertRow(-1);
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);

      cell1.innerHTML = item.address;
      cell2.innerHTML = item.type;
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function fetchTransactionData() {
  try {
    // Fetch data from API
    const url =
      "http://localhost:3005/transaction/getAll?page=1&limit=10&sort=createdTimestamp&sort_order=asc&filter=all";
    console.log("Fetching data from:", url);

    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7xOVqKVj0mHwOOW2AOx2N-a3GqLCQ7Z9s9-sw",
      },
    });
    const data = await response.json();

    // Get table element
    const table = document.getElementById("transactionTable");

    // Clear existing rows
    table.innerHTML =
      "<tr><th>queueId</th><th>From Address</th><th>To Address</th><th>Status</th><th>Tx Hash</th><th>Processed Timestamp</th><th>Submitted Timestamp</th><th>Mined Timestamp</th><th>BlockNumber</th></tr>";

    // Populate table
    for (const item of data.result) {
      const row = table.insertRow(-1);
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      const cell3 = row.insertCell(2);
      const cell4 = row.insertCell(3);
      const cell5 = row.insertCell(4);
      const cell6 = row.insertCell(5);
      const cell7 = row.insertCell(6);
      const cell8 = row.insertCell(7);
      const cell9 = row.insertCell(8);

      cell1.innerHTML = item.queueId;
      cell2.innerHTML = item.fromAddress;
      cell3.innerHTML = item.toAddress;
      cell4.innerHTML = item.status;
      cell5.innerHTML = item.transactionHash;
      cell6.innerHTML = item.processedAt;
      cell7.innerHTML = item.sentAt;
      cell8.innerHTML = item.minedAt;
      cell9.innerHTML = item.blockNumber;
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function fetchData() {
  await fetchWalletData();
  await fetchTransactionData();
}

function attachRefetch() {
  document.getElementById("refetchButton").addEventListener("click", fetchData);
}

// Fetch data when the page loads
window.onload = attachRefetch();
