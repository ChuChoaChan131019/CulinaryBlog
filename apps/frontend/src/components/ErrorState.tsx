"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { getErrorStateMessage, type ErrorStateInfo } from "@/lib/error-state";

interface ErrorStateProps {
  error?: ErrorStateInfo;
  title?: string;
  message?: string;
  retryHref?: string;
  retryLabel?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

export function ErrorState({
  error,
  title = "Không thể tải nội dung",
  message,
  retryHref,
  retryLabel = "Thử lại",
  onRetry,
  homeHref,
  homeLabel = "Về trang chủ",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center ${className ?? ""}`.trim()}
    >
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="mt-4 font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {message ?? getErrorStateMessage(error)}
      </p>

      {(onRetry || retryHref || homeHref) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {retryLabel}
            </button>
          ) : (
            retryHref && (
              <Link
                href={retryHref}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {retryLabel}
              </Link>
            )
          )}
          {homeHref && (
            <Link
              href={homeHref}
              className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {homeLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
