import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shehaz-nikah.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Muhammed Shehaz & Nida Mariyam | Nikah Invitation",
  description:
    "With gratitude to Allah, you are warmly invited to the nikah of Muhammed Shehaz and Nida Mariyam on Friday, November 20, 2026.",
  openGraph: {
    type: "website",
    title: "Muhammed Shehaz & Nida Mariyam | Nikah Invitation",
    description:
      "You are warmly invited to the nikah of Muhammed Shehaz and Nida Mariyam on Friday, November 20, 2026.",
    siteName: "Shehaz & Nida — Nikah Invitation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Muhammed Shehaz & Nida Mariyam | Nikah Invitation",
    description:
      "You are warmly invited to the nikah of Muhammed Shehaz and Nida Mariyam on Friday, November 20, 2026.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d2b25",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
