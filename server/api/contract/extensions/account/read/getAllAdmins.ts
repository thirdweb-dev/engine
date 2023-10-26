import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../utils/chain";

const ReplySchema = Type.Object({
  result: Type.Array(Type.String(), {
    description: "The address of the admins on this account",
  }),
});

export const getAllAdmins = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account/admins/get-all",
    schema: {
      summary: "Get all admins",
      description: "Get all admins for a smart account.",
      tags: ["Account"],
      operationId: "getAllAdmins",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const accountAddresses = await contract.account.getAllAdmins();

      reply.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
