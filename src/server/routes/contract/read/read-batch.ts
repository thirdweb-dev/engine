import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import SuperJSON from "superjson";
import {
  getContract,
  prepareContractCall,
  readContract,
  resolveMethod,
} from "thirdweb";
import { prepareMethod } from "thirdweb/contract";
import { resolvePromisedValue, type AbiFunction } from "thirdweb/utils";
import { decodeAbiParameters } from "viem/utils";
import { getChain } from "../../../../utils/chain";
import { prettifyError } from "../../../../utils/error";
import { thirdwebClient } from "../../../../utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { bigNumberReplacer } from "../../../utils/convertor";

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_AGGREGATE_ABI =
  "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) external payable returns ((bool success, bytes returnData)[])";

const readCallRequestItemSchema = Type.Object({
  contractAddress: Type.String(),
  functionName: Type.String(),
  functionAbi: Type.Optional(Type.String()),
  args: Type.Optional(Type.Array(Type.Any())),
});

const readMulticallRequestSchema = Type.Object({
  calls: Type.Array(readCallRequestItemSchema),
  multicallAddress: Type.Optional(Type.String()),
});

const responseSchema = Type.Object({
  results: Type.Array(
    Type.Object({
      success: Type.Boolean(),
      result: Type.Any(),
    }),
  ),
});

const paramsSchema = Type.Object({
  chain: Type.String(),
});

type RouteGeneric = {
  Params: { chain: string };
  Body: Static<typeof readMulticallRequestSchema>;
  Reply: Static<typeof responseSchema>;
};

export async function readMulticall(fastify: FastifyInstance) {
  fastify.route<RouteGeneric>({
    method: "POST",
    url: "/contract/:chain/read-batch",
    schema: {
      summary: "Batch read from multiple contracts",
      description:
        "Execute multiple contract read operations in a single call using Multicall3",
      tags: ["Contract"],
      operationId: "readMulticall",
      params: paramsSchema,
      body: readMulticallRequestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: chainSlug } = request.params;
      const { calls, multicallAddress = MULTICALL3_ADDRESS } = request.body;

      const chainId = await getChainIdFromChain(chainSlug);
      const chain = await getChain(chainId);

      try {
        // Encode each read call
        const encodedCalls = await Promise.all(
          calls.map(async (call) => {
            const contract = await getContract({
              client: thirdwebClient,
              chain,
              address: call.contractAddress,
            });

            const method =
              (call.functionAbi as unknown as AbiFunction) ??
              (await resolveMethod(call.functionName)(contract));

            const transaction = prepareContractCall({
              contract,
              method,
              params: call.args || [],
              // stubbing gas values so that the call can be encoded
              maxFeePerGas: 30n,
              maxPriorityFeePerGas: 1n,
              value: 0n,
            });

            const calldata = await resolvePromisedValue(transaction.data);
            if (!calldata) {
              throw new Error("Failed to encode call data");
            }

            return {
              target: call.contractAddress,
              abiFunction: method,
              allowFailure: true,
              callData: calldata,
            };
          }),
        );

        // Get Multicall3 contract
        const multicall = await getContract({
          chain,
          address: multicallAddress,
          client: thirdwebClient,
        });

        // Execute batch read
        const results = await readContract({
          contract: multicall,
          method: MULTICALL3_AGGREGATE_ABI,
          params: [encodedCalls],
        });

        // Process results
        const processedResults = results.map((result: unknown, i) => {
          const { success, returnData } = result as {
            success: boolean;
            returnData: unknown;
          };

          const [_sig, _inputs, outputs] = prepareMethod(
            encodedCalls[i].abiFunction,
          );

          const decoded = decodeAbiParameters(
            outputs,
            returnData as `0x${string}`,
          );

          return {
            success,
            result: success ? bigNumberReplacer(decoded) : null,
          };
        });

        reply.status(StatusCodes.OK).send({
          results: SuperJSON.serialize(processedResults).json as Static<
            typeof responseSchema
          >["results"],
        });
      } catch (e) {
        throw createCustomError(
          prettifyError(e),
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }
    },
  });
}
