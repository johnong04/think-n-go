import type { Metadata } from "next";
import "./globals.css";
import { Geist, Bricolage_Grotesque, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
const instrument = Instrument_Serif({ subsets: ["latin"], variable: "--font-editorial", weight: ["400"], style: ["italic"] });

export const metadata: Metadata = {
  title: "Think 'n Go Command Center",
  description: "Agentic supply chain and liquidity dashboard for Malaysian MSMEs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(geist.variable, bricolage.variable, jetbrains.variable, instrument.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
