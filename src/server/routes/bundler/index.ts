import { Static, Type } from "@sinclair/typebox";
import { TransactionError } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { EntrypointAbi } from "../../../constants/bundler";
import { getBundlerById } from "../../../db/bundler/getBundlerById";
import { prisma } from "../../../db/client";
import { getSdk } from "../../../utils/cache/getSdk";
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
    method: Type.Literal("eth_chainId"),
  }),
]);

const ReplySchema = Type.Union([
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    result: Type.String(),
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
        await entrypoint.call("simulateValidation", [userOp]);
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
