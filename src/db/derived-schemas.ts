import { createSelectSchema } from "drizzle-zod";
import { transactions } from "./schema";

export const transactionDbEntrySchema = createSelectSchema(transactions);
