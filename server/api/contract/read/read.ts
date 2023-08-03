import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  addSubscription,
  removeSubscription,
  startSubscription,
} from "../../../../core/services/blockchain";
import { partialRouteSchema } from "../../../helpers/sharedApiSchemas";
import { readRequestQuerySchema, readSchema } from "../../../schemas/contract";
import { bigNumberReplacer } from "../../../utilities/convertor";

export async function readContract(fastify: FastifyInstance) {
  fastify.route<readSchema>({
    method: "GET",
    url: "/contract/:network/:contract_address/read",
    schema: {
      description:
        "Read From Contract. To listen to changes for this value, use the websocket endpoint.",
      tags: ["Contract"],
      operationId: "read",
      ...partialRouteSchema,
      querystring: readRequestQuerySchema,
    },
    wsHandler: async (connection, request) => {
      const { network, contract_address } = request.params;
      const { function_name, args } = request.query;
      connection.setEncoding("utf-8");
      startSubscription(network);
      addSubscription({
        network,
        contractAddress: contract_address,
        functionName: function_name,
        websocketId: request.headers["sec-websocket-key"] ?? "",
        ws: connection.socket,
        args: args,
      });
      connection.socket.on("close", () => {
        removeSubscription(
          network,
          contract_address,
          function_name,
          request.headers["sec-websocket-key"] ?? "",
          args,
        );
      });
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
