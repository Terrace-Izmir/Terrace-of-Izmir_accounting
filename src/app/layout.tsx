import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://terrace-of-izmir-accounting.local"),
  title: {
    default: "Terrace Hesap Yönetimi",
    template: "%s | Terrace Hesap Yönetimi",
  },
  description:
    "İnşaat ve proje yönetimi süreçleri için ön muhasebe, masraf ve sözleşme takibi platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} antialiased bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
