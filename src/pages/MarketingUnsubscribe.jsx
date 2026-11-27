import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Strona po kliknięciu REZYGNUJĘ w mailu marketingowym.
// Wypisuje od razu na podstawie tokenu z linku — bez logowania, bez wpisywania e-maila,
// bez dodatkowego przycisku. Strona tylko potwierdza wypis.
export default function MarketingUnsubscribe() {
  const [state, setState] = useState('loading'); // loading | done | invalid | error

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') || '';
    if (!token) {
      setState('invalid');
      return;
    }
    base44.functions.invoke('marketingUnsubscribe', { token })
      .then((response) => setState(response.data?.ok ? 'done' : 'invalid'))
      .catch(() => setState('error'));
  }, []);

  const bg = '#0A0A0A';
  const textPrimary = '#F5F0EB';
  const textMuted = 'rgba(245,240,235,0.7)';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bg }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
          ROMANS TATTOO
        </p>

        {state === 'loading' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: textPrimary, letterSpacing: '0.04em', lineHeight: 1 }}>
              Przetwarzamy…
            </h1>
            <div className="w-8 h-px animate-pulse mt-6" style={{ background: 'var(--brand)' }} />
          </>
        )}

        {state === 'done' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: textPrimary, letterSpacing: '0.04em', lineHeight: 1.05, marginBottom: '16px' }}>
              Wypisano z wiadomości marketingowych.
            </h1>
            <p style={{ color: textMuted, fontSize: '16px', lineHeight: 1.8 }}>
              Nie będziesz otrzymywać od nas wiadomości o promocjach i nowościach. Potwierdzenia wizyt i sprawy organizacyjne nadal do Ciebie dotrą.
            </p>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: textPrimary, letterSpacing: '0.04em', lineHeight: 1.05, marginBottom: '16px' }}>
              Ten link jest nieprawidłowy.
            </h1>
            <p style={{ color: textMuted, fontSize: '16px', lineHeight: 1.8 }}>
              Otwórz link rezygnacji bezpośrednio z wiadomości e-mail, którą od nas otrzymałeś.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, color: textPrimary, letterSpacing: '0.04em', lineHeight: 1.05, marginBottom: '16px' }}>
              Nie udało się zapisać wypisu.
            </h1>
            <p style={{ color: textMuted, fontSize: '16px', lineHeight: 1.8 }}>
              Spróbuj ponownie za chwilę, otwierając ten sam link z wiadomości e-mail.
            </p>
          </>
        )}

        <a
          href="/"
          style={{ display: 'inline-block', marginTop: '32px', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', textDecoration: 'none', padding: '12px 28px', border: '0.5px solid var(--brand)' }}
        >
          WRÓĆ NA STRONĘ GŁÓWNĄ
        </a>
      </div>
    </div>
  );
}