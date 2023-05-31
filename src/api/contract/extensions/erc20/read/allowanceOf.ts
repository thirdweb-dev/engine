import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { getSDK } from "../../../../../../core/index";
import {
  baseReplyErrorSchema,
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { currencyValueSchema } from "../../../../../schemas/erc20/standard/currencyValue";

// INPUTS
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  owner_wallet: Type.String({
    description: "Address of the wallet who owns the funds",
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"],
  }),
  spender_wallet: Type.String({
    description: "Address of the wallet to check token allowance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(currencyValueSchema),
  error: Type.Optional(baseReplyErrorSchema),
});

// LOGIC
export async function erc20AllowanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/allowanceOf",
    schema: {
      description: "Get the allowance of the specified wallet address funds.",
      tags: ["ERC20"],
      operationId: "erc20_allowanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { spender_wallet, owner_wallet } = request.query;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const returnData: any = await contract.erc20.allowanceOf(
        owner_wallet ? owner_wallet : "",
        spender_wallet ? spender_wallet : "",
      );
      reply.status(StatusCodes.OK).send({
        result: {
          name: returnData.name,
          symbol: returnData.symbol,
          decimals: returnData.decimals.toString(),
          displayValue: returnData.displayValue,
          value: returnData.value.toString(),
        },
      });
    },
  });
}
