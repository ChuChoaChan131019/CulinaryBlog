"use client";

import "./globals.css";
import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-background text-foreground">
        <ErrorState
          title="Ứng dụng gặp sự cố"
          onRetry={reset}
          homeHref="/"
          homeLabel="Về trang chủ"
          className="min-h-screen w-full max-w-none rounded-none border-0 bg-transparent"
        />
      </body>
    </html>
  );
}
