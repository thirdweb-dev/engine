import { Static, Type } from "@sinclair/typebox";
import { publishedDeploySchemaTypes } from "../../helpers/sharedApiSchemas";

export const deployPublishedRequestBodySchema = Type.Object({
  constructorParams: Type.Array(Type.Any(), {
    description: "Constructor arguments for the deployment.",
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
});

// Adding example for Swagger File
deployPublishedRequestBodySchema.examples = [
  {
    constructorParams: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export interface deployPublishedSchema extends publishedDeploySchemaTypes {
  Body: Static<typeof deployPublishedRequestBodySchema>;
}
