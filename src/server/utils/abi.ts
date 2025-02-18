import type { Abi } from "thirdweb/utils";
import type { AbiSchemaType } from "../schemas/contract";

export function sanitizeAbi(abi: AbiSchemaType | undefined): Abi | undefined {
  if (!abi) {
    return undefined;
  }

  return abi.map((item) => {
    if (item.type === "function") {
      return {
        ...item,
        // older versions of engine allowed passing in empty inputs/outputs, but necessary for abi validation
        inputs: item.inputs || [],
        outputs: item.outputs || [],
      };
    }
    return item;
  }) as Abi;
}

export const sanitizeFunctionName = (val: string) =>
  val.includes("(") && !val.startsWith("function ") ? `function ${val}` : val;
