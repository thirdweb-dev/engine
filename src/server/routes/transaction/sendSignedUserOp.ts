import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { HttpRpcClient } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/http-rpc-client";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deriveClientId } from "../../../utils/api-keys";
import { env } from "../../../utils/env";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../utils/chain";

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

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const BodySchema = Type.Object({
  signedUserOp: Type.Union([UserOpString, UserOp]),
});

const ReplySchema = Type.Union([
  Type.Object({
    result: Type.Object({
      userOpHash: Type.String(),
    }),
  }),
  Type.Object({
    error: Type.Object({
      message: Type.String(),
    }),
  }),
]);

export async function sendSignedUserOp(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/transaction/:chain/send-signed-user-op",
    schema: {
      summary: "Send a signed user operation",
      description: "Send a signed user operation",
      tags: ["Transaction"],
      operationId: "sendSignedUserOp",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
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
        } catch (err: any) {
          return res.status(400).send({
            error: {
              message: `Invalid signed user operation. - ${err.message || err}`,
            },
          });
        }
      } else {
        userOp = signedUserOp;
      }

      const client = new HttpRpcClient(
        `https://${chainId}.bundler.thirdweb.com`,
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        chainId,
        deriveClientId(env.THIRDWEB_API_SECRET_KEY),
        env.THIRDWEB_API_SECRET_KEY,
      );

      const userOpHash = await client.sendUserOpToBundler(userOp);
      return res.status(200).send({
        result: {
          userOpHash,
        },
      });
    },
  });
}
