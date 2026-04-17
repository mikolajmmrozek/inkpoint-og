import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';

export default function TermsAndConditions() {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.TermsAndConditions.filter({ key: 'default' })
      .then(data => {
        setTerms(data[0] || { title: 'Regulamin', content: 'Brak regulaminu' });
        setLoading(false);
      })
      .catch(() => {
        setTerms({ title: 'Regulamin', content: 'Brak regulaminu' });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-px animate-pulse" style={{ background: '#FF007F' }} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-8 md:px-16 py-16">
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3.5rem', fontWeight: 400, color: '#F5F0EB', lineHeight: 1, letterSpacing: '0.04em', marginBottom: '32px' }}>
          {terms?.title || 'Regulamin'}
        </h1>
        
        <div style={{ color: 'rgba(245,240,235,0.7)', fontSize: '16px', lineHeight: 1.8 }}>
          {terms?.content ? (
            <div dangerouslySetInnerHTML={{ __html: terms.content }} />
          ) : (
            <p>Regulamin nie został jeszcze dodany.</p>
          )}
        </div>

        {terms?.last_updated && (
          <p style={{ marginTop: '40px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em' }}>
            Ostatnia aktualizacja: {terms.last_updated}
          </p>
        )}
      </div>
    </PageLayout>
  );
}