import { FC } from "react";

export interface TransactionData {
  queueId: string;
  fromAddress: string;
  toAddress: string;
  status: string;
  transactionHash: string;
  processedAt: string;
  sentAt: string;
  minedAt: string;
  blockNumber: number;
}

interface TransactionDataComponentProps {
  transactionData: TransactionData[];
  currentPage: number;
  prevPage: number | null;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPrevPage: React.Dispatch<React.SetStateAction<number>>;
  errorMessage: string | null;
}

interface TableBodyProps {
  transactionData: TransactionData[];
  errorMessage: string | null;
}

function TableBody({ transactionData, errorMessage }: TableBodyProps) {
  if (errorMessage) {
    return (
      <tbody>
        <tr>
          <td>{errorMessage}</td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {transactionData.map((item: TransactionData, index: number) => (
        <tr key={index}>
          <td>{item.queueId}</td>
          <td>{item.fromAddress}</td>
          <td>{item.toAddress}</td>
          <td>{item.status}</td>
          <td>{item.transactionHash}</td>
          <td>{item.processedAt}</td>
          <td>{item.sentAt}</td>
          <td>{item.minedAt}</td>
          <td>{item.blockNumber}</td>
        </tr>
      ))}
    </tbody>
  );
}

const TransactionDataComponent: FC<TransactionDataComponentProps> = ({
  transactionData,
  currentPage,
  prevPage,
  totalPages,
  setCurrentPage,
  setPrevPage,
  errorMessage,
}) => {
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setPrevPage(currentPage);
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPrevPage(currentPage);
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  return (
    <div>
      <div className="heading">
        <h3>Transactions</h3>
      </div>
      <table className="table" id="walletTable">
        <thead>
          <tr>
            <th>queueId</th>
            <th>wallet Address</th>
            <th>contract Address</th>
            <th>status</th>
            <th>Tx Hash</th>
            <th>Processed Timestamp</th>
            <th>Submitted Timestamp</th>
            <th>Mined Timestamp</th>
            <th>BlockNumber</th>
          </tr>
        </thead>
        <TableBody
          transactionData={transactionData}
          errorMessage={errorMessage}
        />
      </table>
      <div>
        <button onClick={handlePrevPage} disabled={!prevPage}>
          Previous
        </button>
        {currentPage} of {totalPages}
        <button onClick={handleNextPage} disabled={currentPage >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default TransactionDataComponent;
