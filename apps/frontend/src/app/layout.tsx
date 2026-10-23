import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Subset vietnamese là bắt buộc — thiếu nó thì dấu tiếng Việt rơi sang font fallback.
// Sử dụng font Roboto cho phần thân: font chữ tròn, ấm, dễ đọc với độ nét cao và hỗ trợ đầy đủ tiếng Việt.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Culinary Blog — Công thức nấu ăn đã được thử",
    template: "%s · Culinary Blog",
  },
  description:
    "Công thức nấu ăn với thời gian thật, danh sách nguyên liệu và từng bước thực hiện rõ ràng.",
  openGraph: {
    title: "Culinary Blog — Công thức nấu ăn đã được thử",
    description: "Công thức nấu ăn với thời gian thật, nguyên liệu và từng bước thực hiện rõ ràng.",
    type: "website",
    locale: "vi_VN",
    url: "/",
    images: [{ url: "/hero-kitchen.jpg", width: 1200, height: 630, alt: "Culinary Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Culinary Blog — Công thức nấu ăn đã được thử",
    description: "Công thức nấu ăn với thời gian thật, nguyên liệu và từng bước thực hiện rõ ràng.",
    images: ["/hero-kitchen.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Bỏ qua tới nội dung chính
        </a>
        <Navbar />
        <main id="noi-dung" className="flex-1">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
