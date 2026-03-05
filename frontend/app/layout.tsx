import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SapioCode - Intelligent Learning Platform",
  description: "Learn to code with AI-powered Socratic tutoring",
};

// Warm up Render free-tier backends (they sleep after 15min idle)
if (typeof window !== "undefined") {
  const AUTH = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
  const AI   = (process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8003/api").replace(/\/api$/, "");
  fetch(`${AUTH}/health`).catch(() => {});
  fetch(`${AI}/api/health`).catch(() => {});
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0d130e] text-slate-100">{children}</body>
    </html>
  );
}
