import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Flight Recorder – Live Demo",
  description: "DevTools for AI applications",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
