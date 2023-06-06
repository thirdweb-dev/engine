import { DirectListingV3, EnglishAuction, OfferV3 } from "@thirdweb-dev/sdk";

export const formatDirectListingV3Result = (listing: DirectListingV3) => {
  return {
    ...listing,
    currencyValuePerToken: {
      ...listing.currencyValuePerToken,
      value: listing.currencyValuePerToken.value.toString(),
    },
  };
};

export const formatEnglishAuctionResult = (listing: EnglishAuction) => {
  return {
    ...listing,
    minimumBidCurrencyValue: {
      ...listing.minimumBidCurrencyValue,
      value: listing.minimumBidCurrencyValue.value.toString(),
    },
    buyoutCurrencyValue: {
      ...listing.buyoutCurrencyValue,
      value: listing.buyoutCurrencyValue.value.toString(),
    },
  };
};

export const formatOffersResult = (offer: OfferV3) => {
  return {
    ...offer,
  };
};
