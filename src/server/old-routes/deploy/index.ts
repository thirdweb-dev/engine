import type { FastifyInstance } from "fastify";
import { deployPrebuiltEdition } from "./prebuilts/edition.js";
import { deployPrebuiltEditionDrop } from "./prebuilts/edition-drop.js";
import { deployPrebuiltMarketplaceV3 } from "./prebuilts/marketplace-v3.js";
import { deployPrebuiltMultiwrap } from "./prebuilts/multiwrap.js";
import { deployPrebuiltNFTCollection } from "./prebuilts/nft-collection.js";
import { deployPrebuiltNFTDrop } from "./prebuilts/nft-drop.js";
import { deployPrebuiltPack } from "./prebuilts/pack.js";
import { deployPrebuiltSignatureDrop } from "./prebuilts/signature-drop.js";
import { deployPrebuiltSplit } from "./prebuilts/split.js";
import { deployPrebuiltToken } from "./prebuilts/token.js";
import { deployPrebuiltTokenDrop } from "./prebuilts/token-drop.js";
import { deployPrebuiltVote } from "./prebuilts/vote.js";
import { deployPrebuilt } from "./prebuilt.js";
import { deployPublished } from "./published.js";
import { contractTypes } from "./contract-types.js";

export const prebuiltsRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(deployPrebuiltEdition);
  await fastify.register(deployPrebuiltEditionDrop);
  await fastify.register(deployPrebuiltMarketplaceV3);
  await fastify.register(deployPrebuiltMultiwrap);
  await fastify.register(deployPrebuiltNFTCollection);
  await fastify.register(deployPrebuiltNFTDrop);
  await fastify.register(deployPrebuiltPack);
  await fastify.register(deployPrebuiltSignatureDrop);
  await fastify.register(deployPrebuiltSplit);
  await fastify.register(deployPrebuiltToken);
  await fastify.register(deployPrebuiltTokenDrop);
  await fastify.register(deployPrebuiltVote);

  await fastify.register(deployPrebuilt);
  await fastify.register(deployPublished);
  await fastify.register(contractTypes);
};
