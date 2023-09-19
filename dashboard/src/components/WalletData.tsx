// src/components/WalletData.js

interface WalletData {
  address: string;
  type: string;
}

interface WalletDataComponentProps {
  walletData: WalletData[];
  errorMessage: string | null;
}

interface TableBodyProps {
  walletData: WalletData[];
  errorMessage: string | null;
}

function TableBody({ walletData, errorMessage }: TableBodyProps) {
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
      {walletData.map((item, index) => (
        <tr key={index}>
          <td>{item.address}</td>
          <td>{item.type}</td>
        </tr>
      ))}
    </tbody>
  );
}

function WalletDataComponent({
  walletData,
  errorMessage,
}: WalletDataComponentProps) {
  return (
    <div>
      <div className="heading">
        <h3>Your Wallets</h3>
        <button className="button">Create Wallet</button>
      </div>
      <table className="table" id="walletTable">
        <thead>
          <tr>
            <th>Address</th>
            <th>Wallet Type</th>
          </tr>
        </thead>
        <TableBody walletData={walletData} errorMessage={errorMessage} />
      </table>
    </div>
  );
}

export default WalletDataComponent;
