import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static } from "@sinclair/typebox";
import { v4 as uuid } from 'uuid';
import { getSDK, connectToDB } from "../../../helpers/index";
import {
  partialRouteSchema,
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
      const queuedId: string = uuid();
      const contract = await sdk.getContract(contract_address);
      const tx = contract.prepare(function_name, args);
      const encodedData = tx.encode()
      const value = tx.getValue();
      
    // txType VARCHAR(2),
    // txHash VARCHAR(255),
    // encodedInputData TEXT,
    // rawFunctionName VARCHAR(255),
    // rawFunctionArgs VARCHAR(255),
    // createdTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    // updatedTimestamp TIMESTAMP,
    // txSubmittedTimestamp TIMESTAMP,
    // txProcessedTimestamp TIMESTAMP,
    // txRetryTimestamp TIMESTAMP,
    // txProcessed BOOLEAN,
    // txSubmitted BOOLEAN,
    // txMined BOOLEAN,
    // txErrored BOOLEAN,
    // gasPrice VARCHAR(50),
    // gasLimit VARCHAR(50),
    // maxPriorityFeePerGas VARCHAR(50),
    // maxFeePerGas VARCHAR(50),
      await dbInstance.raw(`INSERT INTO transactions 
        ( identifier,
          walletaddress,
          contractaddress,
          chainid,
          extension,
          rawfunctionname,
          rawfunctionargs,
          txprocessed,
          txsubmitted,
          txerrored,
          txmined)
        VALUES (
          '${queuedId}',
          '${getEnv('WALLET_ADDRESS').toLowerCase()}',
          '${contract_address.toLowerCase()}',
          '${chain_name_or_id.toLowerCase()}',
          'non-extension',
          '${function_name}',
          '${args}',
          false,
          false,
          false,
          false
        )`);

      // Closing the DB Connection
      await dbInstance.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          queuedId, 
        }
      });
    },
  });
}
