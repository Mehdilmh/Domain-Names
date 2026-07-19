import { z } from "zod";
import { domainSchema } from "./appraise";

/** Public API request body for POST /api/v1/appraise. */
export const apiAppraiseSchema = z.object({
  domain: domainSchema,
});

export type ApiAppraiseInput = z.infer<typeof apiAppraiseSchema>;
