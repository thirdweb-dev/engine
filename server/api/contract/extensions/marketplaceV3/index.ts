import { FastifyInstance } from "fastify";
import { dlGetAll } from "./directListings/read/getAll";
import { dlGetAllValid } from "./directListings/read/getAllValid";
import { dlGetListing } from "./directListings/read/getListing";
import { dlIsBuyerApprovedForListing } from "./directListings/read/isBuyerApprovedForListing";
import { dlIsCurrencyApprovedForListing } from "./directListings/read/isCurrencyApprovedForListing";
import { dlCreateListing } from "./directListings/write/createListing";
import { dlGetTotalCount } from "./directListings/read/getTotalCount";
import { dlUpdateListing } from "./directListings/write/updateListing";
import { dlBuyFromListing } from "./directListings/write/buyFromListing";
import { dlRevokeBuyerApprovalForReservedListing } from "./directListings/write/revokeBuyerApprovalForReservedListing";
import { dlRevokeCurrencyApprovalForListing } from "./directListings/write/revokeCurrencyApprovalForListing";
import { dlApproveBuyerForReservedListing } from "./directListings/write/approveBuyerForReservedListing";

import { eaGetAll } from "./englishAuctions/read/getAll";
import { eaGetAllValid } from "./englishAuctions/read/getAllValid";
import { eaGetAuction } from "./englishAuctions/read/getAuction";
import { eaGetBidBufferBps } from "./englishAuctions/read/getBidBufferBps";
import { eaGetMinimumNextBid } from "./englishAuctions/read/getMinimumNextBid";
import { eaGetWinningBid } from "./englishAuctions/read/getWinningBid";
import { eaIsWinningBid } from "./englishAuctions/read/isWinningBid";
import { eaGetTotalCount } from "./englishAuctions/read/getTotalCount";

export const marketplaceV3Routes = async (fastify: FastifyInstance) => {
  // READ

  // Direct Listings
  await fastify.register(dlGetAll);
  await fastify.register(dlGetAllValid);
  await fastify.register(dlGetListing);
  await fastify.register(dlIsBuyerApprovedForListing);
  await fastify.register(dlIsCurrencyApprovedForListing);
  await fastify.register(dlGetTotalCount);

  // English Auctions
  await fastify.register(eaGetAll);
  await fastify.register(eaGetAllValid);
  await fastify.register(eaGetAuction);
  await fastify.register(eaGetBidBufferBps);
  await fastify.register(eaGetMinimumNextBid);
  await fastify.register(eaGetWinningBid);
  await fastify.register(eaGetTotalCount);
  await fastify.register(eaIsWinningBid);

  // WRITE

  // Direct Listings
  await fastify.register(dlCreateListing);
  await fastify.register(dlUpdateListing);
  await fastify.register(dlBuyFromListing);
  await fastify.register(dlApproveBuyerForReservedListing);
  await fastify.register(dlRevokeBuyerApprovalForReservedListing);
  await fastify.register(dlRevokeCurrencyApprovalForListing);
};
