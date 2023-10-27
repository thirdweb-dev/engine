import { Static, Type } from "@sinclair/typebox";
import { getAllDetectedExtensionNames } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getContract } from "../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../utils/chain";

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
    url: "/contract/:chain/:contractAddress/metadata/extensions",
    schema: {
      summary: "Get extensions",
      description: "Get all detected extensions for a contract.",
      tags: ["Contract-Metadata"],
      operationId: "getExtensions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      let returnData = getAllDetectedExtensionNames(contract.abi);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
