import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSdk } from "../../../../utils/cache/getSdk";
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
      const sdk = await getSdk({ chainId });

      const txRes = await sdk.getProvider().sendTransaction(signedTransaction);

      res.status(200).send({
        result: {
          transactionHash: txRes.hash,
        },
      });
    },
  });
}
