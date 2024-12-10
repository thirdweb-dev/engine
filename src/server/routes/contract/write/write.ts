import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prepareContractCall, resolveMethod } from "thirdweb";
import { parseAbiParams, type AbiFunction } from "thirdweb/utils";
import { getContractV5 } from "../../../../shared/utils/cache/get-contractv5";
import { prettifyError } from "../../../../shared/utils/error";
import { queueTransaction } from "../../../../shared/utils/transaction/queue-transation";
import { createCustomError } from "../../../middleware/error";
import { abiArraySchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../schemas/wallet";
import { sanitizeAbi, sanitizeFunctionName } from "../../../utils/abi";
import { getChainIdFromChain } from "../../../utils/chain";
import { parseTransactionOverrides } from "../../../utils/transactionOverrides";

// INPUT
const writeRequestBodySchema = Type.Object({
  functionName: Type.String({
    description: `The function to call on the contract. It is highly recommended to provide a full function signature, such as "function mintTo(address to, uint256 amount)", to avoid ambiguity and to skip ABI resolution.`,
    examples: ["function mintTo(address to, uint256 amount)"],
  }),
  args: Type.Array(Type.Any(), {
    description:
      "An array of arguments to provide the function. Supports: numbers, strings, arrays, objects. Do not provide: BigNumber, bigint, Date objects",
    examples: [
      [
        1730380951,
        "0x09530565aC1Ce08C3621f5B24Fca6d9a76574620",
        ["a", "b", "c"],
      ],
    ],
  }),
  ...txOverridesWithValueSchema.properties,
  abi: Type.Optional(abiArraySchema),
});

// LOGIC
export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof writeRequestBodySchema>;
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/write",
    schema: {
      summary: "Write to contract",
      description: "Call a write function on a contract.",
      tags: ["Contract"],
      operationId: "write",
      params: contractParamSchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      body: writeRequestBodySchema,
      response: {
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { functionName, args, txOverrides, abi } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
        abi: sanitizeAbi(abi),
      });

      // 3 possible ways to get function from abi:
      // 1. functionName passed as solidity signature
      // 2. functionName passed as function name + passed in ABI
      // 3. functionName passed as function name + inferred ABI (fetched at encode time)
      // this is all handled inside the `resolveMethod` function
      let method: AbiFunction;
      let params: Array<string | bigint | boolean | object>;
      try {
        const functionNameOrSignature = sanitizeFunctionName(functionName);
        method = await resolveMethod(functionNameOrSignature)(contract);
        params = parseAbiParams(
          method.inputs.map((i) => i.type),
          args,
        );
      } catch (e) {
        throw createCustomError(
          prettifyError(e),
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const transaction = prepareContractCall({
        contract,
        method,
        params,
        ...parseTransactionOverrides(txOverrides),
      });

      const queueId = await queueTransaction({
        functionName,
        transaction,
        fromAddress: requiredAddress(fromAddress, "x-backend-wallet-address"),
        toAddress: maybeAddress(contractAddress, "to"),
        accountAddress: maybeAddress(accountAddress, "x-account-address"),
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
        accountSalt,
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
