async function fetchWalletData() {
  try {
    // Fetch data from API
    const url = process.env.OPEN_API_URL + "/wallet/getAll";
    console.log("Fetching data from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authroization: "Bearer " + process.env.THIRDWEB_SDK_SECRET_KEY,
      },
    });
    const data = await response.json();

    // Get table element
    const table = document.getElementById("walletTable");

    // Clear existing rows
    table.innerHTML = "<tr><th>ID</th><th>Name</th><th>Value</th></tr>";

    // Populate table
    for (const item of data) {
      const row = table.insertRow(-1);
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      const cell3 = row.insertCell(2);

      cell1.innerHTML = item.id;
      cell2.innerHTML = item.name;
      cell3.innerHTML = item.value;
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function fetchTransactionData() {
  try {
    // Fetch data from API
    const url = process.env.OPEN_API_URL + "/transaction/getAll";
    console.log("Fetching data from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authroization: "Bearer " + process.env.THIRDWEB_SDK_SECRET_KEY,
      },
    });
    const data = await response.json();

    // Get table element
    const table = document.getElementById("transactionTable");

    // Clear existing rows
    table.innerHTML = "<tr><th>ID</th><th>Name</th><th>Value</th></tr>";

    // Populate table
    for (const item of data) {
      const row = table.insertRow(-1);
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      const cell3 = row.insertCell(2);

      cell1.innerHTML = item.id;
      cell2.innerHTML = item.name;
      cell3.innerHTML = item.value;
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function fetchData() {
  await fetchWalletData();
  await fetchTransactionData();
}

// Fetch data when the page loads
window.onload = fetchData;
