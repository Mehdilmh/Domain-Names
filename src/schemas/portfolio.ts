import { z } from "zod";
import { domainSchema } from "./appraise";

export const addPortfolioItemSchema = z.object({
  domain: domainSchema,
  renewalCost: z.coerce.number().int().min(0).max(100000).default(12),
  renewsAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const removePortfolioItemSchema = z.object({
  id: z.string().cuid(),
});

export type AddPortfolioItem = z.infer<typeof addPortfolioItemSchema>;
