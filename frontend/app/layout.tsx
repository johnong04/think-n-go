import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think 'n Go Command Center",
  description: "Agentic supply chain and liquidity dashboard for Malaysian MSMEs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
