import {
  Alert,
  AlertIcon,
  AlertTitle,
  Button,
  Flex,
  Input,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import TransactionDataComponent, {
  TransactionData,
} from "../../dashboard/src/components/TransactionData";
import WalletDataComponent from "../../dashboard/src/components/WalletData";
import { fetchTransactionData } from "../../dashboard/src/services/transactionService";
import "./App.css";
import { getConfigData } from "./services/getConfigDataService";
import { fetchWalletData } from "./services/walletService";
import { TabInput, WalletType } from "./types";
import { SecretKeyProvider, useSecretKey } from "./utils/SecretKeyContext";

function App() {
  const [walletData, setWalletData] = useState([]);
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [prevPage, setPrevPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const secretKeyContext = useSecretKey();
  const { secretKey, setSecretKey } = secretKeyContext;
  const [inputSecretKey, setInputSecretKey] = useState("");

  const [awsData, setAwsData] = useState<TabInput["awsKms"]>({
    awsAccessKey: "",
    awsSecretAccessKey: "",
    awsRegion: "",
  });
  const [googleData, setGoogleData] = useState<TabInput["gcpKms"]>({
    gcpAppCredentialEmail: "",
    gcpAppCredentialPrivateKey: "",
    gcpKmsRingId: "",
    gcpLocationId: "",
    gcpProjectId: "",
  });
  const [localData, setLocalData] = useState<TabInput["local"]>({
    privateKey: "",
    mnemonic: "",
    encryptedJson: "",
    password: "",
  });

  useEffect(() => {
    async function fetchData() {
      if (!secretKeyContext?.secretKey) {
        console.log("No secret key");
        return null;
      }

      try {
        const _configData = await getConfigData(secretKeyContext?.secretKey);
        if (_configData.configType === WalletType.awsKms) {
          setAwsData({ ..._configData });
        } else if (_configData.configType === WalletType.gcpKms) {
          setGoogleData({ ..._configData });
        } else if (_configData.configType === WalletType.local) {
          setLocalData({ ..._configData });
        }

        const _walletData = await fetchWalletData(secretKeyContext?.secretKey);
        setWalletData(_walletData);

        const _transactionData = await fetchTransactionData(
          secretKeyContext?.secretKey,
        );
        setTransactionData(_transactionData);
        setTotalPages(Math.ceil(_transactionData?.length / 10));
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchData();
  }, [currentPage, inputSecretKey, secretKey, secretKeyContext]);

  return (
    <SecretKeyProvider>
      <div>
        {!secretKey && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle mr={2}>
              Add Secretthe Auth header details here.
            </AlertTitle>
          </Alert>
        )}
      </div>
      <div className="App">
        <div className="header">
          <h6 className="gradientText0">ADMIN DASHBOARD</h6>
          <h1 className="subtitle">thirdweb engine</h1>
          <span className="subtitle">
            Configure and manage your wallets and transaction settings
          </span>
        </div>
        <Flex align="center" className="no-auth">
          <Text as="label" mr={2} whiteSpace="nowrap">
            Auth Token:
          </Text>
          <Input
            className="input"
            value={inputSecretKey}
            type="password"
            disabled={secretKey !== null}
            onChange={(e) => setInputSecretKey(e.target.value)}
            mr={2}
          />
          <Button onClick={() => setSecretKey(inputSecretKey)} mr={2}>
            Save
          </Button>
          <Button onClick={() => setSecretKey("")} mr={2}>
            Clear
          </Button>
        </Flex>
        <WalletDataComponent
          walletData={walletData}
          errorMessage={error}
          awsData={awsData}
          googleData={googleData}
          localData={localData}
        />
        <br />
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
    </SecretKeyProvider>
  );
}

function AppWrapper() {
  return (
    <SecretKeyProvider>
      <App />
    </SecretKeyProvider>
  );
}

export default AppWrapper;
