import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function TermsAndConditions() {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang') || 'pl';

  useEffect(() => {
    const load = async () => {
      try {
        const results = await base44.entities.TermsAndConditions.filter({ key: 'default' });
        const doc = results[0];
        if (!doc) { setLoading(false); return; }

        if (lang && lang !== 'pl' && doc.translations?.[lang]) {
          setTerms({ title: doc.translations[lang].title, content: doc.translations[lang].content });
        } else if (lang && lang !== 'pl') {
          // Fetch translation via backend function
          const res = await base44.functions.invoke('translateDocument', {
            entity_type: 'TermsAndConditions',
            entity_id: doc.id,
            target_lang: lang
          });
          if (res.data?.title) {
            setTerms({ title: res.data.title, content: res.data.content });
          } else {
            setTerms({ title: doc.title, content: doc.content });
          }
        } else {
          setTerms({ title: doc.title, content: doc.content });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [lang]);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgb(var(--foreground-rgb) / 0.4)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>
            ŁADOWANIE...
          </div>
        ) : !terms ? (
          <div style={{ textAlign: 'center', color: 'rgb(var(--foreground-rgb) / 0.4)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>
            Brak regulaminu.
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', marginBottom: '32px', color: 'hsl(var(--foreground))' }}>
              {terms.title}
            </h1>
            <div
              style={{ lineHeight: 1.8, fontSize: '15px', color: 'rgb(var(--foreground-rgb) / 0.85)' }}
              dangerouslySetInnerHTML={{ __html: terms.content }}
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