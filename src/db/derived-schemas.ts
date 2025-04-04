import { createSelectSchema } from "drizzle-zod";
import { tokens, transactions } from "./schema.js";

export const transactionDbEntrySchema = createSelectSchema(transactions);
export const accessTokenDbEntrySchema = createSelectSchema(tokens);
