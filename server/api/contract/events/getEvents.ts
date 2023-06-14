import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractEventSchema,
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

const requestSchema = contractParamSchema;

const querySringSchema = Type.Object(
  {
    event_name: Type.String({ examples: ["Transfer"] }),
    from_block: Type.Optional(
      Type.Union([Type.Number(), Type.String()], { default: "0" }),
    ),
    to_block: Type.Optional(
      Type.Union([Type.Number({ default: 0 }), Type.String({ default: "0" })], {
        default: "latest",
      }),
    ),
    order: Type.Optional(
      Type.Union([Type.Literal("asc"), Type.Literal("desc")], {
        default: "desc",
      }),
    ),
    filters: Type.Optional(
      Type.Object({
        from: Type.Optional(Type.String()),
        to: Type.Optional(Type.String()),
      }),
    ),
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
    Querystring: Static<typeof querySringSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/events/getEvents",
    schema: {
      description:
        "Get a list of the events of a specific type emitted from this contract during the specified time period",
      tags: ["Contract-Events"],
      operationId: "getEvents",
      params: requestSchema,
      querystring: querySringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { from_block, to_block, order, event_name, filters } =
        request.query;

      const contract = await getContractInstance(network, contract_address);

      let returnData = await contract.events.getEvents(event_name, {
        fromBlock: from_block,
        toBlock: to_block,
        order,
        filters,
      });

      console.log(JSON.stringify(returnData));
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
