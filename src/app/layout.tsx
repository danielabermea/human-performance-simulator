import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Human Amplified Simulator",
  description:
    "Practice real-world stakeholder conversations with AI simulation. Build emotional intelligence, adaptability, and alignment skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
