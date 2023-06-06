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
import { eaBuyoutAuction } from "./englishAuctions/write/buyoutAuction";
import { eaCancelAuction } from "./englishAuctions/write/cancelAuction";
import { eaCreateAuction } from "./englishAuctions/write/createAuction";
import { eaCloseAuctionForBidder } from "./englishAuctions/write/closeAuctionForBidder";
import { eaCloseAuctionForSeller } from "./englishAuctions/write/closeAuctionForSeller";
import { eaExecuteSale } from "./englishAuctions/write/executeSale";
import { eaMakeBid } from "./englishAuctions/write/makeBid";

import { offersGetAll } from "./offers/read/getAll";
import { offersGetAllValid } from "./offers/read/getAllValid";
import { offersGetOffer } from "./offers/read/getOffer";
import { offersGetTotalCount } from "./offers/read/getTotalCount";
import { offersCancelOffer } from "./offers/write/cancelOffer";
import { offersAcceptOffer } from "./offers/write/acceptOffer";
import { offersMakeOffer } from "./offers/write/makeOffer";

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

  // Offers
  await fastify.register(offersGetAll);
  await fastify.register(offersGetAllValid);
  await fastify.register(offersGetOffer);
  await fastify.register(offersGetTotalCount);

  // WRITE

  // Direct Listings
  await fastify.register(dlCreateListing);
  await fastify.register(dlUpdateListing);
  await fastify.register(dlBuyFromListing);
  await fastify.register(dlApproveBuyerForReservedListing);
  await fastify.register(dlRevokeBuyerApprovalForReservedListing);
  await fastify.register(dlRevokeCurrencyApprovalForListing);

  // English Auctions
  await fastify.register(eaBuyoutAuction);
  await fastify.register(eaCancelAuction);
  await fastify.register(eaCreateAuction);
  await fastify.register(eaCloseAuctionForBidder);
  await fastify.register(eaCloseAuctionForSeller);
  await fastify.register(eaExecuteSale);
  await fastify.register(eaMakeBid);

  // Offers
  await fastify.register(offersMakeOffer);
  await fastify.register(offersCancelOffer);
  await fastify.register(offersAcceptOffer);
};
