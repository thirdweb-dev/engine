import { randomUUID } from "crypto";
import { PerformanceObserver, performance } from "perf_hooks";

export const watchPerformance = (
  onNewEntry: (entry: PerformanceEntry) => void,
) => {
  const performanceObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      onNewEntry(entry);
    });
  });
  performanceObserver.observe({ entryTypes: ["measure"], buffered: true });
};

export const timeFunction = <
  F extends (...args: any) => any,
  Args = F extends (args: infer A) => any ? A : never,
>(
  fn: F,
  resultTag: (args: Awaited<ReturnType<F>>) => string,
) => {
  const result = async (args: Args): Promise<Awaited<ReturnType<F>>> => {
    const marker = randomUUID();
    const markerStart = `${marker}-start`;
    const markerEnd = `${marker}-end`;

    performance.mark(markerStart);
    const fnResult = await fn(args);
    performance.mark(markerEnd);

    const measureName = resultTag(fnResult);
    performance.measure(measureName, markerStart, markerEnd);
    return fnResult;
  };
  return result;
};
