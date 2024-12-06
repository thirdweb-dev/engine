import { BigNumber } from "ethers";
import { concat, toHex } from "viem";

const generateRandomUint192 = (): bigint => {
  const rand1 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand2 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand3 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand4 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand5 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand6 = BigInt(Math.floor(Math.random() * 0x100000000));
  return (
    (rand1 << 160n) |
    (rand2 << 128n) |
    (rand3 << 96n) |
    (rand4 << 64n) |
    (rand5 << 32n) |
    rand6
  );
};

export const randomNonce = () => {
  return BigNumber.from(
    concat([toHex(generateRandomUint192()), "0x0000000000000000"]),
  );
};
