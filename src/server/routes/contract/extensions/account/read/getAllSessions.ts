import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { sessionSchema } from "../../../../../schemas/account";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const responseBodySchema = Type.Object({
  result: Type.Array(sessionSchema),
});

export const getAllSessions = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account/sessions/get-all",
    schema: {
      summary: "Get all session keys",
      description: "Get all session keys for a smart account.",
      tags: ["Account"],
      operationId: "getAllSessions",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
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
