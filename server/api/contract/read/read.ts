import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import { partialRouteSchema } from "../../../helpers/sharedApiSchemas";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import { bigNumberReplacer } from "../../../utilities/convertor";

export async function readContract(fastify: FastifyInstance) {
  fastify.route<readSchema>({
    method: "GET",
    url: "/contract/:network/:contract_address/read",
    schema: {
      description: "Read From Contract",
      tags: ["Contract"],
      operationId: "read",
      ...partialRouteSchema,
      querystring: readRequestQuerySchema,
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { function_name, args } = request.query;

      const contract = await getContractInstance(network, contract_address);

      let returnData = await contract.call(
        function_name,
        args ? args.split(",") : [],
      );
      returnData = bigNumberReplacer(returnData);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
