import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Cockpit",
  description: "Personal Nifty and Bank Nifty trading dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

