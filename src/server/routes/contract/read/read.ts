import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../utils/cache/getContract";
import {
  readRequestQuerySchema,
  type readSchema,
} from "../../../schemas/contract";
import {
  partialRouteSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { bigNumberReplacer } from "../../../utils/convertor";

const responseSchema = Type.Object({
  result: Type.Any(),
});

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
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { functionName, args } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      let parsedArgs: unknown[] | undefined = [];

      try {
        const jsonStringArgs = `[${args}]`;
        parsedArgs = JSON.parse(jsonStringArgs);
      } catch {
        // fallback to string split
      }

      parsedArgs ??= args?.split(",").map((arg) => {
        if (arg === "true") {
          return true;
        }
        if (arg === "false") {
          return false;
        }
        return arg;
      });

      let returnData = await contract.call(functionName, parsedArgs ?? []);
      returnData = bigNumberReplacer(returnData);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
