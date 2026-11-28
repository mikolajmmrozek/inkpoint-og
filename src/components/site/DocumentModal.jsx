import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ArrowLeft } from 'lucide-react';

// Okno z dokumentem studia (polityka cookies, regulamin) — otwierane w aplikacji,
// żeby klient nie tracił wypełnianej ankiety ani strony, na której był.
export default function DocumentModal({
  open,
  onClose,
  docKey = 'cookies_policy',
  fallbackTitle = 'Dokument',
  backLabel = 'POWRÓT NA GŁÓWNĄ',
  onBack,
  backOnly = false,
  lang = 'pl',
}) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    base44.entities.TermsAndConditions.filter({ key: docKey })
      .then((rows) => { if (!cancelled) setDoc(rows[0] || null); })
      .catch(() => { if (!cancelled) setDoc(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, docKey]);

  if (!open) return null;

  const translated = lang !== 'pl' ? doc?.translations?.[lang] : null;
  const shown = translated || doc;
  const mono = { fontFamily: 'var(--font-mono)' };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={shown?.title || fallbackTitle}
    >
      <div
        className="w-full max-w-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'hsl(var(--card))',
          border: '0.5px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          maxHeight: '88vh',
        }}
      >
        <div className="flex items-start justify-between gap-4 p-5" style={{ borderBottom: '0.5px solid hsl(var(--border))', flexShrink: 0 }}>
          <div>
            <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '6px' }}>
              DOKUMENT STUDIA
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', lineHeight: 1, letterSpacing: '0.04em', color: 'hsl(var(--foreground))' }}>
              {shown?.title || fallbackTitle}
            </h3>
          </div>
          {!backOnly && (
            <button type="button" onClick={onClose} aria-label="Zamknij" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '4px' }}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {loading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="w-6 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
              <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))' }}>ŁADOWANIE...</p>
            </div>
          ) : !shown?.content ? (
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>Dokument jest jeszcze niedostępny.</p>
          ) : (
            <>
              {doc?.last_updated && (
                <p style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '14px' }}>
                  Ostatnia aktualizacja: {doc.last_updated}
                </p>
              )}
              <div
                style={{ color: 'hsl(var(--foreground))', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: shown.content }}
              />
            </>
          )}
        </div>

        <div className="flex gap-2 p-5 flex-wrap" style={{ borderTop: '0.5px solid hsl(var(--border))', flexShrink: 0 }}>
          <button type="button" onClick={onBack || onClose} className="btn-oxblood flex items-center gap-2" style={{ padding: '11px 20px' }}>
            <ArrowLeft size={12} /> {backLabel}
          </button>
          {!backOnly && (
            <button type="button" onClick={onClose} className="btn-ghost-parchment">
              ZAMKNIJ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}