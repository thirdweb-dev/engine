import type { FastifyInstance } from "fastify";
import { erc20AllowanceOf } from "./read/allowance-of.js";
import { erc20BalanceOf } from "./read/balance-of.js";
import { erc20CanClaim } from "./read/can-claim.js";
import { erc20GetMetadata } from "./read/get.js";
import { erc20GetActiveClaimConditions } from "./read/get-active-claim-conditions.js";
import { erc20GetAllClaimConditions } from "./read/get-all-claim-conditions.js";
import { erc20GetClaimIneligibilityReasons } from "./read/get-claim-ineligibility-reasons.js";
import { erc20GetClaimerProofs } from "./read/get-claimer-proofs.js";
import { erc20SignatureGenerate } from "./read/signature-generate.js";
import { erc20TotalSupply } from "./read/total-supply.js";
import { erc20burn } from "./write/burn.js";
import { erc20burnFrom } from "./write/burn-from.js";
import { erc20claimTo } from "./write/claim-to.js";
import { erc20mintBatchTo } from "./write/mint-batch-to.js";
import { erc20mintTo } from "./write/mint-to.js";
import { erc20SetAlowance } from "./write/set-allowance.js";
import { erc20SetClaimConditions } from "./write/set-claim-conditions.js";
import { erc20SignatureMint } from "./write/signature-mint.js";
import { erc20Transfer } from "./write/transfer.js";
import { erc20TransferFrom } from "./write/transfer-from.js";
import { erc20UpdateClaimConditions } from "./write/update-claim-conditions.js";

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
