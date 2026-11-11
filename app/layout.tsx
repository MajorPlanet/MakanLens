import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakanLens",
  description: "Snap a hawker meal and get calories and macros from published Singapore nutrition data. Free and open source.",
  applicationName: "MakanLens",
  appleWebApp: { capable: true, title: "MakanLens", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className="dark h-full bg-bg">
      {/* Bottom padding keeps content clear of the fixed tab bar (plus the iPhone home indicator). */}
      <body className="flex min-h-full flex-col overflow-x-hidden bg-bg text-label pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div className="flex-1">{children}</div>
        <Footer />
        <TabBar />
      </body>
    </html>
  );
}
