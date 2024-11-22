/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";

export class ContractRoyaltiesService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Get royalty details
   * Gets the royalty recipient and BPS (basis points) of the smart contract.
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @returns any Default Response
   * @throws ApiError
   */
  public getDefaultRoyaltyInfo(
    chain: string,
    contractAddress: string,
  ): CancelablePromise<{
    result: {
      /**
       * The royalty fee in BPS (basis points). 100 = 1%.
       */
      seller_fee_basis_points: number;
      /**
       * The wallet address that will receive the royalty fees.
       */
      fee_recipient: string;
    };
  }> {
    return this.httpRequest.request({
      method: "GET",
      url: "/contract/{chain}/{contractAddress}/royalties/get-default-royalty-info",
      path: {
        chain: chain,
        contractAddress: contractAddress,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }

  /**
   * Get token royalty details
   * Gets the royalty recipient and BPS (basis points) of a particular token in the contract.
   * @param tokenId
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @returns any Default Response
   * @throws ApiError
   */
  public getTokenRoyaltyInfo(
    tokenId: string,
    chain: string,
    contractAddress: string,
  ): CancelablePromise<{
    result: {
      /**
       * The royalty fee in BPS (basis points). 100 = 1%.
       */
      seller_fee_basis_points: number;
      /**
       * The wallet address that will receive the royalty fees.
       */
      fee_recipient: string;
    };
  }> {
    return this.httpRequest.request({
      method: "GET",
      url: "/contract/{chain}/{contractAddress}/royalties/get-token-royalty-info/{tokenId}",
      path: {
        tokenId: tokenId,
        chain: chain,
        contractAddress: contractAddress,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }

  /**
   * Set royalty details
   * Set the royalty recipient and fee for the smart contract.
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @param xBackendWalletAddress Backend wallet address
   * @param requestBody
   * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails
   *   simulation. Note: This step is less performant and recommended only for debugging purposes.
   * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last
   *   100000 transactions are compared.
   * @param xAccountAddress Smart account address
   * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the
   *   contract.
   * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful
   *   when creating multiple accounts with the same admin and only needed when deploying the account as part of a
   *   userop.
   * @returns any Default Response
   * @throws ApiError
   */
  public setDefaultRoyaltyInfo(
    chain: string,
    contractAddress: string,
    xBackendWalletAddress: string,
    requestBody: {
      /**
       * The royalty fee in BPS (basis points). 100 = 1%.
       */
      seller_fee_basis_points: number;
      /**
       * The wallet address that will receive the royalty fees.
       */
      fee_recipient: string;
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
         * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the
         * transaction will be set to 'errored'. Default: no timeout
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
      method: "POST",
      url: "/contract/{chain}/{contractAddress}/royalties/set-default-royalty-info",
      path: {
        chain: chain,
        contractAddress: contractAddress,
      },
      headers: {
        "x-backend-wallet-address": xBackendWalletAddress,
        "x-idempotency-key": xIdempotencyKey,
        "x-account-address": xAccountAddress,
        "x-account-factory-address": xAccountFactoryAddress,
        "x-account-salt": xAccountSalt,
      },
      query: {
        simulateTx: simulateTx,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }

  /**
   * Set token royalty details
   * Set the royalty recipient and fee for a particular token in the contract.
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @param xBackendWalletAddress Backend wallet address
   * @param requestBody
   * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails
   *   simulation. Note: This step is less performant and recommended only for debugging purposes.
   * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last
   *   100000 transactions are compared.
   * @param xAccountAddress Smart account address
   * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the
   *   contract.
   * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful
   *   when creating multiple accounts with the same admin and only needed when deploying the account as part of a
   *   userop.
   * @returns any Default Response
   * @throws ApiError
   */
  public setTokenRoyaltyInfo(
    chain: string,
    contractAddress: string,
    xBackendWalletAddress: string,
    requestBody: {
      /**
       * The royalty fee in BPS (basis points). 100 = 1%.
       */
      seller_fee_basis_points: number;
      /**
       * The wallet address that will receive the royalty fees.
       */
      fee_recipient: string;
      /**
       * The token ID to set the royalty info for.
       */
      token_id: string;
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
         * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the
         * transaction will be set to 'errored'. Default: no timeout
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
      method: "POST",
      url: "/contract/{chain}/{contractAddress}/royalties/set-token-royalty-info",
      path: {
        chain: chain,
        contractAddress: contractAddress,
      },
      headers: {
        "x-backend-wallet-address": xBackendWalletAddress,
        "x-idempotency-key": xIdempotencyKey,
        "x-account-address": xAccountAddress,
        "x-account-factory-address": xAccountFactoryAddress,
        "x-account-salt": xAccountSalt,
      },
      query: {
        simulateTx: simulateTx,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
}
