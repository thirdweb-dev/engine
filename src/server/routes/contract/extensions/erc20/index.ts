import type { FastifyInstance } from "fastify";
import { erc20AllowanceOf } from "./read/allowance-of";
import { erc20BalanceOf } from "./read/balance-of";
import { erc20CanClaim } from "./read/can-claim";
import { erc20GetMetadata } from "./read/get";
import { erc20GetActiveClaimConditions } from "./read/get-active-claim-conditions";
import { erc20GetAllClaimConditions } from "./read/get-all-claim-conditions";
import { erc20GetClaimIneligibilityReasons } from "./read/get-claim-ineligibility-reasons";
import { erc20GetClaimerProofs } from "./read/get-claimer-proofs";
import { erc20SignatureGenerate } from "./read/signature-generate";
import { erc20TotalSupply } from "./read/total-supply";
import { erc20burn } from "./write/burn";
import { erc20burnFrom } from "./write/burn-from";
import { erc20claimTo } from "./write/claim-to";
import { erc20mintBatchTo } from "./write/mint-batch-to";
import { erc20mintTo } from "./write/mint-to";
import { erc20SetAlowance } from "./write/set-allowance";
import { erc20SetClaimConditions } from "./write/set-claim-conditions";
import { erc20SignatureMint } from "./write/signature-mint";
import { erc20Transfer } from "./write/transfer";
import { erc20TransferFrom } from "./write/transfer-from";
import { erc20UpdateClaimConditions } from "./write/update-claim-conditions";

export const erc20Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc20AllowanceOf);
  await fastify.register(erc20BalanceOf);
  await fastify.register(erc20GetMetadata);
  await fastify.register(erc20TotalSupply);
  await fastify.register(erc20SignatureGenerate);
  await fastify.register(erc20CanClaim);
  await fastify.register(erc20GetActiveClaimConditions);
  await fastify.register(erc20GetAllClaimConditions);
  await fastify.register(erc20GetClaimIneligibilityReasons);
  await fastify.register(erc20GetClaimerProofs);

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
  await fastify.register(erc20SetClaimConditions);
  await fastify.register(erc20UpdateClaimConditions);
};
