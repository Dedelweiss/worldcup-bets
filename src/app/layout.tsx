import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC2026 Pool — Paris sportifs entre amis",
  description:
    "Application de paris sportifs virtuels pour la Coupe du Monde FIFA 2026",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fontVariables} ${geistMono.variable} dark h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
