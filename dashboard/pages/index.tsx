import { NextPage } from "next";
import { useEffect, useState } from "react";
import WalletTable from "../components/WalletTable";
import styles from "../styles/Home.module.css";
import { WalletDataType } from "../types";

const Home: NextPage = () => {
  const [data, setData] = useState<WalletDataType[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://api.yourapi.com/endpoint");
        const result: WalletDataType[] = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching the API", error);
      }
    };

    fetchData();
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h5 className={styles.subtitle}>
            <span className={styles.gradientText0}>ADMIN DASHBOARD</span>
          </h5>
          <h4 className={styles.title}>Eng Engine</h4>
          <p className={styles.description}>
            Configure and manage your wallets and transaction settings
          </p>
          <div>
            <div className={styles.heading}>
              <h3>Your Wallets</h3>
              <button className={styles.button}>Create Wallet</button>
            </div>
            <div>
              <WalletTable data={data} />
            </div>
          </div>

          <div>
            <div className={styles.heading}>
              <h3>Transactions</h3>
            </div>
            <div>
              <WalletTable data={data} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
