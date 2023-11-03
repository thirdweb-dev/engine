import { Static, Type } from "@sinclair/typebox";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../db/transactions/queueTx";
import { getContract } from "../../../utils/cache/getContract";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const BodySchema = Type.Object({
  request: Type.Any(),
  signature: Type.String(),
  forwarderAddress: Type.String(),
});

const ReplySchema = Type.Composite([
  Type.Object({
    result: Type.Optional(
      Type.Object({
        queueId: Type.String({
          description: "Queue ID",
        }),
      }),
    ),
  }),
  Type.Object({
    error: Type.Optional(
      Type.Object({
        message: Type.String(),
      }),
    ),
  }),
]);

export async function relayTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/relayer/:chain",
    schema: {
      summary: "Relay a meta-transaction",
      description: "Relay an EIP-2771 meta-transaction",
      tags: ["Relayer"],
      operationId: "relay",
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, res) => {
      const { chain } = req.params;
      const { request, signature, forwarderAddress } = req.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        walletAddress,
        contractAddress: forwarderAddress,
      });

      const valid = await contract.call("verify", [
        request,
        ethers.utils.joinSignature(ethers.utils.splitSignature(signature)),
      ]);

      if (!valid) {
        res.status(400).send({
          error: {
            message:
              "Invalid request - verification failed with provided message and signature",
          },
        });
        return;
      }

      const tx = await contract.prepare("execute", [request, signature]);
      const queueId = await queueTx({ tx, chainId, extension: "forwarder" });

      res.status(200).send({
        result: {
          queueId,
        },
      });
    },
  });
}
