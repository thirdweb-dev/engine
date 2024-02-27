import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { upsertChainIndexer } from "../../../../db/chainIndexers/upsertChainIndexer";
import { upsertContractSubscription } from "../../../../db/contractSubscriptions/createContractSubscription";
import { getContractSubscriptionsUniqueChainIds } from "../../../../db/contractSubscriptions/getContractSubscriptions";
import { getSdk } from "../../../../utils/cache/getSdk";
import { logger } from "../../../../utils/logger";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    chain: Type.String(),
    contractAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    status: "success",
  },
};

export async function addContractSubscription(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/events/subscribe",
    schema: {
      summary: "Subscribe to contract events",
      description: "Subscribe to contract events",
      tags: ["Contract", "Index"],
      operationId: "write",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const subscribedChainIds = await getContractSubscriptionsUniqueChainIds();

      // if not currently indexed, upsert the latest block number
      if (!subscribedChainIds.includes(chainId)) {
        try {
          const sdk = await getSdk({ chainId });
          const provider = sdk.getProvider();
          const currentBlockNumber = await provider.getBlockNumber();
          await upsertChainIndexer({ chainId, currentBlockNumber });
        } catch (error) {
          // this is fine, must be already locked, so don't need to update current block as this will be recent
        }
      }

      // upsert indexed contract, this will be picked up
      await upsertContractSubscription({ chainId, contractAddress });

      logger({
        service: "server",
        level: "info",
        message: `[Events] Added Subscription: chainId: ${chainId}, contractAddress: ${contractAddress}`,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress,
          status: "success",
        },
      });
    },
  });
}
