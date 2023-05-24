import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Static, Type } from "@sinclair/typebox";
import { v4 as uuid } from 'uuid';
import {
  getSDK,
  connectToDB,
  insertTransactionData,
} from "../../../../../helpers/index";
import {
  contractParamSchema, 
  writeReplyBodySchema,
  TransactionSchema,
  standardResponseSchema,
  baseReplyErrorSchema
} from '../../../../../helpers/sharedApiSchemas';

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  spender_address: Type.String({
    description: "Address of the wallet to allow transfers from",
  }),
  amount: Type.String({
    description: "The number of tokens to give as allowance",
  }),
});

requestBodySchema.examples = [
  {
    spender_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "100",
  },
];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});;

export async function erc20SetAlowance(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/setAllowance',
    schema: {
      description: "Grant allowance to another wallet address to spend the connected (Admin) wallet's funds (of this token).",
      tags: ['ERC20'],
      operationId: 'setAllowance',
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { spender_address, amount } = request.body;
      request.log.info('Inside ERC20 Set Allowance Function');
      request.log.debug(`Chain : ${chain_name_or_id}`)
      request.log.debug(`Contract Address : ${contract_address}`);

      // Connect to DB
      const dbInstance = await connectToDB(request);
      
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      // const returnData: any = await contract.erc20.setAllowance(spender_address, amount);
      const tx = await contract.erc20.setAllowance.prepare(spender_address, amount);
      const encodedData = tx.encode();
      const walletAddress = await sdk.wallet.getAddress();

      const txDataToInsert: TransactionSchema = {
        identifier: uuid(),
        walletAddress: walletAddress.toLowerCase(),
        contractAddress: contract_address.toLowerCase(),
        chainId: chain_name_or_id.toLowerCase(),
        extension: 'non-extension',
        rawFunctionName: tx.getMethod(),
        rawFunctionArgs: tx.getArgs().toString(),
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
        queuedId: txDataToInsert.identifier,
      });
    },
  });
}