import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { getSDK } from "../../../../../helpers/index";
import { partialRouteSchema } from "../../../../../helpers/sharedApiSchemas";
import {
  setAllowanceRequestBodySchema,
  setAllowanceRouteSchema,
} from "../../../../../schemas/erc20/standard/setAllownce";

export async function erc20SetAlowance(fastify: FastifyInstance) {
  fastify.route<setAllowanceRouteSchema>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/setAllowance",
    schema: {
      description:
        "Grant allowance to another wallet address to spend the connected (Admin) wallet's funds (of this token).",
      tags: ["ERC20"],
      operationId: "setAllowance",
      ...partialRouteSchema,
      body: setAllowanceRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { spender_address, amount } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const returnData = await contract.erc20.setAllowance(
        spender_address,
        amount,
      );
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData,
        },
      });
    },
  });
}
