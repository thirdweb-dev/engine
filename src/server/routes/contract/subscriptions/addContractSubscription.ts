import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { upsertChainIndexer } from "../../../../db/chainIndexers/upsertChainIndexer";
import { createContractSubscription } from "../../../../db/contractSubscriptions/createContractSubscription";
import {
  getContractSubscriptionsUniqueChainIds,
  isContractSubscribed,
} from "../../../../db/contractSubscriptions/getContractSubscriptions";
import { getSdk } from "../../../../utils/cache/getSdk";
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
    url: "/contract/:chain/:contractAddress/subscribe",
    schema: {
      summary: "Subscribe to contract events and transactions",
      description: "Subscribe to contract events and transactions",
      tags: ["Contract-Subscriptions"],
      operationId: "addContractSubscription",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const standardizedContractAddress = contractAddress.toLowerCase();
      const chainId = await getChainIdFromChain(chain);

      const isAlreadySubscribed = await isContractSubscribed({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      if (!isAlreadySubscribed) {
        const subscribedChainIds =
          await getContractSubscriptionsUniqueChainIds();

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
        await createContractSubscription({
          chainId,
          contractAddress: standardizedContractAddress,
        });
      }

      reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress: standardizedContractAddress,
          status: "success",
        },
      });
    },
  });
}
