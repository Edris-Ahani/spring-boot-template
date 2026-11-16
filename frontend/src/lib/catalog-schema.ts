import { z } from "zod";
import type { components } from "./api.generated";

export const CATALOG_MAX_PAGE = 10000;
export const CATALOG_PAGE_SIZE = 12;

export const catalogItemSchema: z.ZodType<components["schemas"]["CatalogItem"]> = z.object({
  id: z.uuid(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  description: z.string().max(1000),
  createdAt: z.iso.datetime({ offset: true }),
});

export const catalogPageSchema: z.ZodType<components["schemas"]["CatalogPage"]> = z.object({
  items: z.array(catalogItemSchema).max(50),
  page: z.number().int().min(0).max(CATALOG_MAX_PAGE),
  size: z.number().int().min(1).max(50),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type CatalogPage = z.infer<typeof catalogPageSchema>;

export function parsePageNumber(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return 0;
  const number = Number(value);
  return number <= CATALOG_MAX_PAGE ? number : 0;
}

export function catalogPagination(page: number, totalPages: number) {
  return {
    previousPage: page > 0 ? page - 1 : null,
    nextPage: page < CATALOG_MAX_PAGE && page + 1 < totalPages ? page + 1 : null,
  };
}
