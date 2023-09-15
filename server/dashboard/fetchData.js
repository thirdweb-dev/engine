async function fetchWalletData() {
  try {
    // Fetch data from API
    const url = "http://localhost:3005/wallet/getAll";
    console.log("Fetching data from:", url);

    const response = await fetch(
      "http://localhost:3005/wallet/getAll?network=mumbai",
      {
        method: "GET",
        mode: "cors",
        // credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7xOVqKVj0mHwOOW2AOx2N-a3GqLCQ7Z9s9-sw",
        },
      },
    );
    const data = await response.json();

    // Get table element
    const table = document.getElementById("walletTable");

    // Clear existing rows
    table.innerHTML =
      "<tr><th>Wallet Address</th><th>Wakket Type</th><th>ChainID</th><th>Balance</th></tr>";

    // Populate table
    for (const item of data.result) {
      const row = table.insertRow(-1);
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      const cell3 = row.insertCell(2);
      const cell4 = row.insertCell(3);

      cell1.innerHTML = item.walletAddress;
      cell2.innerHTML = item.walletType;
      cell3.innerHTML = item.chainId;
      cell4.innerHTML = item.balance.displayValue;
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
      "<tr><th>queueId</th><th>wallet Address</th><th>contract Address</th><th>status</th><th>Tx Hash</th><th>Processed Timestamp</th><th>Submitted Timestamp</th><th>Mined Timestamp</th><th>BlockNumber</th></tr>";

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
      cell2.innerHTML = item.walletAddress;
      cell3.innerHTML = item.contractAddress;
      cell4.innerHTML = item.status;
      cell5.innerHTML = item.txHash;
      cell6.innerHTML = item.txProcessedTimestamp;
      cell7.innerHTML = item.txSubmittedTimestamp;
      cell8.innerHTML = item.txMinedTimestamp;
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
