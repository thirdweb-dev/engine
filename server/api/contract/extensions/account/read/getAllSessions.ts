import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers";
import { SessionSchema } from "../../../../../schemas/account";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

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
      description: "Get all sessions on an account",
      tags: ["Account"],
      operationId: "account:get-all-sessions",
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
      const sessions = await contract.account.getAllSigners();

      rep.status(StatusCodes.OK).send({
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
