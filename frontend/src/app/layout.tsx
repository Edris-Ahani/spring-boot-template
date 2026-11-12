import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foundry | Spring + Next Platform",
  description: "A modular application foundation built with Spring Boot, Next.js, and Podman.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
