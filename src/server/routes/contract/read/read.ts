import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../shared/utils/cache/get-contract.js";
import { prettifyError } from "../../../../shared/utils/error.js";
import { createCustomError } from "../../../middleware/error.js";
import {
  readRequestQuerySchema,
  type readSchema,
} from "../../../schemas/contract/index.js";
import {
  partialRouteSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas.js";
import { getChainIdFromChain } from "../../../utils/chain.js";
import { bigNumberReplacer } from "../../../utils/convertor.js";

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

      let parsedArgs: unknown[] | undefined;

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

      let returnData: unknown;
      try {
        returnData = await contract.call(functionName, parsedArgs ?? []);
      } catch (e) {
        throw createCustomError(
          prettifyError(e),
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      returnData = bigNumberReplacer(returnData);

      reply.status(StatusCodes.OK).send({
        // biome-ignore lint/suspicious/noExplicitAny: data from chain
        result: returnData as any,
      });
    },
  });
}
