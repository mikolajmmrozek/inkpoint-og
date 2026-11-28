import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import DocumentModal from './DocumentModal';

const STORAGE_KEY = 'cookie_consent';

// Zgoda przekazywana dalej przez Google Consent Mode v2 — skrypty na stronie czekają na tę decyzję.
const pushConsent = (granted) => {
  const value = granted ? 'granted' : 'denied';
  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'update', {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
};

export default function CookieConsent() {
  const [choice, setChoice] = useState(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'granted' || saved === 'denied') {
      setChoice(saved);
      pushConsent(saved === 'granted');
      setVisible(true);
      return;
    }
    // Pierwsze wejście: dyskretna ikonka, po chwili rozwija się panel z decyzją.
    const showIcon = setTimeout(() => setVisible(true), 1000);
    const showPanel = setTimeout(() => setExpanded(true), 1800);
    return () => { clearTimeout(showIcon); clearTimeout(showPanel); };
  }, []);

  const choose = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
    pushConsent(value === 'granted');
    setExpanded(false);
  };

  if (!visible) return null;

  const mono = { fontFamily: 'var(--font-mono)' };

  return (
    <>
      <div className="fixed left-3 bottom-3 z-[9999]">
        {expanded ? (
          <div
            style={{
              width: 'min(330px, calc(100vw - 24px))',
              background: 'hsl(var(--card))',
              border: '0.5px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              padding: '16px',
              boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cookie size={13} color="var(--brand)" />
                <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)' }}>Cookies</p>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Zamknij ustawienia cookies" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '2px' }}>
                <X size={13} />
              </button>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
              Używamy plików cookies, żeby strona działała poprawnie i żeby wiedzieć, co warto poprawić. Możesz zaakceptować wszystkie albo odrzucić te, które nie są konieczne.
            </p>

            <button
              type="button"
              onClick={() => setDocOpen(true)}
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', textDecoration: 'underline', padding: 0, marginBottom: '14px' }}
            >
              Polityka cookies
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={() => choose('granted')} className="btn-oxblood flex-1" style={{ padding: '10px 8px', fontSize: '9px' }}>
                AKCEPTUJĘ
              </button>
              <button type="button" onClick={() => choose('denied')} className="btn-ghost-parchment flex-1" style={{ padding: '9px 8px', fontSize: '9px' }}>
                ODRZUCAM
              </button>
            </div>

            {choice && (
              <p style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
                Zapisany wybór: {choice === 'granted' ? 'akceptacja' : 'odrzucenie'}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Ustawienia cookies"
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'hsl(var(--card))',
              border: '0.5px solid hsl(var(--border))',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            }}
          >
            <Cookie size={16} color="var(--brand)" />
          </button>
        )}
      </div>

      <DocumentModal
        open={docOpen}
        onClose={() => setDocOpen(false)}
        docKey="cookies_policy"
        fallbackTitle="Polityka cookies"
        backLabel="POWRÓT NA GŁÓWNĄ"
        onBack={() => {
          setDocOpen(false);
          if (window.location.pathname !== '/') window.location.href = '/';
        }}
      />
    </>
  );
}