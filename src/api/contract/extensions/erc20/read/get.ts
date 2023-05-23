import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../../helpers/index";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  baseReplyErrorSchema,
} from "src/helpers/sharedApiSchemas";

// INPUT
const requestSchema = contractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(
    Type.Object({
      data: Type.Object({
        name: Type.String(),
        symbol: Type.String(),
        decimals: Type.String(),
      }),
    }),
  ),
  error: Type.Optional(baseReplyErrorSchema),
});

// LOGIC
export async function erc20GetMetadata(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/get",
    schema: {
      description:
        "Get the metadata of the token smart contract, such as the name, symbol, and decimals.",
      tags: ["ERC20"],
      operationId: "erc20_get",
      params: requestSchema,
      response: {
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      request.log.info("Inside ERC20 - Get Function");
      request.log.debug(`Chain : ${chain_name_or_id}`);
      request.log.debug(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.get();

      reply.status(StatusCodes.OK).send({
        result: {
          data: {
            symbol: returnData.symbol,
            name: returnData.name,
            decimals: returnData.decimals,
          },
        },
      });
    },
  });
}
