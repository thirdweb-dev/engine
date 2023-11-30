import { Hex, encodeAbiParameters, keccak256 } from "viem";

export interface UserOperation {
  sender: Hex;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
}

interface GetUserOpHashParams {
  userOp: UserOperation;
  entrypointAddress: string;
  chainId: number;
}

export const getUserOpHash = ({
  userOp,
  entrypointAddress,
  chainId,
}: GetUserOpHashParams) => {
  const hash = keccak256(
    encodeAbiParameters(
      [
        {
          name: "sender",
          type: "address",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "initCodeHash",
          type: "bytes32",
        },
        {
          name: "callDataHash",
          type: "bytes32",
        },
        {
          name: "callGasLimit",
          type: "uint256",
        },
        {
          name: "verificationGasLimit",
          type: "uint256",
        },
        {
          name: "preVerificationGas",
          type: "uint256",
        },
        {
          name: "maxFeePerGas",
          type: "uint256",
        },
        {
          name: "maxPriorityFeePerGas",
          type: "uint256",
        },
        {
          name: "paymasterAndDataHash",
          type: "bytes32",
        },
      ],
      [
        userOp.sender,
        BigInt(userOp.nonce),
        keccak256(userOp.initCode),
        keccak256(userOp.callData),
        BigInt(userOp.callGasLimit),
        BigInt(userOp.verificationGasLimit),
        BigInt(userOp.preVerificationGas),
        BigInt(userOp.maxFeePerGas),
        BigInt(userOp.maxPriorityFeePerGas),
        keccak256(userOp.paymasterAndData),
      ],
    ),
  );

  return keccak256(
    encodeAbiParameters(
      [
        {
          name: "userOpHash",
          type: "bytes32",
        },
        {
          name: "entryPointAddress",
          type: "address",
        },
        {
          name: "chainId",
          type: "uint256",
        },
      ],
      [hash, entrypointAddress as Hex, BigInt(chainId)],
    ),
  );
};
