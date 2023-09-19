import React, { useEffect, useState } from "react";
import "./App.css";
import TransactionData from "./components/TransactionData";
import WalletData from "./components/WalletData";
import { fetchTransactionData } from "./services/transactionService";
import { fetchWalletData } from "./services/walletService";

function App() {
  const [walletData, setWalletData] = useState([]);
  const [transactionData, setTransactionData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const _walletData = await fetchWalletData();
        setWalletData(_walletData);

        const _transactionData = await fetchTransactionData();
        setTransactionData(_transactionData);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="App">
      <div className="header">
        <h6 className="gradientText0">ADMIN DASHBOARD</h6>
        <h1 className="subtitle">Web3-API</h1>
        <span className="subtitle">
          Configure and manage your wallets and transaction settings
        </span>
      </div>
      <form id="configForm">
        <label>
          <input type="radio" name="option" value="option1" />
          AWS KMS
        </label>
        <br />
        <label>
          <input type="radio" name="option" value="option2" />
          Google Cloud KMS
        </label>
        <label for="awsAccessKey">awsAccessKey:</label>
        <input type="text" id="awsAccessKey" name="awsAccessKey" />
        <br />
        <br />
        <label for="awsAccessSecretKey">awsAccessSecretKey:</label>
        <input type="text" id="awsAccessSecretKey" name="awsAccessSecretKey" />
        <br />
        <br />
        <label for="awsRegion">awsRegion:</label>
        <input type="text" id="awsRegion" name="awsRegion" />
        <br />
        <br />
        <label for="awsKmsKeyId">awsKmsKeyId:</label>
        <input type="text" id="awsKmsKeyId" name="awsKmsKeyId" />
        <br />
        <br />
        <input type="submit" value="Start Server" />
      </form>
      <WalletData walletData={walletData} errorMessage={error} />
      <TransactionData transactionData={transactionData} errorMessage={error} />
    </div>
  );
}

export default App;
