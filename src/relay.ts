import Fastify, { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import {
  ThirdwebSDK,
  Abi,
  getAllDetectedFeatureNames,
  resolveContractUriFromAddress,
} from "@thirdweb-dev/sdk";
import { Fleet } from "./fleet";

export async function relayTransaction(
  network,
  payload,
  signature,
  forwarderAddress
) {
  // TODO: validate payload schema
  const contractAddress = payload.to;
  if (!contractAddress) {
    throw new Error("Invalid payload contract address");
  }

  // TODO validate contract address
  const sdk = Fleet.getSDK(network);

  const contract = await sdk.getContract(contractAddress);
  const features = getAllDetectedFeatureNames(contract.abi as Abi);

  if (features.includes("Gasless")) {
    // meta transaction
    const hasValidTrustedForwarder = contract.call(
      "isTrustedForwarder",
      forwarderAddress
    );
    if (!hasValidTrustedForwarder) {
      throw new Error("Invalid trusted forwarder");
    }

    const forwarder = await sdk.getContract(forwarderAddress);
    const isSignatureValid = forwarder.call("verify", payload, signature);
    if (!isSignatureValid) {
      throw new Error("Signature is not verified");
    }

    const txHash = await Fleet.sendTransaction(
      network,
      forwarderAddress,
      "execute",
      [payload, signature],
      {
        gasLimit: parseInt(payload.gas) + 50000,
      }
    );

    return { transactionHash: txHash };
  } else if (features.includes("ERC20Permit")) {
    // token permit
    const { owner, spender, value, deadline, v, r, s } = payload;

    // TODO: sign not execute
    const callResult = await contract.call(
      "permit",
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s
    );
    return callResult.receipt;
  } else {
    // unsupported
    throw new Error("Unexpected relay type");
  }
}
