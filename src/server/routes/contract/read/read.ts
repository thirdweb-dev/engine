import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../utils/cache/getContract";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import { partialRouteSchema } from "../../../schemas/sharedApiSchemas";
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
      response: {
        200: {
          description: "Successful response",
          type: "object",
          properties: {
            result: {
              type: "object",
              description: "The result of the contract function call",
            },
          },
        },
      }
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { functionName, args } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const parsedArgs = args?.split(",").map((arg) => {
        if (arg === "true") {
          return true;
        } else if (arg === "false") {
          return false;
        } else {
          return arg;
        }
      });

      let returnData = await contract.call(functionName, parsedArgs ?? []);
      returnData = bigNumberReplacer(returnData);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
