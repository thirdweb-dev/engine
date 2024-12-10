import { Type, type Static } from "@sinclair/typebox";
import { ethers, utils } from "ethers";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  ERC20PermitAbi,
  ERC2771ContextAbi,
  ForwarderAbi,
  ForwarderAbiEIP712ChainlessDomain,
  NativeMetaTransaction,
} from "../../../shared/schemas/relayer";
import { getRelayerById } from "../../../shared/db/relayer/get-relayer-by-id";
import { queueTx } from "../../../shared/db/transactions/queue-tx";
import { getSdk } from "../../../shared/utils/cache/get-sdk";
import { AddressSchema } from "../../schemas/address";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";

const ParamsSchema = Type.Object({
  relayerId: Type.String(),
});

const requestBodySchema = Type.Union([
  Type.Object({
    type: Type.Literal("forward"),
    request: Type.Object({
      from: Type.String(),
      to: Type.String(),
      value: Type.String(),
      gas: Type.String(),
      nonce: Type.String(),
      data: Type.String(),
      chainid: Type.Optional(Type.String()),
    }),
    signature: Type.String(),
    forwarderAddress: AddressSchema,
  }),
  Type.Object({
    type: Type.Literal("permit"),
    request: Type.Object({
      to: Type.String(),
      owner: Type.String(),
      spender: Type.String(),
      value: Type.String(),
      nonce: Type.String(),
      deadline: Type.String(),
    }),
    signature: Type.String(),
  }),
  Type.Object({
    type: Type.Literal("execute-meta-transaction"),
    request: Type.Object({
      from: Type.String(),
      to: Type.String(),
      data: Type.String(),
    }),
    signature: Type.String(),
  }),
]);

const responseBodySchema = Type.Composite([
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
    Reply: Static<typeof responseBodySchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/relayer/:relayerId",
    schema: {
      summary: "Relay a meta-transaction",
      description: "Relay an EIP-2771 meta-transaction",
      tags: ["Relayer"],
      operationId: "relay",
      params: ParamsSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, res) => {
      const { relayerId } = req.params;

      const relayer = await getRelayerById({ id: relayerId });
      if (!relayer) {
        return res.status(400).send({
          error: {
            message: `No relayer found with id '${relayerId}'`,
          },
        });
      }

      const sdk = await getSdk({
        chainId: relayer.chainId,
        walletAddress: relayer.backendWalletAddress,
      });

      if (req.body.type === "execute-meta-transaction") {
        // Polygon Execute Meta Transaction
        const { request, signature } = req.body;
        const { v, r, s } = utils.splitSignature(signature);

        if (
          relayer.allowedContracts &&
          !relayer.allowedContracts.includes(request.to.toLowerCase())
        ) {
          return res.status(400).send({
            error: {
              message: `Requesting to relay transaction to unauthorized contract ${request.to}.`,
            },
          });
        }

        const target = await sdk.getContractFromAbi(
          request.to.toLowerCase(),
          NativeMetaTransaction,
        );

        const tx = target.prepare("executeMetaTransaction", [
          request.from,
          request.data,
          r,
          s,
          v,
        ]);

        const queueId = await queueTx({
          tx,
          chainId: relayer.chainId,
          extension: "relayer",
        });

        res.status(StatusCodes.OK).send({
          result: {
            queueId,
          },
        });
        return;
      } else if (req.body.type === "permit") {
        // EIP-2612
        const { request, signature } = req.body;
        const { v, r, s } = utils.splitSignature(signature);

        // TODO: Remaining for backwards compatibility, but should enforce in the future
        if (
          relayer.allowedContracts &&
          !relayer.allowedContracts.includes(request.to.toLowerCase())
        ) {
          return res.status(400).send({
            error: {
              message: `Requesting to relay transaction to unauthorized contract ${request.to}.`,
            },
          });
        }

        const target = await sdk.getContractFromAbi(
          request.to.toLowerCase(),
          ERC20PermitAbi,
        );

        const tx = target.prepare("permit", [
          request.owner,
          request.spender,
          request.value,
          request.deadline,
          v,
          r,
          s,
        ]);

        const queueId = await queueTx({
          tx,
          chainId: relayer.chainId,
          extension: "relayer",
        });

        res.status(StatusCodes.OK).send({
          result: {
            queueId,
          },
        });
        return;
      }

      // EIP-2771
      const { request, signature, forwarderAddress } = req.body;

      if (
        relayer.allowedForwarders &&
        !relayer.allowedForwarders.includes(forwarderAddress.toLowerCase())
      ) {
        return res.status(400).send({
          error: {
            message: `Requesting to relay transaction with unauthorized forwarder ${forwarderAddress}.`,
          },
        });
      }

      // TODO: Remaining for backwards compatibility, but should enforce in the future
      if (
        relayer.allowedContracts &&
        !relayer.allowedContracts.includes(request.to.toLowerCase())
      ) {
        return res.status(400).send({
          error: {
            message: `Requesting to relay transaction to unauthorized contract ${request.to}.`,
          },
        });
      }

      if (request.value !== "0") {
        return res.status(400).send({
          error: {
            message: `Requesting to relay transaction with non-zero value ${request.value}.`,
          },
        });
      }

      // EIP-2771
      const target = await sdk.getContractFromAbi(
        request.to.toLowerCase(),
        ERC2771ContextAbi,
      );

      const isTrustedForwarder = await target.call("isTrustedForwarder", [
        forwarderAddress,
      ]);
      if (!isTrustedForwarder) {
        res.status(400).send({
          error: {
            message: `Requesting to relay transaction with untrusted forwarder ${forwarderAddress}.`,
          },
        });
        return;
      }

      const isForwarderEIP712ChainlessDomain = !!request.chainid;
      const forwarderAbi = isForwarderEIP712ChainlessDomain
        ? ForwarderAbiEIP712ChainlessDomain
        : ForwarderAbi;

      const forwarder = await sdk.getContractFromAbi(
        forwarderAddress,
        forwarderAbi,
      );

      const fixedSignature = ethers.utils.joinSignature(
        ethers.utils.splitSignature(signature),
      );
      const valid = await forwarder.call("verify", [request, fixedSignature]);

      if (!valid) {
        res.status(400).send({
          error: {
            message: "Verification failed with provided message and signature",
          },
        });
        return;
      }

      const tx = forwarder.prepare("execute", [request, fixedSignature]);
      const queueId = await queueTx({
        tx,
        chainId: relayer.chainId,
        extension: "relayer",
      });

      res.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
