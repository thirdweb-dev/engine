import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { partialRouteSchema } from "../../../helpers/sharedApiSchemas";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import { getChainIdFromChain } from "../../../utilities/chain";
import { bigNumberReplacer } from "../../../utilities/convertor";
import { getContract } from "../../../utils/cache/getContract";

export async function readContract(fastify: FastifyInstance) {
  fastify.route<readSchema>({
    method: "GET",
    url: "/contract/:chain/:contract_address/read",
    schema: {
      description: "Read From Contract",
      tags: ["Contract"],
      operationId: "read",
      ...partialRouteSchema,
      querystring: readRequestQuerySchema,
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { function_name, args } = request.query;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
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
