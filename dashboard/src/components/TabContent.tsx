import { Button, Input, VStack } from "@chakra-ui/react";
import { FC, useState } from "react";
import { TabInput, WalletType } from "../types";

interface TabContentProps {
  tabNumber: number;
  tabName: string;
  onSubmit: (
    tabNumber: number,
    tabName: string,
    data: TabInput["awsKms"] | TabInput["gcpKms"] | TabInput["local"],
  ) => void;
  awsData?: TabInput["awsKms"];
  googleData?: TabInput["gcpKms"];
  localData?: TabInput["local"];
}

const TabContent: FC<TabContentProps> = ({
  tabNumber,
  tabName,
  onSubmit,
  awsData,
  googleData,
  localData,
}) => {
  const [aws, setAws] = useState<TabInput["awsKms"]>(awsData!);
  const [google, setGoogle] = useState<TabInput["gcpKms"]>(googleData!);
  const [local, setLocal] = useState<TabInput["local"]>(localData!);

  const handleInputSubmit = () => {
    if (tabNumber === 0) {
      onSubmit(tabNumber, tabName, aws);
    } else if (tabNumber === 1) {
      onSubmit(tabNumber, tabName, google);
    } else if (tabNumber === 2) {
      onSubmit(tabNumber, tabName, local);
    }
  };

  return (
    <VStack spacing={4}>
      {tabName === WalletType.awsKms && tabNumber === 0 && (
        <>
          <Input
            className="input"
            placeholder="aws access key"
            value={aws.awsAccessKey}
            onChange={(e) =>
              setAws((prev) => ({ ...prev, awsAccessKey: e.target.value }))
            }
          />
          <Input
            className="input"
            placeholder="aws secret access key"
            value={aws.awsSecretAccessKey}
            onChange={(e) =>
              setAws((prev) => ({
                ...prev,
                awsSecretAccessKey: e.target.value,
              }))
            }
          />
          <Input
            className="input"
            placeholder="aws region"
            value={aws.awsRegion}
            onChange={(e) =>
              setAws((prev) => ({ ...prev, awsRegion: e.target.value }))
            }
          />
          <Button onClick={handleInputSubmit}>Submit</Button>
        </>
      )}
      {tabName === WalletType.gcpKms && tabNumber === 1 && (
        <>
          <Input
            className="input"
            placeholder="Google Application Project Id"
            value={google.gcpProjectId}
            onChange={(e) =>
              setGoogle((prev) => ({
                ...prev,
                gcpProjectId: e.target.value,
              }))
            }
          />
          <Input
            className="input"
            placeholder="Google Application Credential Private Key"
            value={google.gcpAppCredentialPrivateKey}
            onChange={(e) =>
              setGoogle((prev) => ({
                ...prev,
                gcpAppCredentialPrivateKey: e.target.value,
              }))
            }
          />
          <Input
            className="input"
            placeholder="Google Application Credential Email"
            value={google.gcpAppCredentialEmail}
            onChange={(e) =>
              setGoogle((prev) => ({
                ...prev,
                gcpAppCredentialEmail: e.target.value,
              }))
            }
          />
          <Input
            className="input"
            placeholder="Google KMS Key Ring Id"
            value={google.gcpKmsRingId}
            onChange={(e) =>
              setGoogle((prev) => ({
                ...prev,
                gcpKmsRingId: e.target.value,
              }))
            }
          />
          <Input
            className="input"
            placeholder="Google KMS Location Id"
            value={google.gcpLocationId}
            onChange={(e) =>
              setGoogle((prev) => ({
                ...prev,
                gcpLocationId: e.target.value,
              }))
            }
          />
          <Button onClick={handleInputSubmit}>Submit</Button>
        </>
      )}
      {tabName === WalletType.local && tabNumber === 2 && (
        <>
          <Input
            className="input"
            placeholder="privateKey"
            value={local.privateKey}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, privateKey: e.target.value }))
            }
          />
          <Input
            className="input"
            placeholder="mnemonic"
            value={local.mnemonic}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, mnemonic: e.target.value }))
            }
          />
          <Input
            className="input"
            placeholder="encryptedJson"
            value={local.encryptedJson}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, encryptedJson: e.target.value }))
            }
          />
          <Input
            className="input"
            placeholder="password"
            value={local.password}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, password: e.target.value }))
            }
          />
          <Button onClick={handleInputSubmit}>Submit</Button>
        </>
      )}
    </VStack>
  );
};

export default TabContent;
