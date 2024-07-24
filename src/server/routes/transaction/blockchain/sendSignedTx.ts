import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { eth_sendRawTransaction, getRpcClient, isHex } from "thirdweb";
import { getChain } from "../../../../utils/chain";
import { thirdwebClient } from "../../../../utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { walletChainParamSchema } from "../../../schemas/wallet";
import { getChainIdFromChain } from "../../../utils/chain";

const requestBodySchema = Type.Object({
  signedTransaction: Type.String(),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
  }),
});

export async function sendSignedTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletChainParamSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/:chain/send-signed-transaction",
    schema: {
      summary: "Send a signed transaction",
      description: "Send a signed transaction",
      tags: ["Transaction"],
      operationId: "sendRawTransaction",
      params: walletChainParamSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
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
        chain: await getChain(chainId),
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
