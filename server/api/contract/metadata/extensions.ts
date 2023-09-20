import { Static, Type } from "@sinclair/typebox";
import { getAllDetectedExtensionNames } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utilities/chain";
import { getContract } from "../../../utils/cache/getContract";

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
    url: "/contract/:network/:contract_address/metadata/extensions",
    schema: {
      description: "Get all extensions of a contract",
      tags: ["Contract-Metadata"],
      operationId: "getExtensions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;

      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      let returnData = getAllDetectedExtensionNames(contract.abi);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
