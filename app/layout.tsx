import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muhammed Shehaz & Nida Mariyum | Nikah Invitation",
  description:
    "With gratitude to Allah, you are warmly invited to the nikah of Muhammed Shehaz and Nida Mariyyum on Friday, November 20, 2026.",
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