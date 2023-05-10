import { z } from "zod";
import { NextFunction } from "express";

interface EnforceSchemaParams<T extends z.ZodSchema> {
  data: any;
  schema: T;
  next: NextFunction;
  error: string;
}

export function enforceSchema<T extends z.ZodSchema>({
  data,
  schema,
  next,
  error,
}: EnforceSchemaParams<T>): z.output<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return next({
      message: error,
      details: parsed.error.issues,
    });
  }

  return parsed.data;
}
