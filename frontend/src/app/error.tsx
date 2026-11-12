"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="fallback-page"><p className="eyebrow">SOMETHING INTERRUPTED THIS REQUEST</p>
    <h1>Let’s try that again.</h1><p>The page could not be loaded. Your data has not been changed.</p>
    <button className="button button-primary" onClick={reset}>Try again</button></main>;
}
