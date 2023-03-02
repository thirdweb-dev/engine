import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { CallOverrides, ethers, Signer } from "ethers";

const db: Record<string, WalletData> = {};

type WalletData = {
  address: string;
  encryptedData: string;
};

interface IWalletStore {
  getWalletData(): Promise<WalletData | null>;
  storeWalletData(data: WalletData): Promise<void>;
}

class PGWalletStore implements IWalletStore {
  private wallet_id: string;

  constructor(wallet_id: string) {
    this.wallet_id = wallet_id;
  }

  async getWalletData() {
    return db[this.wallet_id];
  }

  async storeWalletData(data: WalletData) {
    db[this.wallet_id] = data;
  }
}

export class Fleet {
  static PRIVATE_KEYS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  ];
  static NETWORKS = ["mumbai"];
  sdks: ThirdwebSDK[] = [];

  constructor() {}

  async load() {
    //new DeviceWalletImpl({
    //storage: new PGWalletStore("0"),
    //});
  }

  static getSDK(network: string) {
    return ThirdwebSDK.fromPrivateKey(Fleet.PRIVATE_KEYS[0], network, {
      supportedChains: [
        {
          chainId: 80001,
          rpc: ["http://localhost:8545"],
          nativeCurrency: {
            symbol: "MATIC",
            name: "MATIC",
            decimals: 18,
          },
        },
      ],
    });
  }

  static nonce = -1;
  static async getWalletNonce(signer: Signer | undefined) {
    if (!signer) {
      return -1;
    }
    let nonce = -1;
    if (Fleet.nonce < 0) {
      nonce = await signer.getTransactionCount();
    } else {
      nonce = Fleet.nonce;
    }
    Fleet.nonce = nonce + 1;
    return nonce;
  }

  static async sendTransaction(
    network: string,
    contractAddress: string,
    method: string,
    params: any[],
    callOverrides: CallOverrides
  ) {
    /*
       WITH cte AS (INSERT into kap(chain, key) VALUES(1, 'test 2')) SELECT DISTINCT chain, key, COUNT(*) OVER (PARTITION BY key) FROM kap WHERE key = 'test 2';
     */
    const sdk = Fleet.getSDK(network);

    const contract = await sdk.getContract(contractAddress);
    const nonce = await Fleet.getWalletNonce(sdk.getSigner());
    const tx = await contract.prepare(method, params, {
      ...callOverrides,
      nonce,
    });
    const txSig = await tx.sign();
    const txHash = ethers.utils.keccak256(txSig);

    //(sdk.getSigner()?.provider as any).send("eth_sendRawTransaction", [txSig]);

    return txHash;
  }
}
