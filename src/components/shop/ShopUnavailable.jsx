import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';

export default function ShopUnavailable() {
  const { isAuthenticated } = useAuth();

  return (
    <PageLayout>
      <div className="pt-40 pb-24 px-6" style={{ minHeight: '70vh' }}>
        <div className="max-w-md mx-auto text-center p-10" style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
          <ShoppingBag size={28} style={{ color: 'var(--brand)', margin: '0 auto 16px' }} />
          <p className="text-micro" style={{ fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', marginBottom: '10px' }}>SKLEP</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.03em', lineHeight: 1 }}>Sklep jest chwilowo niedostępny</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', lineHeight: 1.7, margin: '14px 0 24px' }}>
            Pracujemy nad nową kolekcją. Wróć do nas wkrótce.
          </p>
          <div className="flex flex-col gap-3">
            {isAuthenticated && (
              <Link to="/panel/orders" className="btn-oxblood" style={{ padding: '13px' }}>MOJE ZAMÓWIENIA</Link>
            )}
            <Link to="/" className="btn-ghost-parchment" style={{ padding: '12px' }}>WRÓĆ NA STRONĘ</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}