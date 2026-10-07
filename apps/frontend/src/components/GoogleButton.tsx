'use client';

import { useEffect, useRef } from 'react';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdServices;
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript(): Promise<GoogleIdServices> {
  if (window.google) return Promise.resolve(window.google);

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  const script = existing ?? document.createElement('script');

  return new Promise((resolve, reject) => {
    script.addEventListener(
      'load',
      () => (window.google ? resolve(window.google) : reject(new Error('Google Identity Services không khởi tạo được.'))),
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error('Không tải được Google Identity Services.')), {
      once: true,
    });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Nút Google Sign-In đúng style mockup. Google chỉ phát idToken qua nút do chính họ vẽ
 * (trong iframe) — không tự vẽ nút rồi mở popup OAuth tay được — nên kỹ thuật chuẩn là
 * vẽ nút Google thật, vô hình, chồng đúng lên nút hiển thị: click của người dùng rơi
 * vào nút thật, idToken trả về qua callback của `initialize`.
 */
export function GoogleButton({
  label,
  onCredential,
  onError,
}: {
  label: string;
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    const container = overlayRef.current;
    if (!container) return;

    let cancelled = false;
    loadGoogleIdentityScript()
      .then((google) => {
        if (cancelled) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: container.clientWidth || 320,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) onErrorRef.current(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="relative">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 0 1 0-12.4c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.7H12z"
          />
        </svg>
        {label}
      </button>
      {clientId ? (
        <div ref={overlayRef} className="absolute inset-0 overflow-hidden rounded-full opacity-0" />
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => onError('Đăng nhập Google chưa được cấu hình.')}
          className="absolute inset-0 rounded-full"
        />
      )}
    </div>
  );
}
