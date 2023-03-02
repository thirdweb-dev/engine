import Fastify, { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import {
  ThirdwebSDK,
  Abi,
  getAllDetectedFeatureNames,
  resolveContractUriFromAddress,
} from "@thirdweb-dev/sdk";
import { Fleet } from "./fleet";
import { relayTransaction } from "./relay";

const server: FastifyInstance = Fastify({
  logger: true,
});

const VoidPlugin = (fastify, opts, done) => {
  done();
};

const RelayPlugin = (fastify, opts, done) => {
  fastify.post("/transaction", async (request, reply) => {
    const { network } = request.params;
    const { compat } = request.query;

    let body = request.body;
    const isCompatOZ = compat && compat === "oz";
    if (isCompatOZ) {
      // LOL
      body = JSON.parse(request.body);
    }

    const { request: requestPayload, signature, forwarderAddress } = body;

    if (!signature || signature.length != 132) {
      throw new Error("Invalid signature");
    }

    // note: fix ledger live where signature result in v = 0, 1.
    const fixedSignature = ethers.utils.joinSignature(
      ethers.utils.splitSignature(signature)
    );

    const relayTransactionResult = await relayTransaction(
      network,
      requestPayload,
      fixedSignature,
      forwarderAddress
    );

    if (isCompatOZ) {
      // LOL cmon OZ.
      return {
        result: JSON.stringify({
          txHash: relayTransactionResult.transactionHash,
          txResult: relayTransactionResult,
        }),
      };
    } else {
      return {
        result: relayTransactionResult,
      };
    }
  });

  done();
};

const HealthPlugin = (fastify, opts, done) => {
  fastify.get("/", opts, async (request, reply) => {
    return { status: "ok" };
  });
  done();
};

server.register(VoidPlugin, { prefix: "/wallet" });
server.register(VoidPlugin, { prefix: "/:network/wallet" });
server.register(VoidPlugin, { prefix: "/:network/contract" });
server.register(VoidPlugin, { prefix: "/:network/transaction" });
server.register(RelayPlugin, { prefix: "/:network/relay" });
server.register(VoidPlugin, { prefix: "/storage" });
server.register(VoidPlugin, { prefix: "/auth" });
server.register(HealthPlugin, { prefix: "/health" });

server.setNotFoundHandler(async (request, reply) => {
  return { message: "Not Found" };
});

server.ready(() => {
  console.log(server.printRoutes({ commonPrefix: false }));
});

const start = async () => {
  try {
    const host = "0.0.0.0";
    const port = 3000;
    server.log.info(`Listening on ${host}:${port}`);
    await server.listen({ host, port });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
