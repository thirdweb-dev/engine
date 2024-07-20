import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress } from "thirdweb";
import { getContractSubscription } from "../../../../db/contractSubscriptions/getContractSubscription";
import { enqueueProcessEventLogs } from "../../../../worker/queues/processEventLogsQueue";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const MAX_BACKFILL_BLOCKS = 1000;

const responseSchema = Type.Object({
  result: Type.Object({
    message: Type.Literal(`Blocks were added for backfilling!`),
    status: Type.Literal("success"),
  }),
});

responseSchema.example = {
  result: [
    {
      chain: "ethereum",
      contractAddress: "0x....",
      webhook: {
        url: "https://...",
      },
    },
  ],
};

const paramsSchema = Type.Object({
  subscriptionId: Type.String({
    description: "Subscription ID",
  }),
});

const bodySchema = Type.Object({
  fromBlock: Type.Integer({
    description: "Start block number",
  }),
  toBlock: Type.Integer({
    description: "End block number",
  }),
});

export async function backfillContractSubscriptions(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Params: Static<typeof paramsSchema>;
    Body: Static<typeof bodySchema>;
  }>({
    method: "POST",
    url: "/contract-subscriptions/:subscriptionId/backfill",
    schema: {
      summary: "Backfill a contract subscription",
      description:
        "Backfill contract subscription data to trigger any missed webhooks or backfill new events added after subscription is updated",
      tags: ["Contract-Subscriptions"],
      operationId: "backfillContractSubscription",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      params: Type.Object({
        subscriptionId: Type.String({
          description: "Subscription ID",
        }),
      }),
    },
    handler: async (request, reply) => {
      const { subscriptionId } = request.params;

      const contractSubscription = await getContractSubscription({
        id: subscriptionId,
      });

      if (!contractSubscription) {
        const error = createCustomError(
          "Contract Subscription not found",
          StatusCodes.NOT_FOUND,
          "ContractSubscriptionNotFound",
        );

        throw error;
      }

      const { fromBlock, toBlock } = request.body;

      if (fromBlock > toBlock) {
        const error = createCustomError(
          "Start block must be less than end block",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );

        throw error;
      }

      if (toBlock - fromBlock > MAX_BACKFILL_BLOCKS) {
        const error = createCustomError(
          `Backfill block range must be less than ${MAX_BACKFILL_BLOCKS}`,
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );

        throw error;
      }

      await enqueueProcessEventLogs({
        chainId: contractSubscription.chainId,
        filters: [
          {
            address: getAddress(contractSubscription.contractAddress),
            events: contractSubscription.filterEvents,
          },
        ],
        fromBlock,
        toBlock,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          message: `Blocks were added for backfilling!`,
          status: "success",
        },
      });
    },
  });
}
