import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { createConfig } from "../services/createConfigService";
import { TabInput } from "../types";
import TabContent from "./TabContent";

interface WalletData {
  address: string;
  type: string;
}

interface WalletDataComponentProps {
  walletData: WalletData[];
  errorMessage: string | null;
  awsData: TabInput["awsKms"];
  googleData: TabInput["gcpKms"];
  localData: TabInput["local"];
}

interface TableBodyProps {
  walletData: WalletData[];
  errorMessage: string | null;
}

function TableBody({ walletData, errorMessage }: TableBodyProps) {
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
    <Tbody>
      {walletData.map((item, index) => (
        <Tr key={index}>
          <Td>{item.address}</Td>
          <Td>{item.type}</Td>
        </Tr>
      ))}
    </Tbody>
  );
}

function WalletDataComponent({
  walletData,
  errorMessage,
  awsData,
  googleData,
  localData,
}: WalletDataComponentProps) {
  const tabNames = ["aws-kms", "gcp-kms", "local"];
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);
  const [tabName, setTabName] = useState(tabNames[0]);

  const handleTabsChange = (index: number) => {
    setTabIndex(index);
    setTabName(tabNames[index]);
  };

  useEffect(() => {
    setTabIndex(0);
  }, [isOpen]);

  const handleSubmit = async (
    tabNumber: number,
    tabName: string,
    data: TabInput["awsKms"] | TabInput["gcpKms"] | TabInput["local"],
  ) => {
    try {
      const secretKey = localStorage.getItem("secretKey");
      if (!secretKey) {
        return null;
      }
      await createConfig(tabName, data, secretKey!);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="heading">
        <h3>Your Wallets</h3>
        <Button className="button" onClick={onOpen}>
          Create Wallet
        </Button>
      </div>
      <Table className="table" id="walletTable">
        <Thead>
          <Tr>
            <Th>Address</Th>
            <Th>Wallet Type</Th>
          </Tr>
        </Thead>
        <TableBody walletData={walletData} errorMessage={errorMessage} />
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs index={tabIndex} onChange={handleTabsChange}>
              <TabList>
                <Tab>AWS KMS</Tab>
                <Tab>Google KMS</Tab>
                <Tab>Local</Tab>
              </TabList>

              <TabPanels>
                <TabContent
                  tabNumber={0}
                  tabName={tabName}
                  onSubmit={handleSubmit}
                  awsData={awsData}
                  googleData={googleData}
                  localData={localData}
                />
                <TabContent
                  tabNumber={1}
                  tabName={tabName}
                  onSubmit={handleSubmit}
                  awsData={awsData}
                  googleData={googleData}
                  localData={localData}
                />
                <TabContent
                  tabNumber={2}
                  tabName={tabName}
                  onSubmit={handleSubmit}
                  awsData={awsData}
                  googleData={googleData}
                  localData={localData}
                />
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default WalletDataComponent;
