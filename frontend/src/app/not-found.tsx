import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="fallback-page"><p className="eyebrow">404 / PAGE NOT FOUND</p>
    <h1>No foundation here yet.</h1><Link className="button button-primary" href="/">Back to overview</Link></main>;
}
