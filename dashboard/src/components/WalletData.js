// src/components/WalletData.js
import PropTypes from "prop-types";
import React from "react";

function TableBody({ walletData, errorMessage }) {
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

function WalletData({ walletData, errorMessage }) {
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

WalletData.propTypes = {
  walletData: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
    }),
  ).isRequired,
  errorMessage: PropTypes.string,
};

export default WalletData;
