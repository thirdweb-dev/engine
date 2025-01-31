import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractEventSchema,
  eventsQuerystringSchema,
} from "../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";
import { thirdwebClient } from "../../../../shared/utils/sdk";
import { getChain } from "../../../../shared/utils/chain";
import { getChainIdFromChain } from "../../../utils/chain";
import { getContract, getContractEvents } from "thirdweb";
import { maybeBigInt } from "../../../../shared/utils/primitive-types";
import {
  ContractEventV5,
  toContractEventV4Schema,
} from "../../../schemas/event";
import { createCustomError } from "../../../middleware/error";
import { prettifyError } from "../../../../shared/utils/error";

const requestSchema = contractParamSchema;

const querySringSchema = Type.Optional(eventsQuerystringSchema);

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(contractEventSchema),
});

responseSchema.example = {
  result: [
    {
      eventName: "Transfer",
      data: {
        from: "0x0000000000000000000000000000000000000000",
        to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        tokenId: {
          type: "BigNumber",
          hex: "0x01",
        },
      },
      transaction: {
        blockNumber: 35439713,
        blockHash:
          "0x0413d9c88a664f46b54cd47d66073f47114fa3b0183ca5f713d4567d345de4a1",
        transactionIndex: 6,
        removed: false,
        address: "0xc8be6265C06aC376876b4F62670adB3c4d72EABA",
        data: "0x",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000001946267d81fb8adeeea28e6b98bcd446c8248473",
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        ],
        transactionHash:
          "0x6ee82341f1e09511e9502eea45e0ca9e52dd0295a515401834d0d05a5e802da5",
        logIndex: 13,
        event: "Transfer",
        eventSignature: "Transfer(address,address,uint256)",
      },
    },
  ],
};

export async function getAllEvents(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querySringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/events/get-all",
    schema: {
      summary: "Get all events",
      description: "Get a list of all blockchain events for this contract.",
      tags: ["Contract-Events"],
      operationId: "getAllEvents",
      params: requestSchema,
      querystring: querySringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock, order } = request.query;

      const chainId = await getChainIdFromChain(chain);

      const contract = getContract({
        client: thirdwebClient,
        address: contractAddress,
        chain: await getChain(chainId),
      });

      let eventsV5: ContractEventV5[];
      try {
        eventsV5 = await getContractEvents({
          contract: contract,
          fromBlock:
            typeof fromBlock === "number" ? BigInt(fromBlock) : fromBlock,
          toBlock: typeof toBlock === "number" ? BigInt(toBlock) : toBlock,
        });
      } catch (e) {
        throw createCustomError(
          `Failed to get events: ${prettifyError(e)}`,
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: eventsV5.map(toContractEventV4Schema).sort((a, b) => {
          return order === "desc"
            ? b.transaction.blockNumber - a.transaction.blockNumber
            : a.transaction.blockNumber - b.transaction.blockNumber;
        }),
      });
    },
  });
}
