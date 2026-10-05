import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function Instructions() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type') || 'before_tattoo';

  useEffect(() => {
    base44.entities.Instruction.filter({ type }).then((results) => {
      setDoc(results[0] || null);
      setLoading(false);
    });
  }, [type]);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgb(var(--foreground-rgb) / 0.4)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>
            ŁADOWANIE...
          </div>
        ) : !doc ? (
          <div style={{ textAlign: 'center', color: 'rgb(var(--foreground-rgb) / 0.4)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>
            Brak dokumentu.
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', marginBottom: '32px', color: 'hsl(var(--foreground))' }}>
              {doc.title}
            </h1>
            <div
              style={{ lineHeight: 1.8, fontSize: '15px', color: 'rgb(var(--foreground-rgb) / 0.85)' }}
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          </>
        )}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '0.5px solid hsl(var(--border))' }}>
          <a href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            ← Powrót
          </a>
        </div>
      </div>
    </div>
  );
}