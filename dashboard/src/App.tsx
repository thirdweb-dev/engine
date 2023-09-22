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

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [prevPage, setPrevPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const _walletData = await fetchWalletData();
        setWalletData(_walletData);

        const _transactionData = await fetchTransactionData();
        setTransactionData(_transactionData);
        setTotalPages(Math.ceil(_transactionData?.length / 10));
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
