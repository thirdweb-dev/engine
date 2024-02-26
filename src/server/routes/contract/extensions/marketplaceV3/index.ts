import { FastifyInstance } from "fastify";
import { directListingsGetAll } from "./directListings/read/getAll";
import { directListingsGetAllValid } from "./directListings/read/getAllValid";
import { directListingsGetListing } from "./directListings/read/getListing";
import { directListingsGetTotalCount } from "./directListings/read/getTotalCount";
import { directListingsIsBuyerApprovedForListing } from "./directListings/read/isBuyerApprovedForListing";
import { directListingsIsCurrencyApprovedForListing } from "./directListings/read/isCurrencyApprovedForListing";
import { directListingsApproveBuyerForReservedListing } from "./directListings/write/approveBuyerForReservedListing";
import { directListingsBuyFromListing } from "./directListings/write/buyFromListing";
import { directListingsCancelListing } from "./directListings/write/cancelListing";
import { directListingsCreateListing } from "./directListings/write/createListing";
import { directListingsRevokeBuyerApprovalForReservedListing } from "./directListings/write/revokeBuyerApprovalForReservedListing";
import { directListingsRevokeCurrencyApprovalForListing } from "./directListings/write/revokeCurrencyApprovalForListing";
import { directListingsUpdateListing } from "./directListings/write/updateListing";

import { englishAuctionsGetAll } from "./englishAuctions/read/getAll";
import { englishAuctionsGetAllValid } from "./englishAuctions/read/getAllValid";
import { englishAuctionsGetAuction } from "./englishAuctions/read/getAuction";
import { englishAuctionsGetBidBufferBps } from "./englishAuctions/read/getBidBufferBps";
import { englishAuctionsGetMinimumNextBid } from "./englishAuctions/read/getMinimumNextBid";
import { englishAuctionsGetTotalCount } from "./englishAuctions/read/getTotalCount";
import { englishAuctionsGetWinningBid } from "./englishAuctions/read/getWinningBid";
import { englishAuctionsIsWinningBid } from "./englishAuctions/read/isWinningBid";
import { englishAuctionsBuyoutAuction } from "./englishAuctions/write/buyoutAuction";
import { englishAuctionsCancelAuction } from "./englishAuctions/write/cancelAuction";
import { englishAuctionsCloseAuctionForBidder } from "./englishAuctions/write/closeAuctionForBidder";
import { englishAuctionsCloseAuctionForSeller } from "./englishAuctions/write/closeAuctionForSeller";
import { englishAuctionsCreateAuction } from "./englishAuctions/write/createAuction";
import { englishAuctionsExecuteSale } from "./englishAuctions/write/executeSale";
import { englishAuctionsMakeBid } from "./englishAuctions/write/makeBid";

import { englishAuctionsGetWinner } from "./englishAuctions/read/getWinner";
import { offersGetAll } from "./offers/read/getAll";
import { offersGetAllValid } from "./offers/read/getAllValid";
import { offersGetOffer } from "./offers/read/getOffer";
import { offersGetTotalCount } from "./offers/read/getTotalCount";
import { offersAcceptOffer } from "./offers/write/acceptOffer";
import { offersCancelOffer } from "./offers/write/cancelOffer";
import { offersMakeOffer } from "./offers/write/makeOffer";

export const marketplaceV3Routes = async (fastify: FastifyInstance) => {
  // READ

  // Direct Listings
  await fastify.register(directListingsGetAll);
  await fastify.register(directListingsGetAllValid);
  await fastify.register(directListingsGetListing);
  await fastify.register(directListingsIsBuyerApprovedForListing);
  await fastify.register(directListingsIsCurrencyApprovedForListing);
  await fastify.register(directListingsGetTotalCount);

  // English Auctions
  await fastify.register(englishAuctionsGetAll);
  await fastify.register(englishAuctionsGetAllValid);
  await fastify.register(englishAuctionsGetAuction);
  await fastify.register(englishAuctionsGetBidBufferBps);
  await fastify.register(englishAuctionsGetMinimumNextBid);
  await fastify.register(englishAuctionsGetWinningBid);
  await fastify.register(englishAuctionsGetTotalCount);
  await fastify.register(englishAuctionsIsWinningBid);
  await fastify.register(englishAuctionsGetWinner);

  // Offers
  await fastify.register(offersGetAll);
  await fastify.register(offersGetAllValid);
  await fastify.register(offersGetOffer);
  await fastify.register(offersGetTotalCount);

  // WRITE

  // Direct Listings
  await fastify.register(directListingsCreateListing);
  await fastify.register(directListingsUpdateListing);
  await fastify.register(directListingsBuyFromListing);
  await fastify.register(directListingsApproveBuyerForReservedListing);
  await fastify.register(directListingsRevokeBuyerApprovalForReservedListing);
  await fastify.register(directListingsRevokeCurrencyApprovalForListing);
  await fastify.register(directListingsCancelListing);

  // English Auctions
  await fastify.register(englishAuctionsBuyoutAuction);
  await fastify.register(englishAuctionsCancelAuction);
  await fastify.register(englishAuctionsCreateAuction);
  await fastify.register(englishAuctionsCloseAuctionForBidder);
  await fastify.register(englishAuctionsCloseAuctionForSeller);
  await fastify.register(englishAuctionsExecuteSale);
  await fastify.register(englishAuctionsMakeBid);

  // Offers
  await fastify.register(offersMakeOffer);
  await fastify.register(offersCancelOffer);
  await fastify.register(offersAcceptOffer);
};
