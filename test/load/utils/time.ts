export const time = async <TReturnType extends { [key: string]: any }>(
  fn: (() => Promise<TReturnType>) | (() => TReturnType),
): Promise<TReturnType & { time: number }> => {
  const startTime = Date.now();
  const res = await fn();
  const ellapsedTime = (Date.now() - startTime) / 1000;

  return {
    ...res,
    time: ellapsedTime,
  };
};

export const createTimer = () => {
  const start = Date.now();
  return {
    ellapsed: (end?: Date) => {
      if (end) {
        return (end.getTime() - start) / 1000;
      }

      return (Date.now() - start) / 1000;
    },
  };
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
