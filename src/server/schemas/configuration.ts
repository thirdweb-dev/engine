import { Type, type Static } from "@sinclair/typebox";
import type { ConfigurationDBResult } from "../../db/configuration/db";

export const configurationSchema = Type.Object({
  extraGas: Type.String(),
});

export const toConfigurationSchema = (
  configuration: ConfigurationDBResult,
): Static<typeof configurationSchema> => ({
  extraGas: configuration.extraGas.toString(),
});
