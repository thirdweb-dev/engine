import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static } from "@sinclair/typebox";
import { v4 as uuid } from 'uuid';
import {
  getSDK,
  insertTransactionData,
  connectWithDatabase,
} from "../../../helpers/index";
import {
  partialRouteSchema,
  TransactionSchema
} from "../../../helpers/sharedApiSchemas";
import {
  writeRequestBodySchema,
  writeSchema,
} from "../../../schemas/contract/write";
import { createCustomError } from "../../../helpers/customError";

export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<writeSchema>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/write",
    schema: {
      description: "Write to Contract",
      tags: ["Contract"],
      operationId: "write",
      ...partialRouteSchema,
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.body;
      
      // Connect to DB
      const dbInstance = await connectWithDatabase(request);
      
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = await contract.prepare(function_name, args);
      const encodedData = tx.encode();
      const value = tx.getValue();
      const walletAddress = await sdk.wallet.getAddress();      
      
      const txDataToInsert: TransactionSchema = {
        identifier: uuid(),
        walletAddress: walletAddress.toLowerCase(),
        contractAddress: contract_address.toLowerCase(),
        chainId: chain_name_or_id.toLowerCase(),
        extension: 'non-extension',
        rawFunctionName: function_name,
        rawFunctionArgs: args.toString(),
        txProcessed: false,
        txErrored: false,
        txMined: false,
        txSubmitted: false,
        encodedInputData: encodedData,
      };

      await insertTransactionData(dbInstance, txDataToInsert, request);

      // Closing the DB Connection
      await dbInstance.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          queuedId: txDataToInsert.identifier, 
        }
      });
    },
  });
}
