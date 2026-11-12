import { Suspense } from "react";
import Link from "next/link";
import { CatalogPanel } from "@/components/catalog-panel";
import { RefreshButton } from "@/components/refresh-button";
import { backendReady } from "@/lib/backend";
import { parsePageNumber } from "@/lib/catalog-schema";

export const dynamic = "force-dynamic";

async function ApiStatus() {
  const ready = await backendReady();
  return <span className={`status ${ready ? "status-ready" : "status-offline"}`}><span />{ready ? "API ready" : "API unavailable"}</span>;
}

const capabilities = [
  { number: "01", label: "Application", title: "Clear boundaries.", detail: "Spring Boot · Feature modules · Explicit contracts", symbol: "⌘" },
  { number: "02", label: "Experience", title: "Server first.", detail: "Next.js · React Server Components · TypeScript", symbol: "↗" },
  { number: "03", label: "Infrastructure", title: "Own your runtime.", detail: "Podman · PostgreSQL · OpenID Connect", symbol: "◇" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page: pageQuery } = await searchParams;
  const page = parsePageNumber(pageQuery);
  return <div className="shell">
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">f</span>foundry<span className="brand-dot">.</span></Link>
      <div className="workspace"><span className="workspace-icon" aria-hidden="true">P</span><div>Platform workspace<small>Application foundation</small></div></div>
      <p className="nav-label">WORKSPACE</p>
      <nav><Link className="nav-item active" href="/" aria-current="page"><span aria-hidden="true">▦</span>Overview</Link>
        <a className="nav-item" href="#catalog"><span aria-hidden="true">◇</span>Catalog</a>
        <a className="nav-item" href="/api/health/readiness"><span aria-hidden="true">⌁</span>Readiness</a></nav>
      <div className="sidebar-footer"><span className="small-mark" aria-hidden="true">↗</span><p>Built to be yours.<small>A foundation you can understand.</small></p></div>
    </aside>
    <div className="content">
      <header className="topbar"><span>Workspace <span className="breadcrumb-separator">/</span> <strong>Overview</strong></span>
        <Suspense fallback={<span className="status">Checking API…</span>}><ApiStatus /></Suspense></header>
      <main id="main">
        <section className="hero"><div className="eyebrow"><span className="accent-line" /> THE START OF SOMETHING SOLID</div>
          <h1>Good ideas deserve<br />a strong <span>foundation.</span></h1>
          <p>Your application, without the infrastructure guesswork.<br className="desktop-break" /> One workspace. Clear contracts. Room to build.</p>
          <a className="button button-primary" href="#catalog">Explore your catalog <span aria-hidden="true">↗</span></a>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-core">f<span>.</span></div><span className="art-label art-label-top">DESIGNED TO EVOLVE</span><span className="art-label art-label-bottom">SPRING + NEXT</span></div>
        </section>
        <section className="capabilities" aria-label="Platform architecture">{capabilities.map((item) => <article className="capability" key={item.number}>
          <div className="capability-top"><span>{item.number} / {item.label}</span><span className="capability-symbol" aria-hidden="true">{item.symbol}</span></div>
          <h2>{item.title}</h2><p>{item.detail}</p>
        </article>)}</section>
        <section id="catalog" className="catalog-section" aria-labelledby="catalog-heading">
          <div className="section-heading"><div><span className="eyebrow">YOUR FIRST VERTICAL SLICE</span><h2 id="catalog-heading">The catalog</h2><p>Real data, from your API to your interface.</p></div><RefreshButton /></div>
          <Suspense key={page} fallback={<div className="empty-state" role="status">Loading your catalog…</div>}><CatalogPanel page={page} /></Suspense>
        </section>
        <footer className="main-footer"><span>Foundry / Application foundation</span><span>Made for what comes next <span aria-hidden="true">↗</span></span></footer>
      </main>
    </div>
  </div>;
}
