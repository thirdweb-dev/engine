import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import {
  contractEventSchema,
  eventsQuerystringSchema,
} from "../../../schemas/contract";
import { getChainIdFromChain } from "../../../utilities/chain";
import { getContract } from "../../../utils/cache/getContract";

const requestSchema = contractParamSchema;

const requestBodyParams = Type.Object(
  {
    event_name: Type.String({ examples: ["Transfer"] }),
    ...eventsQuerystringSchema.properties,
    filters: Type.Optional(Type.Object({})),
  },
  {
    description:
      "Specify the from and to block numbers to get events for, defaults to all blocks",
  },
);

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(contractEventSchema),
});

responseSchema.example = {
  result: {
    eventName: "ApprovalForAll",
    data: {
      owner: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
      operator: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      approved: true,
    },
    transaction: {
      blockNumber: 36010321,
      blockHash:
        "0x2c388fe429215b6c2934746410a52a3416b7a1725cea6885eaf220f05f50a6ec",
      transactionIndex: 19,
      removed: false,
      address: "0xc8be6265C06aC376876b4F62670adB3c4d72EABA",
      data: "0x0000000000000000000000000000000000000000000000000000000000000001",
      topics: [
        "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31",
        "0x000000000000000000000000e79ee09bd47f4f5381dbbacacff2040f2fbc5803",
        "0x0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e18373",
      ],
      transactionHash:
        "0xa4143253005103e5203554f4e17e90a517591cd2d5e3b3dceabfbfb8fbdca5f9",
      logIndex: 55,
      event: "ApprovalForAll",
      eventSignature: "ApprovalForAll(address,address,bool)",
    },
  },
};

export async function getEvents(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodyParams>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/events/get",
    schema: {
      summary: "Get events",
      description:
        "Get a list of specific blockchain events emitted from this contract.",
      tags: ["Contract-Events"],
      operationId: "getEvents",
      params: requestSchema,
      body: requestBodyParams,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { from_block, to_block, order, event_name, filters } = request.body;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      let returnData = await contract.events.getEvents(event_name, {
        fromBlock: from_block,
        toBlock: to_block,
        order,
        filters,
      });

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
