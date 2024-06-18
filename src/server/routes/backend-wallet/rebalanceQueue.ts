import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateTransactionsByQueueIds } from "../../../db/transactions/updateTransactionsByQueueIds";
import { getAllWallets } from "../../../db/wallets/getAllWallets";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestSchema = walletParamSchema;

const requestBodySchema = Type.Object({
  limit: Type.Number({
    description: "The number of queued transactions to rebalance.",
    minimum: 1,
    maximum: 10_000,
  }),
  rebalanceAddresses: Type.Array(Type.String(), {
    description: "A list of other backend wallet addresses to balance to.",
    minItems: 1,
    maxItems: 50,
  }),
  toAddress: Type.Optional(
    Type.String({ desciption: "Filter transactions sent to this address." }),
  ),
});

const responseSchema = Type.Object({
  result: Type.Array(
    Type.Object({
      walletAddress: Type.String(),
      transactionCount: Type.Number(),
    }),
  ),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
  },
};

export const rebalanceQueuedTransactions = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/:walletAddress/rebalance-queue",
    schema: {
      summary: "Rebalance queue",
      description: "Rebalance queued transactions to other backend wallets.",
      tags: ["Backend Wallet"],
      operationId: "rebalanceQueue",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { chain, walletAddress: _walletAddress } = req.params;
      const {
        limit,
        rebalanceAddresses: _rebalanceAddresses,
        toAddress: _toAddress,
      } = req.body;

      // Standardize input.
      const chainId = await getChainIdFromChain(chain);
      const fromAddress = _walletAddress.toLowerCase();
      const toAddress = _toAddress?.toLowerCase();
      const rebalanceAddresses = _rebalanceAddresses.map((a) =>
        a.toLowerCase(),
      );

      // Get all wallet addresses (limit: 1,000 backend wallets).
      const backendWallets = await getAllWallets({ page: 0, limit: 1000 });
      const backendWalletAddresses = new Set(
        backendWallets.map((w) => w.address.toLowerCase()),
      );

      // Get valid rebalance addresses which include the `fromAddress`.
      const validRebalanceAddressesSet = new Set([fromAddress]);
      for (const rebalanceAddress of rebalanceAddresses) {
        if (!backendWalletAddresses.has(rebalanceAddress)) {
          throw createCustomError(
            `Invalid rebalance wallet address: ${rebalanceAddress}. Provide a valid backend wallet address that is not the current backend wallet address.`,
            StatusCodes.BAD_REQUEST,
            "INVALID_BACKEND_WALLET",
          );
        }
        validRebalanceAddressesSet.add(rebalanceAddress);
      }
      const validRebalanceAddresses = Array.from(validRebalanceAddressesSet);

      // Get all queued transactions from this wallet.
      const queuedTransactions = (await getQueuedTransactions({
        chainId,
        fromAddress,
        toAddress,
        limit,
      })) as { id: string }[];

      // Get the queueIds to rebalance to each wallet.
      const queueIdsToRebalance: Record<string, string[]> = {};
      queuedTransactions.forEach((transaction, idx) => {
        const rebalanceAddress =
          validRebalanceAddresses[idx % rebalanceAddresses.length];

        // Push queueId into the array for this backend address.
        if (rebalanceAddress in queueIdsToRebalance) {
          queueIdsToRebalance[rebalanceAddress] = [];
        }
        queueIdsToRebalance[rebalanceAddress].push(transaction.id);
      });

      // Update the "fromAddress" for these queueIds and return the rebalanced transaction counts.
      const result: { walletAddress: string; transactionCount: number }[] = [];
      for (const [walletAddress, queueIds] of Object.entries(
        queueIdsToRebalance,
      )) {
        const transactionCount = await updateTransactionsByQueueIds({
          data: { fromAddress: walletAddress },
          queueIds,
        });
        result.push({ walletAddress, transactionCount });
      }

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
};
