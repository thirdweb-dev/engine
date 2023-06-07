import { FastifyInstance } from "fastify";
import { erc721Get } from "./read/get";
import { erc721GetAll } from "./read/getAll";
import { erc721BalanceOf } from "./read/balanceOf";
import { erc721IsApproved } from "./read/isApproved";
import { erc721TotalCount } from "./read/totalCount";
import { erc721TotalClaimedSupply } from "./read/totalClaimedSupply";
import { erc721GetOwned } from "./read/getOwned";
import { erc721TotalUnclaimedSupply } from "./read/totalUnclaimedSupply";
import { erc721SetApprovalForAll } from "./write/setApprovalForAll";
import { erc721SetApprovalForToken } from "./write/setApprovalForToken";
import { erc721transfer } from "./write/transfer";
import { erc721transferFrom } from "./write/transferFrom";
import { erc721mintTo } from "./write/mintTo";
import { erc721mintBatchTo } from "./write/mintBatchTo";
import { erc721burn } from "./write/burn";
import { erc721lazyMint } from "./write/lazyMint";
import { erc721claimTo } from "./write/claimTo";
import { erc721SignatureGenerate } from "./read/signature-generate";
import { erc721SignatureMint } from "./write/signature-mint";

export const erc721Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc721Get);
  await fastify.register(erc721GetAll);
  await fastify.register(erc721GetOwned);
  await fastify.register(erc721BalanceOf);
  await fastify.register(erc721IsApproved);
  await fastify.register(erc721TotalCount);
  await fastify.register(erc721TotalClaimedSupply);
  await fastify.register(erc721TotalUnclaimedSupply);

  // POST
  await fastify.register(erc721SetApprovalForAll);
  await fastify.register(erc721SetApprovalForToken);
  await fastify.register(erc721transfer);
  await fastify.register(erc721transferFrom);
  await fastify.register(erc721mintTo);
  await fastify.register(erc721mintBatchTo);
  await fastify.register(erc721burn);
  await fastify.register(erc721lazyMint);
  await fastify.register(erc721claimTo);
  await fastify.register(erc721SignatureGenerate);
  await fastify.register(erc721SignatureMint);
};
