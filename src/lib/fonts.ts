import { Inter, Space_Grotesk } from "next/font/google";

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable}`;
