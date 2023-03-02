import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { CallOverrides, ethers, Signer } from "ethers";
import process from "process";

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
  // this is a widely used testing private keys wallets (default anvil / hardhat)
  static PRIVATE_KEYS = [
    process.env.PRIVATE_KEY ||
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  ];

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
    const sdk = Fleet.getSDK(network);

    const contract = await sdk.getContract(contractAddress);
    const nonce = await Fleet.getWalletNonce(sdk.getSigner());
    const tx = await contract.prepare(method, params, {
      ...callOverrides,
      nonce,
    });
    const txSig = await tx.sign();
    const txHash = ethers.utils.keccak256(txSig);

    (sdk.getSigner()?.provider as any).send("eth_sendRawTransaction", [txSig]);

    return txHash;
  }
}
