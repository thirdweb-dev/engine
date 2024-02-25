import { Static, Type } from "@sinclair/typebox";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { upsertChainIndexer } from "../../../../db/chainIndexers/upsertChainIndexer";
import { upsertIndexedContract } from "../../../../db/indexedContracts/createIndexedContract";
import { getIndexedContractsUniqueChainIds } from "../../../../db/indexedContracts/getIndexedContract";
import { env } from "../../../../utils/env";
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
      const sdk = new ThirdwebSDK(chain, {
        secretKey: env.THIRDWEB_API_SECRET_KEY,
      });
      console.log("Got thirdweb contract");
      // current indexed chains
      console.log("getting indexed chainids");
      const indexedChainIds = await getIndexedContractsUniqueChainIds();

      console.log("Got indexed chains");
      // if not currently indexed, upsert the latest block number
      if (!indexedChainIds.includes(chainId)) {
        //const sdk = await getSdk({ chainId });
        const provider = sdk.getProvider();
        console.log("getting block number");
        const currentBlockNumber = 19307691; // await provider.getBlockNumber();
        console.log(currentBlockNumber);
        console.log("got the block number");
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
