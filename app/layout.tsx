import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/ui/providers";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Certified Snacker", template: "%s · Certified Snacker" },
  description: "A calm weekly meal planner for the household.",
  applicationName: "Certified Snacker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b1a" },
  ],
};

// Applies the stored theme before first paint so there is no flash.
const themeScript =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, constant theme bootstrap */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
