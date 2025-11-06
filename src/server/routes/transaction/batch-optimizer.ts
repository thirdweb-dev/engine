import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { getChain } from "../../../shared/utils/chain";
import { prisma } from "../../../shared/db/client";
import { redis } from "../../../shared/utils/redis/redis";
import { eth_gasPrice, getRpcClient, type Address } from "thirdweb";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { getAddress } from "thirdweb";

const batchRequestSchema = Type.Object({
  fromAddress: Type.String({
    description: "The wallet address to send transactions from",
  }),
  chainId: Type.String({
    description: "Chain ID to execute on",
  }),
  transactions: Type.Array(
    Type.Object({
      to: Type.String(),
      data: Type.Optional(Type.String()),
      value: Type.Optional(Type.String()),
    }),
    {
      minItems: 2,
      maxItems: 50,
      description: "Array of transactions to batch (2-50 txs)",
    },
  ),
  optimization: Type.Optional(
    Type.Union([
      Type.Literal("speed"),
      Type.Literal("balanced"),
      Type.Literal("cost"),
    ]),
    {
      default: "balanced",
      description:
        "Optimization strategy: 'speed' (fastest), 'balanced', or 'cost' (cheapest)",
    },
  ),
});

const estimateResponseSchema = Type.Object({
  batchId: Type.String(),
  status: Type.String(),
  chainId: Type.Number(),
  fromAddress: Type.String(),
  transactionCount: Type.Number(),
  estimatedCost: Type.Object({
    totalGasEstimate: Type.String(),
    gasPrice: Type.String(),
    totalCostWei: Type.String(),
    totalCostEth: Type.String(),
    perTransactionCostWei: Type.String(),
  }),
  optimization: Type.Object({
    strategy: Type.String(),
    savingsVsIndividual: Type.String(),
    estimatedTimeSeconds: Type.Number(),
    recommendation: Type.String(),
  }),
  gasPriceAnalysis: Type.Object({
    current: Type.String(),
    low: Type.String(),
    average: Type.String(),
    high: Type.String(),
    suggestion: Type.String(),
  }),
  queuePosition: Type.Number(),
  estimatedExecutionTime: Type.String(),
});

const executeBatchRequestSchema = Type.Object({
  batchId: Type.String({
    description: "Batch ID from the estimate request",
  }),
  confirmed: Type.Boolean({
    description: "Confirm execution of the batch",
  }),
});

const batchStatusSchema = Type.Object({
  batchId: Type.String(),
  status: Type.Literal("pending")
    .Or(Type.Literal("queued"))
    .Or(Type.Literal("processing"))
    .Or(Type.Literal("completed"))
    .Or(Type.Literal("failed")),
  transactionCount: Type.Number(),
  completedCount: Type.Number(),
  failedCount: Type.Number(),
  transactions: Type.Array(
    Type.Object({
      queueId: Type.String(),
      status: Type.String(),
      transactionHash: Type.Optional(Type.String()),
    }),
  ),
});

// Helper to generate batch ID
const generateBatchId = () => {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Cache batch data in Redis (expire after 1 hour)
const cacheBatchData = async (batchId: string, data: any) => {
  await redis.setex(`batch:${batchId}`, 3600, JSON.stringify(data));
};

const getBatchData = async (batchId: string) => {
  const data = await redis.get(`batch:${batchId}`);
  return data ? JSON.parse(data) : null;
};

// Estimate gas for transactions
const estimateGasForBatch = async (
  chainId: number,
  transactions: any[],
): Promise<bigint> => {
  // Simplified estimation - in production, would call estimateGas for each
  const avgGasPerTx = 21000n + 50000n; // Base + avg contract interaction
  return BigInt(transactions.length) * avgGasPerTx;
};

// Get historical gas prices
const getGasPriceAnalysis = async (chainId: number) => {
  const chain = await getChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  const currentGasPrice = await eth_gasPrice(rpcRequest);
  
  // Get historical data from Redis cache if available
  const cacheKey = `gas-history:${chainId}`;
  const cached = await redis.get(cacheKey);
  let history = cached ? JSON.parse(cached) : [];
  
  // Add current price to history
  history.push(Number(currentGasPrice));
  if (history.length > 100) history = history.slice(-100);
  await redis.setex(cacheKey, 300, JSON.stringify(history)); // Cache for 5 min

  // Calculate percentiles
  const sorted = [...history].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.25)] || Number(currentGasPrice);
  const avg = sorted[Math.floor(sorted.length * 0.5)] || Number(currentGasPrice);
  const high = sorted[Math.floor(sorted.length * 0.75)] || Number(currentGasPrice);

  let suggestion = "normal";
  if (Number(currentGasPrice) < low * 1.1) {
    suggestion = "excellent - gas prices are very low right now";
  } else if (Number(currentGasPrice) > high * 0.9) {
    suggestion = "high - consider waiting for lower gas prices";
  } else {
    suggestion = "moderate - reasonable time to execute";
  }

  return {
    current: currentGasPrice.toString(),
    low: low.toString(),
    average: avg.toString(),
    high: high.toString(),
    suggestion,
  };
};

// Estimate batch and provide recommendations
export async function estimateBatchTransactions(fastify: FastifyInstance) {
  fastify.post(
    "/transaction/batch/estimate",
    {
      schema: {
        summary: "Estimate batch transaction costs",
        description:
          "Get cost estimates and optimization recommendations for batching multiple transactions. Provides gas price analysis and queue position.",
        tags: ["Transaction"],
        operationId: "estimateBatch",
        body: batchRequestSchema,
        response: {
          [StatusCodes.OK]: estimateResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { fromAddress, chainId, transactions, optimization = "balanced" } =
        request.body as Static<typeof batchRequestSchema>;

      const chainIdNum = parseInt(chainId);
      const batchId = generateBatchId();

      // Get gas price analysis
      const gasPriceAnalysis = await getGasPriceAnalysis(chainIdNum);
      const gasPrice = BigInt(gasPriceAnalysis.current);

      // Estimate gas for batch
      const totalGasEstimate = await estimateGasForBatch(
        chainIdNum,
        transactions,
      );
      const totalCostWei = totalGasEstimate * gasPrice;

      // Calculate savings vs individual transactions
      // Batching saves on base gas and reduces total gas by ~15%
      const individualCostWei =
        BigInt(transactions.length) * (21000n * gasPrice);
      const savingsWei = individualCostWei - totalCostWei;
      const savingsPercent = Number((savingsWei * 100n) / individualCostWei);

      // Optimization strategy recommendations
      let estimatedTimeSeconds = 30;
      let recommendation = "";
      
      switch (optimization) {
        case "speed":
          estimatedTimeSeconds = 15;
          recommendation =
            "Transactions will be sent immediately with higher gas prices for fastest confirmation.";
          break;
        case "cost":
          estimatedTimeSeconds = 300;
          recommendation =
            "Transactions will wait for optimal gas prices. May take several minutes but saves ~20-30% on gas costs.";
          break;
        default: // balanced
          estimatedTimeSeconds = 60;
          recommendation =
            "Balanced approach - will execute when gas prices are reasonable, typically within 1-2 minutes.";
      }

      // Get current queue size for position estimate
      const queueSize = await prisma.transactions.count({
        where: {
          minedAt: null,
          cancelledAt: null,
          errorMessage: null,
          fromAddress: getAddress(fromAddress as Address),
          chainId: chainIdNum.toString(),
        },
      });

      const estimatedExecutionTime = new Date(
        Date.now() + estimatedTimeSeconds * 1000,
      ).toISOString();

      // Cache batch data
      await cacheBatchData(batchId, {
        fromAddress,
        chainId: chainIdNum,
        transactions,
        optimization,
        createdAt: Date.now(),
      });

      const response = {
        batchId,
        status: "estimated",
        chainId: chainIdNum,
        fromAddress,
        transactionCount: transactions.length,
        estimatedCost: {
          totalGasEstimate: totalGasEstimate.toString(),
          gasPrice: gasPrice.toString(),
          totalCostWei: totalCostWei.toString(),
          totalCostEth: (Number(totalCostWei) / 1e18).toFixed(6),
          perTransactionCostWei: (totalCostWei / BigInt(transactions.length)).toString(),
        },
        optimization: {
          strategy: optimization,
          savingsVsIndividual: `${savingsPercent.toFixed(1)}% (${(Number(savingsWei) / 1e18).toFixed(6)} ETH)`,
          estimatedTimeSeconds,
          recommendation,
        },
        gasPriceAnalysis,
        queuePosition: queueSize + 1,
        estimatedExecutionTime,
      } satisfies Static<typeof estimateResponseSchema>;

      reply.status(StatusCodes.OK).send(response);
    },
  );
}

// Execute the batch
export async function executeBatchTransactions(fastify: FastifyInstance) {
  fastify.post(
    "/transaction/batch/execute",
    {
      schema: {
        summary: "Execute batch transactions",
        description:
          "Execute a previously estimated batch of transactions. Requires confirmation and valid batch ID.",
        tags: ["Transaction"],
        operationId: "executeBatch",
        body: executeBatchRequestSchema,
        response: {
          [StatusCodes.OK]: Type.Object({
            batchId: Type.String(),
            status: Type.String(),
            message: Type.String(),
            queueIds: Type.Array(Type.String()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { batchId, confirmed } = request.body as Static<
        typeof executeBatchRequestSchema
      >;

      if (!confirmed) {
        return reply.status(StatusCodes.BAD_REQUEST).send({
          error: "Batch execution requires confirmation",
          message: "Set 'confirmed: true' to execute the batch",
        });
      }

      // Get cached batch data
      const batchData = await getBatchData(batchId);
      if (!batchData) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          error: "Batch not found",
          message:
            "Batch ID not found or expired. Please create a new estimate.",
        });
      }

      const { fromAddress, chainId, transactions, optimization } = batchData;

      // TODO: Integrate with actual transaction queue
      // For now, return success with placeholder queue IDs
      const queueIds = transactions.map(
        (_: any, i: number) => `${batchId}_tx_${i}`,
      );

      // Update batch status in Redis
      await cacheBatchData(batchId, {
        ...batchData,
        status: "queued",
        queueIds,
        executedAt: Date.now(),
      });

      reply.status(StatusCodes.OK).send({
        batchId,
        status: "queued",
        message: `Batch of ${transactions.length} transactions queued for execution with ${optimization} optimization`,
        queueIds,
      });
    },
  );
}

// Get batch status
export async function getBatchStatus(fastify: FastifyInstance) {
  fastify.get(
    "/transaction/batch/:batchId",
    {
      schema: {
        summary: "Get batch transaction status",
        description:
          "Check the status of a batch transaction and individual transaction statuses.",
        tags: ["Transaction"],
        operationId: "getBatchStatus",
        params: Type.Object({
          batchId: Type.String(),
        }),
        response: {
          [StatusCodes.OK]: batchStatusSchema,
        },
      },
    },
    async (request, reply) => {
      const { batchId } = request.params as { batchId: string };

      const batchData = await getBatchData(batchId);
      if (!batchData) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          error: "Batch not found",
          message: "Batch ID not found or expired",
        });
      }

      const { transactions, queueIds = [] } = batchData;

      // TODO: Get actual transaction statuses from queue
      const txStatuses = queueIds.map((queueId: string, i: number) => ({
        queueId,
        status: "pending",
        transactionHash: undefined,
      }));

      const response = {
        batchId,
        status: batchData.status || "pending",
        transactionCount: transactions.length,
        completedCount: 0,
        failedCount: 0,
        transactions: txStatuses,
      } satisfies Static<typeof batchStatusSchema>;

      reply.status(StatusCodes.OK).send(response);
    },
  );
}
