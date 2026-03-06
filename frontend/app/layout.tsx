import type { Metadata } from "next";
import "./globals.css";
import WarmupPing from "@/components/WarmupPing";

export const metadata: Metadata = {
  title: "SapioCode - Intelligent Learning Platform",
  description: "Learn to code with AI-powered Socratic tutoring",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "SapioCode",
    description: "AI-powered Socratic tutoring for learning to code",
    siteName: "SapioCode",
    type: "website",
  },
};

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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0d130e] text-slate-100">
        <WarmupPing />
        {children}
      </body>
    </html>
  );
}
