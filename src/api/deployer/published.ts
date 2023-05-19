import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../helpers/sdk";
import {
  publishedDeployParamSchema,
  standardResponseSchema,
} from "../../sharedApiSchemas";
import { logger } from "../../utilities/logger";
import {
  deployPublishedRequestBodySchema,
  deployPublishedSchema,
} from "../../schemas/deployer/published";

export async function deployPublished(fastify: FastifyInstance) {
  fastify.route<deployPublishedSchema>({
    method: "POST",
    url: "/deployer/:chain_name_or_id/:publisher/:contract_name",
    schema: {
      description: "Deploy published contract",
      tags: ["Deploy"],
      operationId: "deployPublished",
      params: publishedDeployParamSchema,
      response: standardResponseSchema,
      body: deployPublishedRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, publisher, contract_name } = request.params;
      const { constructorParams, version } = request.body;

      logger.info(
        `Deploying Published Contract from ${publisher}: ${contract_name}`,
      );
      logger.silly(`Chain : ${chain_name_or_id}`);
      logger.silly(`constructorParams : ${JSON.stringify(constructorParams)}`);

      const sdk = await getSDK(chain_name_or_id);
      const deployedAddress = await sdk.deployer.deployReleasedContract(
        publisher,
        contract_name,
        constructorParams,
        version,
      );
      logger.silly(`deployedAddress : ${deployedAddress}`);

      // TODO unwrap the nesting
      // TODO return the transaction receipt too
      reply.status(StatusCodes.OK).send({
        result: {
          data: deployedAddress,
        },
      });
    },
  });
}
