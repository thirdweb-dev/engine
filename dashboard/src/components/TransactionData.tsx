import {
  Button,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useClipboard,
} from "@chakra-ui/react";
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

function minimizeText(text: string, firstNChars = 6, lastNChars = 6) {
  return text.slice(0, firstNChars) + "..." + text.slice(-lastNChars);
}

function TableBody({ transactionData, errorMessage }: TableBodyProps) {
  if (errorMessage) {
    return (
      <Tbody>
        <Tr>
          <Td>{errorMessage}</Td>
        </Tr>
      </Tbody>
    );
  }

  return (
    // ToDo: Add Copy to Clipboard functionality
    <Tbody>
      {transactionData.map((item: TransactionData, index: number) => (
        <Tr key={index}>
          <Td>{minimizeText(item.queueId)}</Td>
          <Td>{item.status}</Td>
          <Td>{minimizeText(item.fromAddress)}</Td>
          <Td>{minimizeText(item.toAddress)}</Td>
          <Td>{minimizeText(item.transactionHash)}</Td>
          <Td>{item.blockNumber}</Td>
        </Tr>
      ))}
    </Tbody>
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
  const { onCopy, value, setValue, hasCopied } = useClipboard("");

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
      <Table className="table" id="walletTable">
        <Thead>
          <Tr>
            <Th>queueId</Th>
            <Th>status</Th>
            <Th>wallet Address</Th>
            <Th>contract Address</Th>
            <Th>Tx Hash</Th>
            <Th>Block Number</Th>
          </Tr>
        </Thead>
        <TableBody
          transactionData={transactionData}
          errorMessage={errorMessage}
        />
      </Table>
      <div>
        <Button onClick={handlePrevPage} disabled={!prevPage}>
          Previous
        </Button>
        <span>
          {currentPage} of {totalPages}
        </span>
        <Button onClick={handleNextPage} disabled={currentPage >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default TransactionDataComponent;
