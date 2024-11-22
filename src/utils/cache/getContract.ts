import { Static, Type } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../server/middleware/error";
import { abiSchema } from "../../server/schemas/contract";
import { getSdk } from "./getSdk";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
