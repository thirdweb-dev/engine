import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import { partialRouteSchema } from "../../../schemas/sharedApiSchemas";
import { getContract } from "../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../utils/chain";
import { bigNumberReplacer } from "../../../utils/convertor";

export async function readContract(fastify: FastifyInstance) {
  fastify.route<readSchema>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/read",
    schema: {
      summary: "Read from contract",
      description: "Call a read function on a contract.",
      tags: ["Contract"],
      operationId: "read",
      ...partialRouteSchema,
      querystring: readRequestQuerySchema,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { function_name, args } = request.query;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      let returnData = await contract.call(
        function_name,
        args ? args.split(",") : [],
      );
      returnData = bigNumberReplacer(returnData);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
