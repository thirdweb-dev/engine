import { FastifyInstance } from "fastify";
import { deployPrebuiltEdition } from "./prebuilts/edition";
import { deployPrebuiltEditionDrop } from "./prebuilts/editionDrop";
import { deployPrebuiltMarketplaceV3 } from "./prebuilts/marketplaceV3";
import { deployPrebuiltMultiwrap } from "./prebuilts/multiwrap";
import { deployPrebuiltNFTCollection } from "./prebuilts/nftCollection";
import { deployPrebuiltNFTDrop } from "./prebuilts/nftDrop";
import { deployPrebuiltPack } from "./prebuilts/pack";
import { deployPrebuiltSignatureDrop } from "./prebuilts/signatureDrop";
import { deployPrebuiltSplit } from "./prebuilts/split";
import { deployPrebuiltToken } from "./prebuilts/token";
import { deployPrebuiltTokenDrop } from "./prebuilts/tokenDrop";
import { deployPrebuiltVote } from "./prebuilts/vote";
import { deployPrebuilt } from "./prebuilt";
import { deployPublished } from "./published";
import { contractTypes } from "./contractTypes";

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
