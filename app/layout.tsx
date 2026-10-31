import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display face for large numbers only; body text stays Geist. */
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "MakanLens",
  description: "Snap a hawker meal and get calories and macros from published Singapore nutrition data. Free and open source.",
  applicationName: "MakanLens",
  appleWebApp: { capable: true, title: "MakanLens", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#151513" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable}  ${geistMono.variable}  ${nunito.variable} h-full antialiased`}
    >
      {/* Bottom padding keeps content clear of the fixed tab bar (plus the iPhone home indicator). */}
      <body className="min-h-full flex flex-col overflow-x-hidden bg-page pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <div className="flex-1">{children}</div>
        <Footer />
        <TabBar />
      </body>
    </html>
  );
}
