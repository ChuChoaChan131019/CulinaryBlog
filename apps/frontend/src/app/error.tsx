"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

export default function Error({
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
    <ErrorState
      title="Trang này chưa thể tải"
      onRetry={reset}
      homeHref="/"
      homeLabel="Về trang chủ"
      className="min-h-[60vh] w-full max-w-none rounded-none border-0 bg-transparent"
    />
  );
}
