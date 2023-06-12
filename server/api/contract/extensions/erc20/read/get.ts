import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
import { Static, Type } from "@sinclair/typebox";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = erc20ContractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Object({
    name: Type.String(),
    symbol: Type.String(),
    decimals: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    name: "ERC20",
    symbol: "",
    decimals: "18",
  },
};

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
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const returnData: any = await contract.erc20.get();
      reply.status(StatusCodes.OK).send({
        result: {
          symbol: returnData.symbol,
          name: returnData.name,
          decimals: returnData.decimals,
        },
      });
    },
  });
}
