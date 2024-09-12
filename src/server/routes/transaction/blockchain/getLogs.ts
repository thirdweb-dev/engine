import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  eth_getTransactionReceipt,
  getContract,
  getRpcClient,
  parseEventLogs,
  prepareEvent,
} from "thirdweb";
import { resolveContractAbi } from "thirdweb/contract";
import { getChain } from "../../../../utils/chain";
import { thirdwebClient } from "../../../../utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

declare global {
  interface BigInt {
    toJSON: () => string;
  }
}
BigInt.prototype.toJSON = function () {
  return `${this}n`;
};

// INPUT
const requestSchema = Type.Object({
  txHash: Type.String({
    description: "Transaction hash",
    examples: [
      "0xd9bcba8f5bc4ce5bf4d631b2a0144329c1df3b56ddb9fc64637ed3a4219dd087",
    ],
    pattern: "^0x([A-Fa-f0-9]{64})$",
  }),
  chain: Type.String({
    examples: ["80002"],
    description: "Chain ID or name",
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      eventName: Type.String(),
      args: Type.Unknown({
        description:
          "Event arguments. These are mostly key-value pairs, with values being numbers or strings. BigInts are represented as strings suffixed with 'n', eg: '1000000000000000000n'",
        examples: [
          {
            from: "0xdeadbeeefdeadbeeefdeadbeeefdeadbeeefdead",
            to: "0xdeadbeeefdeadbeeefdeadbeeefdeadbeeefdead",
            value: "1000000000000000000n",
          },
        ],
      }),
      address: Type.String(),
      topics: Type.Array(Type.String()),
      data: Type.String(),
      // this is a lie, we say bigint but we actually return a string
      blockNumber: Type.BigInt({
        description:
          "Block number where the event was emitted, this is a BigInt encoded as a string suffixed with 'n'",
        examples: ["79326434n"],
      }),
      transactionHash: Type.String(),
      transactionIndex: Type.Number(),
      blockHash: Type.String(),
      logIndex: Type.Number(),
      removed: Type.Boolean(),
    }),
  ),
});

responseBodySchema.example = {
  result: [
    {
      eventName: "Transfer",
      args: {
        from: "0x0000000000000000000000000000000000000000",
        to: "0x71B6267b5b2b0B64EE058C3D27D58e4E14e7327f",
        value: "1000000000000000000n",
      },
      address: "0x71b6267b5b2b0b64ee058c3d27d58e4e14e7327f",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x00000000000000000000000071b6267b5b2b0b64ee058c3d27d58e4e14e7327f",
      ],
      data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
      blockNumber: "79326434n",
      transactionHash:
        "0x568eb49d738f7c02ebb24aa329efcf10883d951b1e13aa000b0e073d54a0246e",
      transactionIndex: 1,
      blockHash:
        "0xaffbcf3232a76152206de5f6999c549404efc76060a34f8826b90c95993464c3",
      logIndex: 0,
      removed: false,
    },
  ],
};

export async function getTxLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/:chain/logs/:txHash",
    schema: {
      summary: "Get transaction logs from transaction hash",
      description: "Get parsed transaction logs from a transaction hash.",
      tags: ["Transaction"],
      operationId: "txParseLogs",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: requestChain, txHash } = request.params;
      const chainId = await getChainIdFromChain(requestChain);
      const chain = await getChain(chainId);
      const rpcRequest = getRpcClient({ client: thirdwebClient, chain });

      const transactionReceipt = await eth_getTransactionReceipt(rpcRequest, {
        hash: txHash as `0x${string}`,
      });

      if (!transactionReceipt) {
        throw createCustomError(
          "Transaction not found",
          StatusCodes.NOT_FOUND,
          "TRANSACTION_NOT_FOUND",
        );
      }

      if (!transactionReceipt.to) {
        throw createCustomError(
          "Not a contract transaction",
          StatusCodes.NOT_FOUND,
          "CONTRACT_NOT_FOUND",
        );
      }

      const contract = getContract({
        address: transactionReceipt.to,
        chain,
        client: thirdwebClient,
      });

      const abi: AbiEventSignature[] = await resolveContractAbi(contract);
      const eventSignatures = abi.filter((item) => item.type === "event");

      if (eventSignatures.length === 0) {
        throw createCustomError(
          "No events found in contract, or could not resolve contract ABI",
          StatusCodes.NOT_FOUND,
          "NO_EVENTS_FOUND",
        );
      }

      const preparedEvents = eventSignatures.map((event) =>
        prepareEvent({
          signature: event,
        }),
      );

      const parsedLogs = parseEventLogs({
        events: preparedEvents,
        logs: transactionReceipt.logs,
      });

      reply.status(StatusCodes.OK).send({ result: parsedLogs });
    },
  });
}

type AbiEventSignature = {
  type: "event";
  name: string;
  inputs: {
    name: string;
    type: string;
    indexed: boolean;
  }[];
};
