// src/components/WalletData.js
import PropTypes from "prop-types";
import React from "react";

function TableBody({ transactionData, errorMessage }) {
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
      {transactionData.map((item, index) => (
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

function TransactionData({ transactionData, errorMessage }) {
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
    </div>
  );
}

TransactionData.propTypes = {
  transactionData: PropTypes.arrayOf(
    PropTypes.shape({
      queueId: PropTypes.string.isRequired,
      fromAddress: PropTypes.string.isRequired,
      toAddress: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      transactionHash: PropTypes.string.isRequired,
      processedAt: PropTypes.string.isRequired,
      sentAt: PropTypes.string.isRequired,
      minedAt: PropTypes.string.isRequired,
      blockNumber: PropTypes.string.isRequired,
    }),
  ).isRequired,
  errorMessage: PropTypes.string,
};

export default TransactionData;
