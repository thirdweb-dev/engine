import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../../shared/utils/env";
import { thirdwebClientId } from "../../../../shared/utils/sdk";
import { TransactionHashSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { walletChainParamSchema } from "../../../schemas/wallet";
import { getChainIdFromChain } from "../../../utils/chain";
import { prettifyError } from "../../../../shared/utils/error";

const UserOp = Type.Object({
  sender: Type.String(),
  nonce: Type.String(),
  initCode: Type.String(),
  callData: Type.String(),
  callGasLimit: Type.String(),
  verificationGasLimit: Type.String(),
  preVerificationGas: Type.String(),
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
  paymasterAndData: Type.String(),
  signature: Type.String(),
});

const UserOpString = Type.Transform(Type.String())
  .Decode((signedUserOp) => JSON.parse(signedUserOp) as Static<typeof UserOp>)
  .Encode((userOp) => JSON.stringify(userOp));

const requestBodySchema = Type.Object({
  // signedUserOp: Type.Union([UserOpString, UserOp]),
  signedUserOp: Type.Any(),
});

const responseBodySchema = Type.Union([
  Type.Object({
    result: Type.Object({
      userOpHash: TransactionHashSchema,
    }),
  }),
  Type.Object({
    error: Type.Object({
      message: Type.String(),
    }),
  }),
]);

type RpcResponse =
  | {
      result: string;
      error: undefined;
    }
  | {
      result: undefined;
      error: {
        message: string;
      };
    };

export async function sendSignedUserOp(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletChainParamSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/:chain/send-signed-user-op",
    schema: {
      summary: "Send a signed user operation",
      description: "Send a signed user operation",
      tags: ["Transaction"],
      operationId: "sendSignedUserOp",
      params: walletChainParamSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { chain } = req.params;
      const { signedUserOp } = req.body;
      const chainId = await getChainIdFromChain(chain);

      let userOp: Static<typeof UserOp>;
      if (typeof signedUserOp === "string") {
        try {
          userOp = Value.Decode(UserOpString, signedUserOp);
        } catch (err) {
          return res.status(400).send({
            error: {
              message: `Invalid signed user operation. - ${prettifyError(err)}`,
            },
          });
        }
      } else {
        userOp = signedUserOp;
      }

      const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
      const userOpRes = await fetch(`https://${chainId}.bundler.thirdweb.com`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": thirdwebClientId,
          "x-secret-key": env.THIRDWEB_API_SECRET_KEY,
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_sendUserOperation",
          params: [userOp, entryPointAddress],
        }),
      });

      const { result: userOpHash, error } =
        (await userOpRes.json()) as RpcResponse;

      if (error) {
        return res.status(400).send({
          error: {
            message: `Failed to send - ${error.message || error}`,
          },
        });
      }

      return res.status(StatusCodes.OK).send({
        result: {
          userOpHash,
        },
      });
    },
  });
}
