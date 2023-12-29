import { FastifyInstance } from "fastify";
import { erc721BalanceOf } from "./read/balanceOf";
import { erc721CanClaim } from "./read/canClaim";
import { erc721Get } from "./read/get";
import { erc721GetActiveClaimConditions } from "./read/getActiveClaimConditions";
import { erc721GetAll } from "./read/getAll";
import { erc721GetAllClaimConditions } from "./read/getAllClaimConditions";
import { erc721GetClaimIneligibilityReasons } from "./read/getClaimIneligibilityReasons";
import { erc721GetClaimerProofs } from "./read/getClaimerProofs";
import { erc721GetOwned } from "./read/getOwned";
import { erc721IsApproved } from "./read/isApproved";
import { erc721SignatureGenerate } from "./read/signatureGenerate";
import { erc721TotalClaimedSupply } from "./read/totalClaimedSupply";
import { erc721TotalCount } from "./read/totalCount";
import { erc721TotalUnclaimedSupply } from "./read/totalUnclaimedSupply";
import { erc721burn } from "./write/burn";
import { erc721claimTo } from "./write/claimTo";
import { erc721lazyMint } from "./write/lazyMint";
import { erc721mintBatchTo } from "./write/mintBatchTo";
import { erc721mintTo } from "./write/mintTo";
import { erc721SetApprovalForAll } from "./write/setApprovalForAll";
import { erc721SetApprovalForToken } from "./write/setApprovalForToken";
import { erc721SetClaimConditions } from "./write/setClaimConditions";
import { erc721SignatureMint } from "./write/signatureMint";
import { erc721transfer } from "./write/transfer";
import { erc721transferFrom } from "./write/transferFrom";
import { erc721UpdateClaimConditions } from "./write/updateClaimConditions";

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
  await fastify.register(erc721CanClaim);
  await fastify.register(erc721GetActiveClaimConditions);
  await fastify.register(erc721GetAllClaimConditions);
  await fastify.register(erc721GetClaimIneligibilityReasons);
  await fastify.register(erc721GetClaimerProofs);

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
  await fastify.register(erc721SetClaimConditions);
  await fastify.register(erc721UpdateClaimConditions);
};
