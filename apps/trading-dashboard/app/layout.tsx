import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Cockpit",
  description: "Personal Nifty and Bank Nifty trading dashboard",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
