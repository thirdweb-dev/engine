import { Static, Type } from "@sinclair/typebox";
import { TransactionError } from "@thirdweb-dev/sdk";
import { logger } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  ADDRESS_ZERO,
  defineChain,
  getContract,
  simulateTransaction,
} from "thirdweb";
import { simulateHandleOp } from "thirdweb/extensions/erc4337";
import { EntrypointAbi } from "../../../constants/bundler";
import { getBundlerById } from "../../../db/bundler/getBundlerById";
import { prisma } from "../../../db/client";
import { getSdk } from "../../../utils/cache/getSdk";
import { thirdwebClient } from "../../../utils/sdk";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { UserOperation, getUserOpHash } from "../../utils/userop";

const ParamsSchema = Type.Object({
  bundlerId: Type.String(),
});

export const UserOperationSchema = Type.Object({
  sender: Type.String(),
  nonce: Type.String(),
  initCode: Type.String(),
  callData: Type.String(),
  callGasLimit: Type.String(),
  verificationGasLimit: Type.String(),
  preVerificationGas: Type.String(),
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
  signature: Type.String(),
  paymasterAndData: Type.String(),
});

const BodySchema = Type.Union([
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    method: Type.Literal("eth_sendUserOperation"),
    params: Type.Tuple([UserOperationSchema, Type.String()]),
  }),
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    method: Type.Literal("eth_estimateUserOperationGas"),
    params: Type.Tuple([UserOperationSchema, Type.String()]),
  }),
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    method: Type.Literal("eth_chainId"),
  }),
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    method: Type.Literal("eth_getUserOperationReceipt"),
  }),
]);

const ReplySchema = Type.Union([
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    result: Type.Any(),
  }),
  Type.Object({
    error: Type.Optional(
      Type.Object({
        message: Type.String(),
      }),
    ),
  }),
]);

export async function bundler(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/bundler/:bundlerId",
    schema: {
      summary: "Bundler",
      description: "Bundler",
      tags: ["Bundler"],
      operationId: "bundler",
      params: ParamsSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { bundlerId } = req.params;
      const bundler = await getBundlerById({ id: bundlerId });
      if (!bundler) {
        return res.status(400).send({
          error: {
            message: `No bundler found with id '${bundlerId}'`,
          },
        });
      }

      if (req.body.method === "eth_chainId") {
        return res.status(200).send({
          id: req.body.id,
          jsonrpc: req.body.jsonrpc,
          result: `0x${bundler.chainId.toString(16)}`,
        });
      }

      if (req.body.method === "eth_estimateUserOperationGas") {
        const [userOp, entrypointAddress] = req.body.params;
        const entrypoint = getContract({
          client: thirdwebClient,
          chain: defineChain(bundler.chainId),
          address: entrypointAddress,
          abi: EntrypointAbi,
        });
        const simulate = simulateHandleOp({
          contract: entrypoint,
          op: {
            sender: userOp.sender,
            initCode: userOp.initCode as `0x${string}`,
            callData: userOp.callData as `0x${string}`,
            callGasLimit: BigInt(10000000),
            preVerificationGas: BigInt(10000000),
            verificationGasLimit: BigInt(10000000),
            maxFeePerGas: BigInt(userOp.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
            nonce: BigInt(userOp.nonce),
            paymasterAndData: userOp.paymasterAndData as `0x${string}`,
            signature: userOp.signature as `0x${string}`,
          },
          target: ADDRESS_ZERO,
          targetCallData: "0x",
        });
        try {
          const res = await simulateTransaction({
            transaction: simulate,
          });
          logger.info("Simulation result", res);
        } catch (err: any) {
          // expected error, extract gas consumption from it
          // console.log(err);
          logger.info("Simulation error", err);
          if (err.mesage?.includes("FailedOp")) {
            return res.status(400).send({
              error: {
                message: `Invalid user operation - failed in simulation with error: ${err.message}`,
              },
            });
          }

          if (err.message?.includes("ExecutionResult")) {
            // ExecutionResult(opInfo.preOpGas, paid, data.validAfter, data.validUntil, targetSuccess, targetResult)

            // TODO calulate each gas value
            return res.status(200).send({
              id: req.body.id,
              jsonrpc: req.body.jsonrpc,
              result: {
                preVerificationGas: "0xba7123",
                verificationGas: "0x18d23",
                verificationGasLimit: "0x18d23",
                callGasLimit: "0x3477e",
              },
            });
          }
        }
      }

      if (req.body.method === "eth_getUserOperationReceipt") {
        // TODO grab the receipt from db
        return res.status(200).send({
          id: req.body.id,
          jsonrpc: req.body.jsonrpc,
          result: "0x",
        });
      }

      const [userOp, entrypointAddress] = req.body.params;

      if (
        req.body.params[1] &&
        req.body.params[1]?.toLowerCase() !== entrypointAddress?.toLowerCase()
      ) {
        return res.status(400).send({
          error: {
            message: `Entrypoint address is not supported by this bundler.`,
          },
        });
      }

      const sdk = await getSdk({
        chainId: bundler.chainId,
        walletAddress: bundler.backendWalletAddress,
      });

      const entrypoint = await sdk.getContractFromAbi(
        bundler.entrypointAddress,
        EntrypointAbi,
      );

      try {
        const tx = entrypoint.prepare("handleOps", [
          [userOp],
          bundler.backendWalletAddress,
        ]);
        await tx.estimateGasLimit();
      } catch (err: any) {
        if (err instanceof TransactionError) {
          return res.status(400).send({
            error: {
              message: `Invalid user operation - failed in simulation with error: ${err.reason}`,
            },
          });
        }

        return res.status(400).send({
          error: {
            message: `Invalid user operation - failed in simulation with error: ${err.message}`,
          },
        });
      }

      const userOpHash = getUserOpHash({
        userOp: userOp as UserOperation,
        entrypointAddress: bundler.entrypointAddress,
        chainId: bundler.chainId,
      });

      await prisma.bundlerUserOperations.create({
        data: {
          ...userOp,
          chainId: bundler.chainId.toString(),
          userOpHash,
          queuedAt: new Date(),
          entrypointAddress: bundler.entrypointAddress,
          backendWalletAddress: bundler.backendWalletAddress,
        },
      });

      return res.status(200).send({
        id: req.body.id,
        jsonrpc: req.body.jsonrpc,
        result: userOpHash,
      });
    },
  });
}
