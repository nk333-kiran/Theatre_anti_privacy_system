import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Theatre Anti-Piracy QR Activation & Verification System",
  description: "Secure QR-based ticketing and anti-piracy activation dashboard for cinemas and theatres.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
