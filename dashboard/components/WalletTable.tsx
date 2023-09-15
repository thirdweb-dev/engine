// components/DataTable.tsx
import React from "react";
import styles from "../styles/DataTable.module.css";
import { WalletDataType } from "../types";

interface DataTableProps {
  data: WalletDataType[] | null;
}

const WalletTable: React.FC<DataTableProps> = ({ data }) => {
  if (!data) {
    return <p>Loading...</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Address</th>
          <th>Alias</th>
          <th>Wallet Type</th>
          <th>Balance</th>
          <th>Nonce</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} className={styles.row}>
            <td>{item.address}</td>
            <td>{item.alias}</td>
            <td>{item.walletType}</td>
            <td>{item.balance}</td>
            <td>{item.nonce}</td>
            <td>{item.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default WalletTable;
