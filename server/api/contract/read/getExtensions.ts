import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { getAllDetectedExtensionNames } from "@thirdweb-dev/sdk";
import { Static, Type } from "@sinclair/typebox";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(Type.String(), {
    description: "Array of detected extension names",
  }),
});

responseSchema.example = {
  result: [
    "ERC721",
    "ERC721Burnable",
    "ERC721Supply",
    "ERC721LazyMintable",
    "ERC721Revealable",
    "ERC721ClaimPhasesV2",
    "Royalty",
    "PlatformFee",
    "PrimarySale",
    "Permissions",
    "PermissionsEnumerable",
    "ContractMetadata",
    "Ownable",
    "Gasless",
  ],
};

export async function getContractExtensions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/getExtensions",
    schema: {
      description: "Get all extensions of a contract",
      tags: ["Contract"],
      operationId: "getExtensions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;

      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );

      let returnData = getAllDetectedExtensionNames(contract.abi);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
