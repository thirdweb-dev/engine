import { Type } from "@sinclair/typebox";

export const PaginationSchema = Type.Object({
  page: Type.Integer({
    description: "Specify the page number.",
    examples: [1],
    default: 1,
    minimum: 1,
  }),
  limit: Type.Integer({
    description: "Specify the number of results to return per page.",
    examples: [100],
    default: 100,
  }),
});
