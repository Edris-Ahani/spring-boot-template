import Link from "next/link";
import { BackendFailure, getCatalog } from "@/lib/backend";
import { catalogPagination } from "@/lib/catalog-schema";
import { RefreshButton } from "./refresh-button";

export async function CatalogPanel({ page }: { page: number }) {
  let catalog;
  try {
    catalog = await getCatalog(page);
  } catch (error) {
    const requestId = error instanceof BackendFailure ? error.requestId : undefined;
    return <section className="empty-state" aria-labelledby="catalog-unavailable">
      <div className="empty-icon" aria-hidden="true">↗</div>
      <h3 id="catalog-unavailable">Catalog temporarily unavailable</h3>
      <p>Try refreshing. If the problem continues, contact support.</p>
      {requestId ? <p>Reference: <code>{requestId}</code></p> : null}
      <RefreshButton />
    </section>;
  }

  if (catalog.items.length === 0) {
    return <section className="empty-state" aria-labelledby="catalog-empty">
      <div className="empty-icon" aria-hidden="true">◇</div>
      <h3 id="catalog-empty">{page > 0 ? "No items on this page" : "A clean slate, ready for your first item"}</h3>
      <p>{page > 0 ? "Return to the first page to browse the catalog." : "Create an item through the authenticated catalog API. It will appear here immediately."}</p>
      {page > 0 ? <Link className="button button-secondary" href="/">First page</Link> : <code className="endpoint">POST /api/v1/catalog</code>}
    </section>;
  }

  const { previousPage, nextPage } = catalogPagination(page, catalog.totalPages);
  return <>
    <div className="catalog-grid">{catalog.items.map((item) => <article className="catalog-card" key={item.id}>
      <span className="item-icon" aria-hidden="true">◇</span>
      <span className="eyebrow">{item.slug}</span>
      <h3>{item.name}</h3>
      <p>{item.description || "No description provided."}</p>
      <time dateTime={item.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.createdAt))}</time>
    </article>)}</div>
    <nav className="pagination" aria-label="Catalog pagination">
      <span>{catalog.totalElements} items · Page {page + 1} of {catalog.totalPages}</span>
      <div>{previousPage !== null ? <Link className="button button-secondary" href={`/?page=${previousPage}`}>Previous</Link> : null}
        {nextPage !== null ? <Link className="button button-secondary" href={`/?page=${nextPage}`}>Next</Link> : null}</div>
    </nav>
  </>;
}
