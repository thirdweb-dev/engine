/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class MarketplaceEnglishAuctionsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all English auctions
     * Get all English auction listings on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param seller Being sold by this Address
     * @param start Start from this index (pagination)
     * @param tokenContract Token contract address to show NFTs from
     * @param tokenId Only show NFTs with this ID
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllEnglishAuctions(
chain: string,
contractAddress: string,
count?: number,
seller?: string,
start?: number,
tokenContract?: string,
tokenId?: string,
): CancelablePromise<{
result: Array<{
/**
 * The address of the asset being listed.
 */
assetContractAddress: string;
/**
 * The ID of the token to list.
 */
tokenId: string;
/**
 * The address of the currency to accept for the listing.
 */
currencyContractAddress?: string;
/**
 * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
 */
quantity?: string;
/**
 * The listing ID.
 */
id: string;
/**
 * The minimum price that a bid must be in order to be accepted.
 */
minimumBidAmount?: string;
/**
 * The buyout price of the auction.
 */
buyoutBidAmount: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
buyoutCurrencyValue: {
name?: string;
symbol?: string;
decimals?: number;
value?: string;
displayValue?: string;
};
/**
 * This is a buffer e.g. x seconds.
 */
timeBufferInSeconds: number;
/**
 * To be considered as a new winning bid, a bid must be at least x% greater than the previous bid.
 */
bidBufferBps: number;
/**
 * The start time of the auction.
 */
startTimeInSeconds: number;
/**
 * The end time of the auction.
 */
endTimeInSeconds: number;
asset?: Record<string, any>;
status?: (0 | 1 | 2 | 3 | 4 | 5);
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'seller': seller,
                'start': start,
                'tokenContract': tokenContract,
                'tokenId': tokenId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all valid English auctions
     * Get all valid English auction listings on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param seller Being sold by this Address
     * @param start Start from this index (pagination)
     * @param tokenContract Token contract address to show NFTs from
     * @param tokenId Only show NFTs with this ID
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllValidEnglishAuctions(
chain: string,
contractAddress: string,
count?: number,
seller?: string,
start?: number,
tokenContract?: string,
tokenId?: string,
): CancelablePromise<{
result: Array<{
/**
 * The address of the asset being listed.
 */
assetContractAddress: string;
/**
 * The ID of the token to list.
 */
tokenId: string;
/**
 * The address of the currency to accept for the listing.
 */
currencyContractAddress?: string;
/**
 * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
 */
quantity?: string;
/**
 * The listing ID.
 */
id: string;
/**
 * The minimum price that a bid must be in order to be accepted.
 */
minimumBidAmount?: string;
/**
 * The buyout price of the auction.
 */
buyoutBidAmount: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
buyoutCurrencyValue: {
name?: string;
symbol?: string;
decimals?: number;
value?: string;
displayValue?: string;
};
/**
 * This is a buffer e.g. x seconds.
 */
timeBufferInSeconds: number;
/**
 * To be considered as a new winning bid, a bid must be at least x% greater than the previous bid.
 */
bidBufferBps: number;
/**
 * The start time of the auction.
 */
startTimeInSeconds: number;
/**
 * The end time of the auction.
 */
endTimeInSeconds: number;
asset?: Record<string, any>;
status?: (0 | 1 | 2 | 3 | 4 | 5);
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-all-valid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'seller': seller,
                'start': start,
                'tokenContract': tokenContract,
                'tokenId': tokenId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get English auction
     * Get a specific English auction listing on this marketplace contract.
     * @param listingId The id of the listing to retrieve.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuction(
listingId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: {
/**
 * The address of the asset being listed.
 */
assetContractAddress: string;
/**
 * The ID of the token to list.
 */
tokenId: string;
/**
 * The address of the currency to accept for the listing.
 */
currencyContractAddress?: string;
/**
 * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
 */
quantity?: string;
/**
 * The listing ID.
 */
id: string;
/**
 * The minimum price that a bid must be in order to be accepted.
 */
minimumBidAmount?: string;
/**
 * The buyout price of the auction.
 */
buyoutBidAmount: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
buyoutCurrencyValue: {
name?: string;
symbol?: string;
decimals?: number;
value?: string;
displayValue?: string;
};
/**
 * This is a buffer e.g. x seconds.
 */
timeBufferInSeconds: number;
/**
 * To be considered as a new winning bid, a bid must be at least x% greater than the previous bid.
 */
bidBufferBps: number;
/**
 * The start time of the auction.
 */
startTimeInSeconds: number;
/**
 * The end time of the auction.
 */
endTimeInSeconds: number;
asset?: Record<string, any>;
status?: (0 | 1 | 2 | 3 | 4 | 5);
};
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-auction',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get bid buffer BPS
     * Get the basis points of the bid buffer.
 * This is the percentage higher that a new bid must be than the current highest bid in order to be placed.
 * If there is no current bid, the bid must be at least the minimum bid amount.
 * Returns the value in percentage format, e.g. 100 = 1%.
     * @param listingId The id of the listing to retrieve.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuctionsBidBufferBps(
listingId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
/**
 * Returns a number representing the basis points of the bid buffer.
 */
result: number;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-bid-buffer-bps',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get minimum next bid
     * Helper function to calculate the value that the next bid must be in order to be accepted.
 * If there is no current bid, the bid must be at least the minimum bid amount.
 * If there is a current bid, the bid must be at least the current bid amount + the bid buffer.
     * @param listingId The id of the listing to retrieve.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuctionsMinimumNextBid(
listingId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
result: {
name: string;
symbol: string;
decimals: number;
value: string;
displayValue: string;
};
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-minimum-next-bid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get winning bid
     * Get the current highest bid of an active auction.
     * @param listingId The ID of the listing to retrieve the winner for.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuctionsWinningBid(
listingId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result?: {
/**
 * The id of the auction.
 */
auctionId?: string;
/**
 * The address of the buyer who made the offer.
 */
bidderAddress?: string;
/**
 * The currency contract address of the offer token.
 */
currencyContractAddress?: string;
/**
 * The amount of coins offered per token.
 */
bidAmount?: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
bidAmountCurrencyValue?: {
name?: string;
symbol?: string;
decimals?: number;
value?: string;
displayValue?: string;
};
};
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-winning-bid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get total listings
     * Get the count of English auction listings on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuctionsTotalCount(
chain: string,
contractAddress: string,
): CancelablePromise<{
result: string;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-total-count',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Check winning bid
     * Check if a bid is or will be the winning bid for an auction.
     * @param listingId The ID of the listing to retrieve the winner for.
     * @param bidAmount The amount of the bid to check if it is the winning bid.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public isEnglishAuctionsWinningBid(
listingId: string,
bidAmount: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: boolean;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/is-winning-bid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
                'bidAmount': bidAmount,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get winner
     * Get the winner of an English auction. Can only be called after the auction has ended.
     * @param listingId The ID of the listing to retrieve the winner for.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEnglishAuctionsWinner(
listingId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: string;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/get-winner',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Buyout English auction
     * Buyout the listing for this auction.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public buyoutEnglishAuction(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to buy NFT(s) from.
 */
listingId: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/buyout-auction',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Cancel English auction
     * Cancel an existing auction listing. Only the creator of the listing can cancel it. Auctions cannot be canceled once a bid has been made.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public cancelEnglishAuction(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to cancel auction.
 */
listingId: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/cancel-auction',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Create English auction
     * Create an English auction listing on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public createEnglishAuction(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The address of the asset being listed.
 */
assetContractAddress: string;
/**
 * The ID of the token to list.
 */
tokenId: string;
/**
 * The address of the currency to accept for the listing.
 */
currencyContractAddress?: string;
/**
 * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
 */
quantity?: string;
/**
 * The start time of the listing. If not set, defaults to now.
 */
startTimestamp?: number;
/**
 * The end time of the listing. If not set, defaults to 7 days from now.
 */
endTimestamp?: number;
/**
 * amount to buy the NFT and close the listing.
 */
buyoutBidAmount: string;
/**
 * Minimum amount that bids must be to placed
 */
minimumBidAmount: string;
/**
 * percentage the next bid must be higher than the current highest bid (default is contract-level bid buffer bps)
 */
bidBufferBps?: string;
/**
 * time in seconds that are added to the end time when a bid is placed (default is contract-level time buffer in seconds)
 */
timeBufferInSeconds?: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/create-auction',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Close English auction for bidder
     * After an auction has concluded (and a buyout did not occur),
 * execute the sale for the buyer, meaning the buyer receives the NFT(s).
 * You must also call closeAuctionForSeller to execute the sale for the seller,
 * meaning the seller receives the payment from the highest bid.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public closeEnglishAuctionForBidder(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to execute the sale for.
 */
listingId: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/close-auction-for-bidder',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Close English auction for seller
     * After an auction has concluded (and a buyout did not occur),
 * execute the sale for the seller, meaning the seller receives the payment from the highest bid.
 * You must also call closeAuctionForBidder to execute the sale for the buyer, meaning the buyer receives the NFT(s).
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public closeEnglishAuctionForSeller(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to execute the sale for.
 */
listingId: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/close-auction-for-seller',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Execute sale
     * Close the auction for both buyer and seller.
 * This means the NFT(s) will be transferred to the buyer and the seller will receive the funds.
 * This function can only be called after the auction has ended.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public executeEnglishAuctionSale(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to execute the sale for.
 */
listingId: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/execute-sale',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Make bid
     * Place a bid on an English auction listing.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @returns any Default Response
     * @throws ApiError
     */
    public makeEnglishAuctionBid(
chain: string,
contractAddress: string,
requestBody: {
/**
 * The ID of the listing to place a bid on.
 */
listingId: string;
/**
 * The amount of the bid to place in the currency of the listing. Use getNextBidAmount to get the minimum amount for the next bid.
 */
bidAmount: string;
},
simulateTx: boolean = false,
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/marketplace/{chain}/{contractAddress}/english-auctions/make-bid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'simulateTx': simulateTx,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
