export const maybeBigInt = (val?: string) => (val ? BigInt(val) : undefined);
