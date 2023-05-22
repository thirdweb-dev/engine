import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../../helpers/sdk";
import {
  partialRouteSchema,
  contractSchemaTypes,
} from "../../../../../sharedApiSchemas";
import { logger } from "../../../../../utilities/logger";
import { balanceReplyBodySchema } from "../../../../../schemas/erc20/standard/balance";

export async function erc20Balance(fastify: FastifyInstance) {
  fastify.route<contractSchemaTypes>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/balance",
    schema: {
      description:
        "View the balance (i.e. number of tokens) of the connected (Admin) wallet",
      tags: ["ERC20"],
      operationId: "balance",
      ...partialRouteSchema,
      response: {
        [StatusCodes.OK]: balanceReplyBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      logger.info("Inside ERC20 Balance Function");
      logger.silly(`Chain : ${chain_name_or_id}`);
      logger.silly(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData = await contract.erc20.totalSupply();

      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData,
        },
      });
    },
  });
}
