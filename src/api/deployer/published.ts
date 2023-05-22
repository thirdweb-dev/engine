import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../helpers/index";
import {
  publishedDeployParamSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
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

      request.log.info(
        `Deploying Published Contract from ${publisher}: ${contract_name}`,
      );
      request.log.debug(`Chain : ${chain_name_or_id}`);
      request.log.debug(`constructorParams : ${JSON.stringify(constructorParams)}`);

      const sdk = await getSDK(chain_name_or_id);
      const deployedAddress = await sdk.deployer.deployReleasedContract(
        publisher,
        contract_name,
        constructorParams,
        version,
      );
      request.log.debug(`deployedAddress : ${deployedAddress}`);

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
