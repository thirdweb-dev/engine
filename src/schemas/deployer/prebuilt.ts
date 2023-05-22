import { Static, Type } from "@sinclair/typebox";
import { prebuiltDeploySchemaTypes } from "../../helpers/sharedApiSchemas";

export const deployPrebuiltRequestBodySchema = Type.Object({
  // TODO need to type this
  contractMetadata: Type.Any({
    description: "Arguments for the deployment.",
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
});

// Adding example for Swagger File
deployPrebuiltRequestBodySchema.examples = [
  {
    contractMetadata: {
      name: `My Contract`,
      description: "Contract deployed from web3 api",
      primary_sale_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      seller_fee_basis_points: 500,
      fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      platform_fee_basis_points: 10,
      platform_fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    },
  },
];

export interface deployPrebuiltSchema extends prebuiltDeploySchemaTypes {
  Body: Static<typeof deployPrebuiltRequestBodySchema>;
}
