'use client';

import { useEffect } from 'react';
import { captureExceptionWithSentryNonBlocking } from '@/infra/observability/sentry';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureExceptionWithSentryNonBlocking(error, {
      extras: {
        digest: error.digest,
        surface: 'app.global-error',
      },
      tags: {
        surface: 'app.global-error',
      },
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Erro inesperado</h1>
            <p style={{ color: '#475569', marginBottom: 16 }}>
              Ocorreu um erro inesperado. Tente novamente.
            </p>
            <button
              onClick={reset}
              style={{
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                padding: '10px 16px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
