import weth from "./mock/WETH9.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ContractPublisher,
  ContractPublisher__factory,
  DropERC1155__factory,
  DropERC1155_V2__factory,
  DropERC20__factory,
  DropERC20_V2__factory,
  DropERC721__factory,
  DropERC721_V3__factory,
  Marketplace__factory,
  MockContractPublisher,
  MockContractPublisher__factory,
  Multiwrap__factory,
  Pack__factory,
  SignatureDrop__factory,
  SignatureDrop_V4__factory,
  Split__factory,
  TokenERC1155__factory,
  TokenERC20__factory,
  TokenERC721__factory,
  TWFactory,
  TWFactory__factory,
  TWRegistry,
  TWRegistry__factory,
  TWMultichainRegistryRouter,
  TWMultichainRegistryRouter__factory,
  TWMultichainRegistryLogic,
  TWMultichainRegistryLogic__factory,
  PluginMap,
  PluginMap__factory,
  VoteERC20__factory,
  MarketplaceV3__factory,
  DirectListingsLogic__factory,
  EnglishAuctionsLogic__factory,
  OffersLogic__factory,
} from "@thirdweb-dev/contracts-js";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { ContractInterface, ethers } from "ethers";
import hardhat from "hardhat";
import { ContractType, ThirdwebSDK } from "@thirdweb-dev/sdk";

// it's there, trust me bro
const hardhatEthers = (hardhat as any).ethers;

const RPC_URL = "http://localhost:8545";

const jsonProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
const defaultProvider = hardhatEthers.provider;

let registryAddress: string;
let sdk: ThirdwebSDK;
let signer: SignerWithAddress;
let signers: SignerWithAddress[];
let implementations: { [key in ContractType]?: string };
let mock_weth_address: string;

const fastForwardTime = async (timeInSeconds: number): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  await defaultProvider.send("evm_mine", [now + timeInSeconds]);
};

export const expectError = (e: unknown, message: string) => {
  if (e instanceof Error) {
    if (!e.message.includes(message)) {
      throw e;
    }
  } else {
    throw e;
  }
};

export const mochaHooks = {
  beforeAll: async () => {
    signers = await hardhatEthers.getSigners();
    implementations = {};

    [signer] = signers;

    const trustedForwarderAddress =
      "0xc82BbE41f2cF04e3a8efA18F7032BDD7f6d98a81";
    await jsonProvider.send("hardhat_reset", []);

    const mock_weth_deployer = new ethers.ContractFactory(
      weth.abi,
      weth.bytecode,
    )
      .connect(signer)
      .deploy();
    const mock_weth = await (await mock_weth_deployer).deployed();
    mock_weth_address = mock_weth.address;

    sdk = new ThirdwebSDK(signer, {
      gasSettings: {
        maxPriceInGwei: 10000,
      },
      supportedChains: [
        {
          chainId: 31337,
          rpc: ["http://localhost:8545"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          slug: "hardhat",
        },
      ],
    });
  },
};

export {
  sdk,
  signers,
  jsonProvider,
  defaultProvider,
  registryAddress,
  fastForwardTime,
  implementations,
  hardhatEthers,
};
