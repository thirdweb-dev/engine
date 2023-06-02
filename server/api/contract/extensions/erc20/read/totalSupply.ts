import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core/index";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { erc20MetadataSchema } from "../../../../../schemas/erc20";

// INPUT
const requestSchema = erc20ContractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: erc20MetadataSchema,
});

responseSchema.examples = [
  {
    result: {
      name: "Mumba20",
      symbol: "",
      decimals: "18",
      value: "10000000000000000000",
      displayValue: "10.0",
    },
  },
];

// LOGIC
export async function erc20TotalSupply(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/totalSupply",
    schema: {
      description: "Get the number of tokens in circulation for the contract.",
      tags: ["ERC20"],
      operationId: "erc20_totalSupply",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const returnData = await contract.erc20.totalSupply();
      reply.status(StatusCodes.OK).send({
        result: {
          value: returnData.value.toString(),
          symbol: returnData.symbol,
          name: returnData.name,
          decimals: returnData.decimals.toString(),
          displayValue: returnData.displayValue,
        },
      });
    },
  });
}
