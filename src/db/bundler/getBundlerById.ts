import { prisma } from "../client";

interface GetBundlerByIdParams {
  id: string;
}

export const getBundlerById = async ({ id }: GetBundlerByIdParams) => {
  const bundler = await prisma.bundlers.findUnique({
    where: {
      id,
    },
  });

  if (!bundler) {
    return null;
  }

  return {
    ...bundler,
    chainId: parseInt(bundler.chainId),
  };
};
