import type { Abi } from "@thirdweb-dev/sdk";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../server/middleware/error";
import { getSdk } from "./getSdk";

interface GetContractParams {
  chainId: number;
  walletAddress?: string;
  accountAddress?: string;
  contractAddress: string;
  abi?: Abi;
}

export const getContract = async ({
  chainId,
  walletAddress,
  contractAddress,
  accountAddress,
  abi,
}: GetContractParams) => {
  const sdk = await getSdk({ chainId, walletAddress, accountAddress });

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
