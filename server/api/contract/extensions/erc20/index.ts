import { FastifyInstance } from "fastify";

import { erc20AllowanceOf } from "./read/allowanceOf";
import { erc20TotalSupply } from "./read/totalSupply";
import { erc20BalanceOf } from "./read/balanceOf";
import { erc20GetMetadata } from "./read/get";

import { erc20SetAlowance } from "./write/setAllowance";
import { erc20Transfer } from "./write/transfer";
import { erc20TransferFrom } from "./write/transferFrom";
import { erc20burn } from "./write/burn";
import { erc20burnFrom } from "./write/burnFrom";
import { erc20claimTo } from "./write/claimTo";
import { erc20mintBatchTo } from "./write/mintBatchTo";
import { erc20mintTo } from "./write/mintTo";
import { erc20SignatureGenerate } from "./read/signatureGenerate";
import { erc20SignatureMint } from "./write/signatureMint";

export const erc20Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc20AllowanceOf);
  await fastify.register(erc20BalanceOf);
  await fastify.register(erc20GetMetadata);
  await fastify.register(erc20TotalSupply);
  await fastify.register(erc20SignatureGenerate);

  //POST
  await fastify.register(erc20SetAlowance);
  await fastify.register(erc20Transfer);
  await fastify.register(erc20TransferFrom);
  await fastify.register(erc20burn);
  await fastify.register(erc20burnFrom);
  await fastify.register(erc20claimTo);
  await fastify.register(erc20mintBatchTo);
  await fastify.register(erc20mintTo);
  await fastify.register(erc20SignatureMint);
};
