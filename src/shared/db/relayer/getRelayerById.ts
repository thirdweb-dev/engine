import { prisma } from "../client";

interface GetRelayerByIdParams {
  id: string;
}

export const getRelayerById = async ({ id }: GetRelayerByIdParams) => {
  const relayer = await prisma.relayers.findUnique({
    where: {
      id,
    },
  });

  if (!relayer) {
    return null;
  }

  return {
    ...relayer,
    chainId: parseInt(relayer.chainId),
    allowedContracts: relayer.allowedContracts
      ? (JSON.parse(relayer.allowedContracts).map((contractAddress: string) =>
          contractAddress.toLowerCase(),
        ) as string[])
      : null,
  };
};
