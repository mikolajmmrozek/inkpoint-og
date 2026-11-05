import { Link } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import useSiteContent from '@/hooks/useSiteContent';

export default function ContentGate({ flag, title, message, children }) {
  const { content, loading } = useSiteContent();

  if (loading) {
    return <PageLayout><div className="pt-40 pb-24 flex justify-center"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div></PageLayout>;
  }

  if (content[flag] === false) {
    return (
      <PageLayout>
        <div className="pt-40 pb-24 px-6" style={{ minHeight: '70vh' }}>
          <div className="max-w-md mx-auto text-center p-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
            <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', marginBottom: '12px' }}>NIEDOSTĘPNE</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.03em', lineHeight: 1.05 }}>{title}</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', lineHeight: 1.7, margin: '14px 0 24px' }}>{message}</p>
            <Link to="/" className="btn-ghost-parchment" style={{ padding: '12px 26px' }}>WRÓĆ NA STRONĘ</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return children;
}