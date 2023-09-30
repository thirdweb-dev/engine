import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

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
      operationId: "account:get-all-admins",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const accountAddresses = await contract.account.getAllAdmins();

      rep.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
