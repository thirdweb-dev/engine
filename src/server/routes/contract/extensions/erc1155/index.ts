import { FastifyInstance } from "fastify";
import { erc1155Get } from "./read/get";
import { erc1155GetAll } from "./read/getAll";
import { erc1155BalanceOf } from "./read/balanceOf";
import { erc1155IsApproved } from "./read/isApproved";
import { erc1155GetOwned } from "./read/getOwned";
import { erc1155TotalSupply } from "./read/totalSupply";
import { erc1155TotalCount } from "./read/totalCount";
import { erc1155airdrop } from "./write/airdrop";
import { erc1155burn } from "./write/burn";
import { erc1155burnBatch } from "./write/burnBatch";
import { erc1155claimTo } from "./write/claimTo";
import { erc1155lazyMint } from "./write/lazyMint";
import { erc1155mintAdditionalSupplyTo } from "./write/mintAdditionalSupplyTo";
import { erc1155mintBatchTo } from "./write/mintBatchTo";
import { erc1155mintTo } from "./write/mintTo";
import { erc1155SetApprovalForAll } from "./write/setApprovalForAll";
import { erc1155transfer } from "./write/transfer";
import { erc1155transferFrom } from "./write/transferFrom";
import { erc1155SignatureGenerate } from "./read/signatureGenerate";
import { erc1155SignatureMint } from "./write/signatureMint";

export const erc1155Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc1155Get);
  await fastify.register(erc1155GetAll);
  await fastify.register(erc1155GetOwned);
  await fastify.register(erc1155BalanceOf);
  await fastify.register(erc1155IsApproved);
  await fastify.register(erc1155TotalCount);
  await fastify.register(erc1155TotalSupply);
  await fastify.register(erc1155SignatureGenerate);

  // POST
  await fastify.register(erc1155airdrop);
  await fastify.register(erc1155burn);
  await fastify.register(erc1155burnBatch);
  await fastify.register(erc1155claimTo);
  await fastify.register(erc1155lazyMint);
  await fastify.register(erc1155mintAdditionalSupplyTo);
  await fastify.register(erc1155mintBatchTo);
  await fastify.register(erc1155mintTo);
  await fastify.register(erc1155SetApprovalForAll);
  await fastify.register(erc1155transfer);
  await fastify.register(erc1155transferFrom);
  await fastify.register(erc1155SignatureMint);
};
