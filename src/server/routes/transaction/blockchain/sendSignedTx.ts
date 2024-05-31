import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  defineChain,
  eth_sendRawTransaction,
  getRpcClient,
  isHex,
} from "thirdweb";
import { thirdwebClient } from "../../../../utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const BodySchema = Type.Object({
  signedTransaction: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
  }),
});

export async function sendSignedTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/transaction/:chain/send-signed-transaction",
    schema: {
      summary: "Send a signed transaction",
      description: "Send a signed transaction",
      tags: ["Transaction"],
      operationId: "sendRawTransaction",
      params: ParamsSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { chain } = req.params;
      const { signedTransaction } = req.body;
      const chainId = await getChainIdFromChain(chain);

      if (!isHex(signedTransaction)) {
        throw createCustomError(
          "SignedTransaction is not a valid hex string.",
          StatusCodes.BAD_REQUEST,
          "SendSignedTxError",
        );
      }

      const rpc = getRpcClient({
        chain: defineChain(chainId),
        client: thirdwebClient,
      });
      const transactionHash = await eth_sendRawTransaction(
        rpc,
        signedTransaction,
      );

      res.status(200).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}
