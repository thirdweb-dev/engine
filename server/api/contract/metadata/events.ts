import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { abiEventSchema } from "../../../schemas/contract";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(abiEventSchema),
});

responseSchema.example = {
  result: [
    {
      name: "Approval",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "approved",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      outputs: [],
    },
    {
      name: "ApprovalForAll",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "operator",
        },
        {
          type: "bool",
          name: "approved",
        },
      ],
      outputs: [],
    },
    {
      name: "ClaimConditionsUpdated",
      inputs: [
        {
          type: "tuple[]",
          name: "claimConditions",
          components: [
            {
              type: "uint256",
              name: "startTimestamp",
              internalType: "uint256",
            },
            {
              type: "uint256",
              name: "maxClaimableSupply",
              internalType: "uint256",
            },
            {
              type: "uint256",
              name: "supplyClaimed",
              internalType: "uint256",
            },
            {
              type: "uint256",
              name: "quantityLimitPerWallet",
              internalType: "uint256",
            },
            {
              type: "bytes32",
              name: "merkleRoot",
              internalType: "bytes32",
            },
            {
              type: "uint256",
              name: "pricePerToken",
              internalType: "uint256",
            },
            {
              type: "address",
              name: "currency",
              internalType: "address",
            },
            {
              type: "string",
              name: "metadata",
              internalType: "string",
            },
          ],
        },
        {
          type: "bool",
          name: "resetEligibility",
        },
      ],
      outputs: [],
      comment: "Emitted when the contract's claim conditions are updated.",
    },
  ],
};

export async function extractEvents(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/metadata/events",
    schema: {
      description:
        "Get details all events implemented by the contract, and the data types of their parameters",
      tags: ["Contract-Metadata"],
      operationId: "extractEvents",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;

      const contract = await getContractInstance(network, contract_address);

      let returnData = await contract.publishedMetadata.extractEvents();

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
