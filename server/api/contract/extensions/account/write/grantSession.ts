import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers";
import { SessionSchema } from "../../../../../schemas/account";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

const BodySchema = SessionSchema;

BodySchema.examples = [
  {
    signerAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
    startDate: "2021-01-01T00:00:00.000Z",
    expirationDate: "2022-01-01T00:10:00.000Z",
    nativeTokenLimitPerTransaction: "1000000000000000000",
    approvedCallTargets: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export const grantSession = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/account/sessions/create",
    schema: {
      summary: "Create session key",
      description: "Create a session key for a smart account.",
      tags: ["Account"],
      operationId: "account:grant-session",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { signerAddress, ...permissions } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;
      const accountAddress = req.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.account.grantPermissions.prepare(
        signerAddress,
        {
          startDate: new Date(permissions.startDate),
          expirationDate: new Date(permissions.expirationDate),
          approvedCallTargets: permissions.approvedCallTargets,
          nativeTokenLimitPerTransaction:
            permissions.nativeTokenLimitPerTransaction,
        },
      );
      const queueId = await queueTx({ tx, chainId, extension: "account" });

      rep.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
};
