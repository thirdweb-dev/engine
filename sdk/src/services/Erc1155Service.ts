/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class Erc1155Service {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get details
     * Get the details for a token in an ERC-1155 contract.
     * @param tokenId The tokenId of the NFT to retrieve
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public get(
tokenId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: {
metadata: Record<string, any>;
owner: string;
type: ('ERC1155' | 'ERC721' | 'metaplex');
supply: string;
quantityOwned?: string;
};
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/get',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Get all details
     * Get details for all tokens in an ERC-1155 contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param start The start token ID for paginated results. Defaults to 0.
     * @param count The page count for paginated results. Defaults to 100.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(
chain: string,
contractAddress: string,
start?: number,
count?: number,
): CancelablePromise<{
result: Array<{
metadata: Record<string, any>;
owner: string;
type: ('ERC1155' | 'ERC721' | 'metaplex');
supply: string;
quantityOwned?: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'start': start,
                'count': count,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get owned tokens
     * Get all tokens in an ERC-1155 contract owned by a specific wallet.
     * @param walletAddress Address of the wallet to get NFTs for
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getOwned(
walletAddress: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: Array<{
metadata: Record<string, any>;
owner: string;
type: ('ERC1155' | 'ERC721' | 'metaplex');
supply: string;
quantityOwned?: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/get-owned',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'walletAddress': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get balance
     * Get the balance of a specific wallet address for this ERC-1155 contract.
     * @param walletAddress Address of the wallet to check NFT balance
     * @param tokenId The tokenId of the NFT to check balance of
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public balanceOf(
walletAddress: string,
tokenId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result?: string;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/balance-of',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'walletAddress': walletAddress,
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
     * Check if approved transfers
     * Check if the specific wallet has approved transfers from a specific operator wallet.
     * @param ownerWallet Address of the wallet who owns the NFT
     * @param operator Address of the operator to check approval on
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public isApproved(
ownerWallet: string,
operator: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result?: boolean;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/is-approved',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'ownerWallet': ownerWallet,
                'operator': operator,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get total supply
     * Get the total supply in circulation for this ERC-1155 contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalCount(
chain: string,
contractAddress: string,
): CancelablePromise<{
result?: string;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/total-count',
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
     * Get total supply
     * Get the total supply in circulation for this ERC-1155 contract.
     * @param tokenId The tokenId of the NFT to retrieve
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalSupply(
tokenId: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result?: string;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/total-supply',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Generate signature
     * Generate a signature granting access for another wallet to mint tokens from this ERC-1155 contract. This method is typically called by the token contract owner.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @param xThirdwebSdkVersion Override the thirdweb sdk version used. Example: "5" for v5 SDK compatibility.
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public signatureGenerate(
chain: string,
contractAddress: string,
xBackendWalletAddress?: string,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
xThirdwebSdkVersion?: string,
requestBody?: ({
/**
 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
 */
to: string;
/**
 * The number of tokens this signature can be used to mint.
 */
quantity: string;
metadata: ({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string);
/**
 * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
 */
royaltyRecipient?: string;
/**
 * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
 */
royaltyBps?: number;
/**
 * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
 */
primarySaleRecipient?: string;
/**
 * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
 * Note that the input value gets hashed in the actual payload that gets generated.
 * The smart contract enforces on-chain that no uid gets used more than once,
 * which means you can deterministically generate the uid to prevent specific exploits.
 */
uid?: string;
/**
 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
 */
currencyAddress?: string;
/**
 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
 */
price?: string;
mintStartTime?: (string | number);
mintEndTime?: (string | number);
} | ({
contractType?: ('TokenERC1155' | 'SignatureMintERC1155');
to: string;
quantity: string;
royaltyRecipient?: string;
royaltyBps?: number;
primarySaleRecipient?: string;
/**
 * An amount in native token (decimals allowed). Example: "0.1"
 */
pricePerToken?: string;
/**
 * An amount in wei (no decimals). Example: "50000000000"
 */
pricePerTokenWei?: string;
currency?: string;
validityStartTimestamp: number;
validityEndTimestamp?: number;
uid?: string;
} & ({
metadata: ({
/**
 * The name of the NFT
 */
name?: string;
/**
 * The description of the NFT
 */
description?: string;
/**
 * The image of the NFT
 */
image?: string;
/**
 * The animation url of the NFT
 */
animation_url?: string;
/**
 * The external url of the NFT
 */
external_url?: string;
/**
 * The background color of the NFT
 */
background_color?: string;
/**
 * (not recommended - use "attributes") The properties of the NFT.
 */
properties?: any;
/**
 * Arbitrary metadata for this item.
 */
attributes?: Array<{
trait_type: string;
value: string;
}>;
} | string);
} | {
tokenId: string;
}))),
): CancelablePromise<{
result: ({
payload: {
uri: string;
tokenId: string;
/**
 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
 */
to: string;
/**
 * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
 */
royaltyRecipient: string;
/**
 * The number of tokens this signature can be used to mint.
 */
quantity: string;
/**
 * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
 */
royaltyBps: string;
/**
 * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
 */
primarySaleRecipient: string;
/**
 * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
 * Note that the input value gets hashed in the actual payload that gets generated.
 * The smart contract enforces on-chain that no uid gets used more than once,
 * which means you can deterministically generate the uid to prevent specific exploits.
 */
uid: string;
metadata: ({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string);
/**
 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
 */
currencyAddress: string;
/**
 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
 */
price: string;
/**
 * The time from which the signature can be used to mint tokens. Defaults to now if value not provided.
 */
mintStartTime: number;
/**
 * The time until which the signature can be used to mint tokens. Defaults to 10 years from now.
 */
mintEndTime: number;
};
signature: string;
} | {
payload: {
to: string;
royaltyRecipient: string;
royaltyBps: string;
primarySaleRecipient: string;
tokenId: string;
uri: string;
quantity: string;
pricePerToken: string;
currency: string;
validityStartTimestamp: number;
validityEndTimestamp: number;
uid: string;
};
signature: string;
});
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc1155/signature/generate',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
                'x-thirdweb-sdk-version': xThirdwebSdkVersion,
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
     * Check if tokens are available for claiming
     * Check if tokens are currently available for claiming, optionally specifying if a specific wallet address can claim.
     * @param quantity The amount of tokens to claim.
     * @param tokenId The token ID of the NFT you want to claim.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param addressToCheck The wallet address to check if it can claim tokens. This considers all aspects of the active claim phase, including allowlists, previous claims, etc.
     * @returns any Default Response
     * @throws ApiError
     */
    public canClaim(
quantity: string,
tokenId: string,
chain: string,
contractAddress: string,
addressToCheck?: string,
): CancelablePromise<{
result: boolean;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/can-claim',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'quantity': quantity,
                'tokenId': tokenId,
                'addressToCheck': addressToCheck,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get currently active claim phase for a specific token ID.
     * Retrieve the currently active claim phase for a specific token ID, if any.
     * @param tokenId The token ID of the NFT you want to claim.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param withAllowList Provide a boolean value to include the allowlist in the response.
     * @returns any Default Response
     * @throws ApiError
     */
    public getActiveClaimConditions(
tokenId: (string | number),
chain: string,
contractAddress: string,
withAllowList?: boolean,
): CancelablePromise<{
result: {
maxClaimableSupply?: (string | number);
startTime: string;
price?: (number | string);
/**
 * A contract or wallet address
 */
currencyAddress?: string;
maxClaimablePerWallet?: (number | string);
waitInSeconds?: (number | string);
merkleRootHash: (string | Array<number>);
availableSupply: string;
currentMintSupply: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
currencyMetadata: {
name: string;
symbol: string;
decimals: number;
value: string;
displayValue: string;
};
metadata?: {
name?: string;
};
snapshot?: (null | Array<string>);
};
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/get-active',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'tokenId': tokenId,
                'withAllowList': withAllowList,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all the claim phases configured for a specific token ID.
     * Get all the claim phases configured for a specific token ID.
     * @param tokenId The token ID of the NFT you want to get the claim conditions for.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param withAllowList Provide a boolean value to include the allowlist in the response.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllClaimConditions(
tokenId: (string | number),
chain: string,
contractAddress: string,
withAllowList?: boolean,
): CancelablePromise<{
result: Array<{
maxClaimableSupply?: (string | number);
startTime: string;
price?: (number | string);
/**
 * A contract or wallet address
 */
currencyAddress?: string;
maxClaimablePerWallet?: (number | string);
waitInSeconds?: (number | string);
merkleRootHash: (string | Array<number>);
availableSupply: string;
currentMintSupply: string;
/**
 * The `CurrencyValue` of the listing. Useful for displaying the price information.
 */
currencyMetadata: {
name: string;
symbol: string;
decimals: number;
value: string;
displayValue: string;
};
metadata?: {
name?: string;
};
snapshot?: (null | Array<string>);
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'tokenId': tokenId,
                'withAllowList': withAllowList,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get claimer proofs
     * Returns allowlist information and merkle proofs for a given wallet address. Returns null if no proof is found for the given wallet address.
     * @param tokenId The token ID of the NFT you want to get the claimer proofs for.
     * @param walletAddress The wallet address to get the merkle proofs for.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getClaimerProofs(
tokenId: (string | number),
walletAddress: string,
chain: string,
contractAddress: string,
): CancelablePromise<{
result: (null | {
price?: string;
/**
 * A contract or wallet address
 */
currencyAddress?: string;
/**
 * A contract or wallet address
 */
address: string;
maxClaimable: string;
proof: Array<string>;
});
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/get-claimer-proofs',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'tokenId': tokenId,
                'walletAddress': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get claim ineligibility reasons
     * Get an array of reasons why a specific wallet address is not eligible to claim tokens, if any.
     * @param tokenId The token ID of the NFT you want to check if the wallet address can claim.
     * @param quantity The amount of tokens to claim.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param addressToCheck The wallet address to check if it can claim tokens.
     * @returns any Default Response
     * @throws ApiError
     */
    public getClaimIneligibilityReasons(
tokenId: (string | number),
quantity: string,
chain: string,
contractAddress: string,
addressToCheck?: string,
): CancelablePromise<{
result: Array<(string | ('There is not enough supply to claim.' | 'This address is not on the allowlist.' | 'Not enough time since last claim transaction. Please wait.' | 'Claim phase has not started yet.' | 'You have already claimed the token.' | 'Incorrect price or currency.' | 'Cannot claim more than maximum allowed quantity.' | 'There are not enough tokens in the wallet to pay for the claim.' | 'There is no active claim phase at the moment. Please check back in later.' | 'There is no claim condition set.' | 'No wallet connected.' | 'No claim conditions found.'))>;
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/get-claim-ineligibility-reasons',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'tokenId': tokenId,
                'quantity': quantity,
                'addressToCheck': addressToCheck,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Airdrop tokens
     * Airdrop ERC-1155 tokens to specific wallets.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public airdrop(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Token ID of the NFT to airdrop
 */
tokenId: string;
/**
 * Addresses and quantities to airdrop to
 */
addresses: Array<{
/**
 * A contract or wallet address
 */
address: string;
quantity: string;
}>;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/airdrop',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Burn token
     * Burn ERC-1155 tokens in the caller wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public burn(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * The token ID to burn
 */
tokenId: string;
/**
 * The amount of tokens to burn
 */
amount: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/burn',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Burn tokens (batch)
     * Burn a batch of ERC-1155 tokens in the caller wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public burnBatch(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
tokenIds: Array<string>;
amounts: Array<string>;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/burn-batch',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Claim tokens to wallet
     * Claim ERC-1155 tokens to a specific wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public claimTo(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Address of the wallet to claim the NFT to
 */
receiver: string;
/**
 * Token ID of the NFT to claim
 */
tokenId: string;
/**
 * Quantity of NFTs to mint
 */
quantity: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-to',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Lazy mint
     * Lazy mint ERC-1155 tokens to be claimed in the future.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public lazyMint(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
metadatas: Array<({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string)>;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/lazy-mint',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Mint additional supply
     * Mint additional supply of ERC-1155 tokens to a specific wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public mintAdditionalSupplyTo(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Address of the wallet to mint the NFT to
 */
receiver: string;
/**
 * Token ID to mint additional supply to
 */
tokenId: string;
/**
 * The amount of supply to mint
 */
additionalSupply: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/mint-additional-supply-to',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Mint tokens (batch)
     * Mint ERC-1155 tokens to multiple wallets in one transaction.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public mintBatchTo(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Address of the wallet to mint the NFT to
 */
receiver: string;
metadataWithSupply: Array<{
metadata: ({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string);
supply: string;
}>;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/mint-batch-to',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Mint tokens
     * Mint ERC-1155 tokens to a specific wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public mintTo(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Address of the wallet to mint the NFT to
 */
receiver: string;
metadataWithSupply: {
metadata: ({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string);
supply: string;
};
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/mint-to',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Set approval for all
     * Approve or remove operator as an operator for the caller. Operators can call transferFrom or safeTransferFrom for any token owned by the caller.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public setApprovalForAll(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Address of the operator to give approval to
 */
operator: string;
/**
 * whether to approve or revoke approval
 */
approved: boolean;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/set-approval-for-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Transfer token
     * Transfer an ERC-1155 token from the caller wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public transfer(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * The recipient address.
 */
to: string;
/**
 * The token ID to transfer.
 */
tokenId: string;
/**
 * The amount of tokens to transfer.
 */
amount: string;
/**
 * A valid hex string
 */
data?: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/transfer',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Transfer token from wallet
     * Transfer an ERC-1155 token from the connected wallet to another wallet. Requires allowance.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress ERC1155 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public transferFrom(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * The sender address.
 */
from: string;
/**
 * The recipient address.
 */
to: string;
/**
 * The token ID to transfer.
 */
tokenId: string;
/**
 * The amount of tokens to transfer.
 */
amount: string;
/**
 * A valid hex string
 */
data?: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/transfer-from',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Signature mint
     * Mint ERC-1155 tokens from a generated signature.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public signatureMint(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
payload: {
uri: string;
tokenId: string;
/**
 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
 */
to: string;
/**
 * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
 */
royaltyRecipient: string;
/**
 * The number of tokens this signature can be used to mint.
 */
quantity: string;
/**
 * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
 */
royaltyBps: string;
/**
 * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
 */
primarySaleRecipient: string;
/**
 * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
 * Note that the input value gets hashed in the actual payload that gets generated.
 * The smart contract enforces on-chain that no uid gets used more than once,
 * which means you can deterministically generate the uid to prevent specific exploits.
 */
uid: string;
metadata: ({
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
} | string);
/**
 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
 */
currencyAddress: string;
/**
 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
 */
price: string;
/**
 * The time from which the signature can be used to mint tokens. Defaults to now if value not provided.
 */
mintStartTime: number;
/**
 * The time until which the signature can be used to mint tokens. Defaults to 10 years from now.
 */
mintEndTime: number;
};
signature: string;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/signature/mint',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Overwrite the claim conditions for a specific token ID..
     * Overwrite the claim conditions for a specific token ID. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public setClaimConditions(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * ID of the token to set the claim conditions for
 */
tokenId: (string | number);
claimConditionInputs: Array<{
maxClaimableSupply?: (string | number);
startTime?: (string | number);
price?: (number | string);
/**
 * A contract or wallet address
 */
currencyAddress?: string;
maxClaimablePerWallet?: (number | string);
waitInSeconds?: (number | string);
merkleRootHash?: (string | Array<number>);
metadata?: {
name?: string;
};
snapshot?: (Array<string> | null);
}>;
resetClaimEligibilityForAll?: boolean;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/set',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Overwrite the claim conditions for a specific token ID..
     * Allows you to set claim conditions for multiple token IDs in a single transaction.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public claimConditionsUpdate(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
claimConditionsForToken: Array<{
/**
 * ID of the token to set the claim conditions for
 */
tokenId: (string | number);
claimConditions: Array<{
maxClaimableSupply?: (string | number);
startTime?: (string | number);
price?: (number | string);
/**
 * A contract or wallet address
 */
currencyAddress?: string;
maxClaimablePerWallet?: (number | string);
waitInSeconds?: (number | string);
merkleRootHash?: (string | Array<number>);
metadata?: {
name?: string;
};
snapshot?: (Array<string> | null);
}>;
}>;
resetClaimEligibilityForAll?: boolean;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/set-batch',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Update a single claim phase.
     * Update a single claim phase on a specific token ID, by providing the index of the claim phase and the new phase configuration.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public updateClaimConditions(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Token ID to update claim phase for
 */
tokenId: (string | number);
claimConditionInput: {
maxClaimableSupply?: (string | number);
startTime?: (string | number);
price?: (number | string);
/**
 * A contract or wallet address
 */
currencyAddress?: string;
maxClaimablePerWallet?: (number | string);
waitInSeconds?: (number | string);
merkleRootHash?: (string | Array<number>);
metadata?: {
name?: string;
};
snapshot?: (Array<string> | null);
};
/**
 * Index of the claim condition to update
 */
index: number;
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/claim-conditions/update',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Update token metadata
     * Update the metadata for an ERC1155 token.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody 
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public updateTokenMetadata(
chain: string,
contractAddress: string,
xBackendWalletAddress: string,
requestBody: {
/**
 * Token ID to update metadata
 */
tokenId: string;
metadata: {
/**
 * The name of the NFT
 */
name?: (string | number | null);
/**
 * The description of the NFT
 */
description?: (string | null);
/**
 * The image of the NFT
 */
image?: (string | null);
/**
 * The external url of the NFT
 */
external_url?: (string | null);
/**
 * The animation url of the NFT
 */
animation_url?: (string | null);
/**
 * The properties of the NFT
 */
properties?: any;
/**
 * The attributes of the NFT
 */
attributes?: any;
/**
 * The background color of the NFT
 */
background_color?: (string | null);
};
txOverrides?: {
/**
 * Gas limit for the transaction
 */
gas?: string;
/**
 * Maximum fee per gas
 */
maxFeePerGas?: string;
/**
 * Maximum priority fee per gas
 */
maxPriorityFeePerGas?: string;
/**
 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
 */
timeoutSeconds?: number;
/**
 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
 */
value?: string;
};
},
simulateTx: boolean = false,
xIdempotencyKey?: string,
xAccountAddress?: string,
xAccountFactoryAddress?: string,
xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/erc1155/token/update',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
