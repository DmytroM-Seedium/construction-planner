import { z } from "zod";

/** Fills legacy / invalid sync rows so `nonEmptyTrimmedString` validation can succeed. */
export const LEGACY_SYNC_PLACEHOLDER = "\u2014";

export const nonEmptyTrimmedString = z
  .string()
  .refine((s) => s.trim().length > 0, "Must not be empty");

/** Trims leading/trailing whitespace; empty string is allowed. */
export const trimmedString = z.string().transform((s) => s.trim());
