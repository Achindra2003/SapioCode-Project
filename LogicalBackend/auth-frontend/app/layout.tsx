import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SapioCode | Authentication",
    description: "Secure login and registration for SapioCode",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="bg-gray-50 min-h-screen text-gray-900 font-sans">
                {children}
            </body>
        </html>
    );
}
