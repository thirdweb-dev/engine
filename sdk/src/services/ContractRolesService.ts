/* generated using openapi-typescript-codegen -- do no edit */
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";

export class ContractRolesService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Get wallets for role
   * Get all wallets with a specific role for a contract.
   * @param role The role to list wallet members
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @returns any Default Response
   * @throws ApiError
   */
  public getContractRole(
    role: string,
    chain: string,
    contractAddress: string,
  ): CancelablePromise<{
    result: Array<string>;
  }> {
    return this.httpRequest.request({
      method: "GET",
      url: "/contract/{chain}/{contractAddress}/roles/get",
      path: {
        chain: chain,
        contractAddress: contractAddress,
      },
      query: {
        role: role,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }

  /**
   * Get wallets for all roles
   * Get all wallets in each role for a contract.
   * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
   * @param contractAddress Contract address
   * @returns any Default Response
   * @throws ApiError
   */
  public listContractRoles(
    chain: string,
    contractAddress: string,
  ): CancelablePromise<{
    result: {
      admin: Array<string>;
      transfer: Array<string>;
      minter: Array<string>;
      pauser: Array<string>;
      lister: Array<string>;
      asset: Array<string>;
      unwrap: Array<string>;
      factory: Array<string>;
      signer: Array<string>;
    };
  }> {
    return this.httpRequest.request({
      method: "GET",
      url: "/contract/{chain}/{contractAddress}/roles/get-all",
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
   * Grant role
   * Grant a role to a specific wallet.
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
  public grantContractRole(
    chain: string,
    contractAddress: string,
    xBackendWalletAddress: string,
    requestBody: {
      /**
       * The role to grant
       */
      role: string;
      /**
       * The address to grant the role to
       */
      address: string;
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
      url: "/contract/{chain}/{contractAddress}/roles/grant",
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
   * Revoke role
   * Revoke a role from a specific wallet.
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
  public revokeContractRole(
    chain: string,
    contractAddress: string,
    xBackendWalletAddress: string,
    requestBody: {
      /**
       * The role to revoke
       */
      role: string;
      /**
       * The address to revoke the role from
       */
      address: string;
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
      url: "/contract/{chain}/{contractAddress}/roles/revoke",
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
