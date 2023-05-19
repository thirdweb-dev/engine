import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { getSDK } from "../../../../../helpers/index";
import { partialRouteSchema } from "../../../../../helpers/sharedApiSchemas";
import {
  transferFromRequestBodySchema,
  transferFromRouteSchema,
} from "../../../../../schemas/erc20/standard/transferFrom";

export async function erc20TransferFrom(fastify: FastifyInstance) {
  fastify.route<transferFromRouteSchema>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/transferFrom",
    schema: {
      description:
        "Transfer tokens from the connected wallet to another wallet.",
      tags: ["ERC20"],
      operationId: "transferFrom",
      ...partialRouteSchema,
      body: transferFromRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { from_address, to_address, amount } = request.body;
      request.log.info("Inside ERC20 - Transfer Function");
      request.log.debug(`Chain : ${chain_name_or_id}`);
      request.log.debug(`Contract Address : ${contract_address}`);

      request.log.debug(`To Address : ${to_address}`);
      request.log.debug(`Amount : ${amount}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.transferFrom(
        from_address,
        to_address,
        amount,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          transaction: returnData?.receipt,
        },
      });
    },
  });
}
