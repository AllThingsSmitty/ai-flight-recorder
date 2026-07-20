import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Flight Recorder — Next.js Chat Example",
  description:
    "Example integration of AI Flight Recorder with Next.js and OpenAI. Chat with GPT-4o-mini and export your session as a .flight file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
