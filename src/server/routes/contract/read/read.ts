import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  defineChain,
  readContract as readContractSDK,
  resolveMethod,
} from "thirdweb";
import { getContractUsingNew } from "../../../../utils/cache/getContractNew";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import {
  partialRouteSchema,
  replyBodySchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

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
      const { functionName, args } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const definedChain = defineChain(chainId);
      const contract = await getContractUsingNew({
        chain: definedChain,
        contractAddress,
      });

      const returnData = await readContractSDK({
        contract: contract,
        method: resolveMethod(functionName),
        params: args ? args.split(",") : [],
      });

      let result: Static<typeof replyBodySchema>["result"] = "";
      if (Array.isArray(returnData)) {
        result = returnData.map((item) => {
          if (typeof item === "bigint") {
            return item.toString();
          }
          return item;
        });
      } else {
        result =
          //@ts-expect-error : we are not sure if returnData is a bigint or not
          typeof returnData === "bigint" ? returnData.toString() : returnData;
      }

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
