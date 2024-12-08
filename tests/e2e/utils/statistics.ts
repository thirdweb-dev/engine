export const calculateStats = (times: number[]) => {
  const filteredTimes = times.filter((time) => time > 0);
  const sortedTimes = [...filteredTimes].sort((a, b) => a - b);

  return {
    avg: filteredTimes.reduce((a, b) => a + b, 0) / filteredTimes.length,
    min: Math.min(...filteredTimes),
    max: Math.max(...filteredTimes),
    p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
  };
};

export const printStats = (minedTimes: number[], sentTimes: number[]) => {
  const minedStats = calculateStats(minedTimes);
  const sentStats = calculateStats(sentTimes);

  console.table({
    Mined: minedStats,
    Sent: sentStats,
  });
};
