import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Influence Simulator",
  description:
    "Practice workplace influence conversations with a resistant stakeholder",
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
