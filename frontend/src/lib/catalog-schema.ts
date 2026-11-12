import { z } from "zod";
import type { components } from "./api.generated";

export const catalogItemSchema: z.ZodType<components["schemas"]["CatalogItem"]> = z.object({
  id: z.uuid(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  description: z.string().max(1000),
  createdAt: z.iso.datetime({ offset: true }),
});

export const catalogPageSchema: z.ZodType<components["schemas"]["CatalogPage"]> = z.object({
  items: z.array(catalogItemSchema).max(50),
  page: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(50),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type CatalogPage = z.infer<typeof catalogPageSchema>;

export function parsePageNumber(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return 0;
  const number = Number(value);
  return number <= 10000 ? number : 0;
}
