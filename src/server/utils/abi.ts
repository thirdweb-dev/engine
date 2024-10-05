import type { Abi } from "thirdweb/utils";
import type { AbiSchemaType } from "../schemas/contract";

export function sanitizeAbi(abi: AbiSchemaType | undefined): Abi | undefined {
  if (!abi) return undefined;
  return abi.map((item) => {
    if (item.type === "function") {
      return {
        ...item,
        // older versions of engine allowed passing in empty inputs/outputs, but necesasry for abi validation
        inputs: item.inputs || [],
        outputs: item.outputs || [],
      };
    }
    return item;
  }) as Abi;
}
