import { createSelectSchema } from "drizzle-zod";
import { tokens, transactions } from "./schema";

export const transactionDbEntrySchema = createSelectSchema(transactions);
export const accessTokenDbEntrySchema = createSelectSchema(tokens);
