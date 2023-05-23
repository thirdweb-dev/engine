import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static } from "@sinclair/typebox";
import { v4 as uuid } from 'uuid';
import {
  getSDK,
  connectToDB,
  insertTransactionData,
} from "../../../helpers/index";
import {
  partialRouteSchema,
  TransactionSchema
} from "../../../helpers/sharedApiSchemas";
import {
  writeRequestBodySchema,
  writeSchema,
} from "../../../schemas/contract/write";

import { getEnv } from "../../../helpers/loadEnv";

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
      const dbInstance = await connectToDB();
      
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = contract.prepare(function_name, args);
      const encodedData = tx.encode();
      const walletAddress = await sdk.wallet.getAddress();

      const txDataToInsert: TransactionSchema = {
        identifier: uuid(),
        walletaddress: walletAddress.toLowerCase(),
        contractaddress: contract_address.toLowerCase(),
        chainid: chain_name_or_id.toLowerCase(),
        extension: 'non-extension',
        rawfunctionname: function_name,
        rawfunctionargs: args.toString(),
        txprocessed: false,
        txerrored: false,
        txmined: false,
        txsubmitted: false,
        encodedinputdata: encodedData,
      };
      
      const inserted = await insertTransactionData(dbInstance, txDataToInsert, request);

      if (!inserted) {
        throw new Error('Error occured by inserting');
      }

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
