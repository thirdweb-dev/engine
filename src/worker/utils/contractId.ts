export const getContractId = (chainId: number, contractAddress: string) =>
  `${chainId}:${contractAddress}`;
