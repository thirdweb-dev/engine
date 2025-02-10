import { type Static, Type } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../server/middleware/error.js";
import { abiSchema } from "../../../server/schemas/contract/index.js";
import { getSdk } from "./get-sdk.js";
import type { ThirdwebSDK } from "@thirdweb-dev/sdk";

const abiArraySchema = Type.Array(abiSchema);

interface GetContractParams {
  chainId: number;
  walletAddress?: string;
  accountAddress?: string;
  contractAddress: string;
  abi?: Static<typeof abiArraySchema>;
}

export const getContract = async ({
  chainId,
  walletAddress,
  contractAddress,
  accountAddress,
  abi,
}: GetContractParams) => {
  let sdk: ThirdwebSDK;

  try {
    sdk = await getSdk({ chainId, walletAddress, accountAddress });
  } catch (e) {
    throw createCustomError(
      `Could not get SDK: ${e}`,
      StatusCodes.BAD_REQUEST,
      "INVALID_CHAIN_OR_WALLET_TYPE_FOR_ROUTE",
    );
  }

  try {
    if (abi) {
      return sdk.getContractFromAbi(contractAddress, abi);
    }
    // SDK already handles caching.
    return await sdk.getContract(contractAddress);
  } catch (e) {
    throw createCustomError(
      `Contract metadata could not be resolved: ${e}`,
      StatusCodes.BAD_REQUEST,
      "INVALID_CONTRACT",
    );
  }
};
