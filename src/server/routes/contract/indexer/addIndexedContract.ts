import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { upsertChainIndexer } from "../../../../db/chainIndexers/upsertChainIndexer";
import { upsertIndexedContract } from "../../../../db/indexedContracts/createIndexedContract";
import { getIndexedContractsUniqueChainIds } from "../../../../db/indexedContracts/getIndexedContract";
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

export async function addIndexedContractRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/indexer/create",
    schema: {
      summary: "Start contract indexing",
      description: "Start indexing a contract",
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
      const indexedChainIds = await getIndexedContractsUniqueChainIds();

      console.log("Got indexed chains");
      // if not currently indexed, upsert the latest block number
      if (!indexedChainIds.includes(chainId)) {
        const sdk = await getSdk({ chainId });
        const provider = sdk.getProvider();
        const currentBlockNumber = await provider.getBlockNumber();
        await upsertChainIndexer({ chainId, currentBlockNumber });
      }

      // upsert indexed contract, this will be picked up
      await upsertIndexedContract({ chainId, contractAddress });

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
