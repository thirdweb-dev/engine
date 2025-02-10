import type { FastifyInstance } from "fastify";
import { directListingsGetAll } from "./direct-listings/read/get-all.js";
import { directListingsGetAllValid } from "./direct-listings/read/get-all-valid.js";
import { directListingsGetListing } from "./direct-listings/read/get-listing.js";
import { directListingsGetTotalCount } from "./direct-listings/read/get-total-count.js";
import { directListingsIsBuyerApprovedForListing } from "./direct-listings/read/is-buyer-approved-for-listing.js";
import { directListingsIsCurrencyApprovedForListing } from "./direct-listings/read/is-currency-approved-for-listing.js";
import { directListingsApproveBuyerForReservedListing } from "./direct-listings/write/approve-buyer-for-reserved-listing.js";
import { directListingsBuyFromListing } from "./direct-listings/write/buy-from-listing.js";
import { directListingsCancelListing } from "./direct-listings/write/cancel-listing.js";
import { directListingsCreateListing } from "./direct-listings/write/create-listing.js";
import { directListingsRevokeBuyerApprovalForReservedListing } from "./direct-listings/write/revoke-buyer-approval-for-reserved-listing.js";
import { directListingsRevokeCurrencyApprovalForListing } from "./direct-listings/write/revoke-currency-approval-for-listing.js";
import { directListingsUpdateListing } from "./direct-listings/write/update-listing.js";

import { englishAuctionsGetAll } from "./english-auctions/read/get-all.js";
import { englishAuctionsGetAllValid } from "./english-auctions/read/get-all-valid.js";
import { englishAuctionsGetAuction } from "./english-auctions/read/get-auction.js";
import { englishAuctionsGetBidBufferBps } from "./english-auctions/read/get-bid-buffer-bps.js";
import { englishAuctionsGetMinimumNextBid } from "./english-auctions/read/get-minimum-next-bid.js";
import { englishAuctionsGetTotalCount } from "./english-auctions/read/get-total-count.js";
import { englishAuctionsGetWinningBid } from "./english-auctions/read/get-winning-bid.js";
import { englishAuctionsIsWinningBid } from "./english-auctions/read/is-winning-bid.js";
import { englishAuctionsBuyoutAuction } from "./english-auctions/write/buyout-auction.js";
import { englishAuctionsCancelAuction } from "./english-auctions/write/cancel-auction.js";
import { englishAuctionsCloseAuctionForBidder } from "./english-auctions/write/close-auction-for-bidder.js";
import { englishAuctionsCloseAuctionForSeller } from "./english-auctions/write/close-auction-for-seller.js";
import { englishAuctionsCreateAuction } from "./english-auctions/write/create-auction.js";
import { englishAuctionsExecuteSale } from "./english-auctions/write/execute-sale.js";
import { englishAuctionsMakeBid } from "./english-auctions/write/make-bid.js";

import { englishAuctionsGetWinner } from "./english-auctions/read/get-winner.js";
import { offersGetAll } from "./offers/read/get-all.js";
import { offersGetAllValid } from "./offers/read/get-all-valid.js";
import { offersGetOffer } from "./offers/read/get-offer.js";
import { offersGetTotalCount } from "./offers/read/get-total-count.js";
import { offersAcceptOffer } from "./offers/write/accept-offer.js";
import { offersCancelOffer } from "./offers/write/cancel-offer.js";
import { offersMakeOffer } from "./offers/write/make-offer.js";

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
