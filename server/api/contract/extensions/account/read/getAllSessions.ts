import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { SessionSchema } from "../../../../../schemas/account";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../utils/chain";

const ReplySchema = Type.Object({
  result: Type.Array(SessionSchema),
});

export const getAllSessions = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account/sessions/get-all",
    schema: {
      summary: "Get all session keys",
      description: "Get all session keys for a smart account.",
      tags: ["Account"],
      operationId: "getAllSessions",
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
      const sessions = await contract.account.getAllSigners();

      reply.status(StatusCodes.OK).send({
        result: sessions.map((session) => ({
          signerAddress: session.signer,
          startDate: session.permissions.startDate.toISOString(),
          expirationDate: session.permissions.expirationDate.toISOString(),
          nativeTokenLimitPerTransaction:
            session.permissions.nativeTokenLimitPerTransaction.toString(),
          approvedCallTargets: session.permissions.approvedCallTargets,
        })),
      });
    },
  });
};
