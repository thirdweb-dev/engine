import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { AbiParameters } from "ox";
import { readContract as readContractV5, resolveMethod } from "thirdweb";
import { parseAbiParams, stringify } from "thirdweb/utils";
import type { AbiFunction } from "thirdweb/utils";
import { getContractV5 } from "../../../../shared/utils/cache/get-contractv5";
import { prettifyError } from "../../../../shared/utils/error";
import { createCustomError } from "../../../middleware/error";
import {
  readRequestQuerySchema,
  type readSchema,
} from "../../../schemas/contract";
import {
  partialRouteSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";
import { sanitizeFunctionName } from "../../../utils/abi";
import { sanitizeAbi } from "../../../utils/abi";
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
      const { functionName, args, abi } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
        abi: sanitizeAbi(abi),
      });

      let parsedArgs: unknown[] | undefined;

      try {
        const jsonStringArgs = `[${args}]`;
        parsedArgs = JSON.parse(jsonStringArgs);
      } catch {
        // fallback to string split
      }

      parsedArgs ??= args?.split(",");

      // 3 possible ways to get function from abi:
      // 1. functionName passed as solidity signature
      // 2. functionName passed as function name + passed in ABI
      // 3. functionName passed as function name + inferred ABI (fetched at encode time)
      // this is all handled inside the `resolveMethod` function
      let method: AbiFunction;
      let params: Array<string | bigint | boolean | object>;
      try {
        const functionNameOrSignature = sanitizeFunctionName(functionName);
        method = await resolveMethod(functionNameOrSignature)(contract);
        params = parseAbiParams(
          method.inputs.map((i: AbiParameters.Parameter) => i.type),
          parsedArgs ?? [],
        );
      } catch (e) {
        throw createCustomError(
          prettifyError(e),
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      let returnData: unknown;
      try {
        returnData = await readContractV5({ contract, method, params });
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
        result: JSON.parse(stringify(returnData)) as any,
      });
    },
  });
}
