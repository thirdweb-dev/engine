-- CreateTable
CREATE TABLE "cancelled_transactions" (
    "queueId" TEXT NOT NULL,
    "cancelledByWorkerAt" TIMESTAMP(3),

    CONSTRAINT "cancelled_transactions_pkey" PRIMARY KEY ("queueId")
);
