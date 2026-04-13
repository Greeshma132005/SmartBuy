import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartBuy - Compare Prices, Track Drops, Save Money",
  description:
    "SmartBuy compares prices across Amazon, Flipkart, Croma and more. Track price drops, get predictions, find coupons, and set alerts to save money on every purchase.",
};

// Prevents a flash of wrong theme on first paint (runs before React hydrates)
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('smartbuy-theme');
    var d = document.documentElement;
    if (t === 'light') { d.classList.remove('dark'); d.classList.add('light'); }
    else { d.classList.add('dark'); d.classList.remove('light'); }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-[#0a0a0a] dark:text-white antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
