import { z } from "zod";

/** A permissive-but-validated domain matcher. */
const domainRegex =
  /^(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const domainSchema = z
  .string()
  .trim()
  .min(3, "Domain is too short")
  .max(253, "Domain is too long")
  .regex(domainRegex, "Enter a valid domain, e.g. example.com");

export const appraiseInputSchema = z.object({
  domain: domainSchema,
  fresh: z.boolean().optional(),
});

export type AppraiseInput = z.infer<typeof appraiseInputSchema>;
