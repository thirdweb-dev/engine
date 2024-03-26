export const getQueueIdCacheKey = (queueId: string) => {
  return `queueId:${queueId}`;
};

export const getIdempotencyCacheKey = (idempotencyKey: string) => {
  return `idempotencyKey:${idempotencyKey}`;
};
