import { useEffect, useState } from "react";
import TransactionDataComponent, {
  TransactionData,
} from "../../dashboard/src/components/TransactionData";
import WalletDataComponent from "../../dashboard/src/components/WalletData";
import { fetchTransactionData } from "../../dashboard/src/services/transactionService";
import { fetchWalletData } from "../../dashboard/src/services/walletService";
import "./App.css";

function App() {
  const [walletData, setWalletData] = useState([]);
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [prevPage, setPrevPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const _walletData = await fetchWalletData();
        setWalletData(_walletData);

        const _transactionData = await fetchTransactionData();
        setTransactionData(_transactionData);
        setCurrentPage(1);
        console.log(Math.ceil(_transactionData?.length / 10) + 1);
        setTotalPages(Math.ceil(_transactionData?.length / 10) + 1);
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchData();
  }, [currentPage]);

  return (
    <div className="App">
      <div className="header">
        <h6 className="gradientText0">ADMIN DASHBOARD</h6>
        <h1 className="subtitle">thirdweb engine</h1>
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
        <label>awsAccessKey:</label>
        <input type="text" id="awsAccessKey" name="awsAccessKey" />
        <br />
        <br />
        <label>awsAccessSecretKey:</label>
        <input type="text" id="awsAccessSecretKey" name="awsAccessSecretKey" />
        <br />
        <br />
        <label>awsRegion:</label>
        <input type="text" id="awsRegion" name="awsRegion" />
        <br />
        <br />
        <label>awsKmsKeyId:</label>
        <input type="text" id="awsKmsKeyId" name="awsKmsKeyId" />
        <br />
        <br />
        <input type="submit" value="Start Server" />
      </form>
      <WalletDataComponent walletData={walletData} errorMessage={error} />
      <TransactionDataComponent
        transactionData={transactionData}
        errorMessage={error}
        currentPage={currentPage}
        prevPage={prevPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        setPrevPage={setPrevPage}
      />
    </div>
  );
}

export default App;
