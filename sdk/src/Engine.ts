/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from "./core/BaseHttpRequest";
import type { OpenAPIConfig } from "./core/OpenAPI";
import { FetchHttpRequest } from "./core/FetchHttpRequest";

import { AccessTokensService } from "./services/AccessTokensService";
import { AccountService } from "./services/AccountService";
import { AccountFactoryService } from "./services/AccountFactoryService";
import { BackendWalletService } from "./services/BackendWalletService";
import { ChainService } from "./services/ChainService";
import { ConfigurationService } from "./services/ConfigurationService";
import { ContractService } from "./services/ContractService";
import { ContractEventsService } from "./services/ContractEventsService";
import { ContractMetadataService } from "./services/ContractMetadataService";
import { ContractRolesService } from "./services/ContractRolesService";
import { ContractRoyaltiesService } from "./services/ContractRoyaltiesService";
import { ContractSubscriptionsService } from "./services/ContractSubscriptionsService";
import { DefaultService } from "./services/DefaultService";
import { DeployService } from "./services/DeployService";
import { Erc1155Service } from "./services/Erc1155Service";
import { Erc20Service } from "./services/Erc20Service";
import { Erc721Service } from "./services/Erc721Service";
import { KeypairService } from "./services/KeypairService";
import { MarketplaceDirectListingsService } from "./services/MarketplaceDirectListingsService";
import { MarketplaceEnglishAuctionsService } from "./services/MarketplaceEnglishAuctionsService";
import { MarketplaceOffersService } from "./services/MarketplaceOffersService";
import { PermissionsService } from "./services/PermissionsService";
import { RelayerService } from "./services/RelayerService";
import { TransactionService } from "./services/TransactionService";
import { WebhooksService } from "./services/WebhooksService";

type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;

export class Engine {
  public readonly accessTokens: AccessTokensService;
  public readonly account: AccountService;
  public readonly accountFactory: AccountFactoryService;
  public readonly backendWallet: BackendWalletService;
  public readonly chain: ChainService;
  public readonly configuration: ConfigurationService;
  public readonly contract: ContractService;
  public readonly contractEvents: ContractEventsService;
  public readonly contractMetadata: ContractMetadataService;
  public readonly contractRoles: ContractRolesService;
  public readonly contractRoyalties: ContractRoyaltiesService;
  public readonly contractSubscriptions: ContractSubscriptionsService;
  public readonly default: DefaultService;
  public readonly deploy: DeployService;
  public readonly erc1155: Erc1155Service;
  public readonly erc20: Erc20Service;
  public readonly erc721: Erc721Service;
  public readonly keypair: KeypairService;
  public readonly marketplaceDirectListings: MarketplaceDirectListingsService;
  public readonly marketplaceEnglishAuctions: MarketplaceEnglishAuctionsService;
  public readonly marketplaceOffers: MarketplaceOffersService;
  public readonly permissions: PermissionsService;
  public readonly relayer: RelayerService;
  public readonly transaction: TransactionService;
  public readonly webhooks: WebhooksService;

  public readonly request: BaseHttpRequest;

  constructor(
    config?: Partial<OpenAPIConfig>,
    HttpRequest: HttpRequestConstructor = FetchHttpRequest,
  ) {
    this.request = new HttpRequest({
      BASE: config?.BASE ?? "",
      VERSION: config?.VERSION ?? "1.0.0",
      WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
      CREDENTIALS: config?.CREDENTIALS ?? "include",
      TOKEN: config?.TOKEN,
      USERNAME: config?.USERNAME,
      PASSWORD: config?.PASSWORD,
      HEADERS: config?.HEADERS,
      ENCODE_PATH: config?.ENCODE_PATH,
    });

    this.accessTokens = new AccessTokensService(this.request);
    this.account = new AccountService(this.request);
    this.accountFactory = new AccountFactoryService(this.request);
    this.backendWallet = new BackendWalletService(this.request);
    this.chain = new ChainService(this.request);
    this.configuration = new ConfigurationService(this.request);
    this.contract = new ContractService(this.request);
    this.contractEvents = new ContractEventsService(this.request);
    this.contractMetadata = new ContractMetadataService(this.request);
    this.contractRoles = new ContractRolesService(this.request);
    this.contractRoyalties = new ContractRoyaltiesService(this.request);
    this.contractSubscriptions = new ContractSubscriptionsService(this.request);
    this.default = new DefaultService(this.request);
    this.deploy = new DeployService(this.request);
    this.erc1155 = new Erc1155Service(this.request);
    this.erc20 = new Erc20Service(this.request);
    this.erc721 = new Erc721Service(this.request);
    this.keypair = new KeypairService(this.request);
    this.marketplaceDirectListings = new MarketplaceDirectListingsService(
      this.request,
    );
    this.marketplaceEnglishAuctions = new MarketplaceEnglishAuctionsService(
      this.request,
    );
    this.marketplaceOffers = new MarketplaceOffersService(this.request);
    this.permissions = new PermissionsService(this.request);
    this.relayer = new RelayerService(this.request);
    this.transaction = new TransactionService(this.request);
    this.webhooks = new WebhooksService(this.request);
  }
}
