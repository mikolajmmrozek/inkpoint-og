import { LogIn, UserPlus, Repeat, Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoucherAuthScreen({ settings, variant }) {
  const brand = settings?.primary_color || '#FF007F';
  const login = () => {
    // Platformowe logowanie/rejestracja — po powrocie klient wraca na stronę vouchera.
    base44.auth.redirectToLogin(window.location.href);
  };
  // Wylogowanie i powrót na stronę logowania — klient może wejść na konto, do którego należy voucher.
  const switchAccount = async () => {
    try { await base44.auth.logout(); } catch { /* ignore */ }
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#ECECEC' }}>
      <div className="text-center" style={{ maxWidth: '420px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: brand, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '14px' }}>VOUCHER</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: '#111', letterSpacing: '0.04em' }}>
          {variant === 'assigned' ? 'Voucher przypisany do konta'
            : variant === 'other-account' ? 'Voucher przypisany do innego konta'
            : 'Zaloguj się, aby zobaczyć voucher'}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#666', marginTop: '14px', letterSpacing: '0.05em', lineHeight: 1.6 }}>
          {variant === 'assigned'
            ? 'Ten voucher jest przypisany do konta klienta. Zaloguj się adresem e-mail, na który otrzymałeś voucher — wrócisz automatycznie na tę stronę.'
            : variant === 'other-account'
            ? 'Jesteś zalogowany na konto, do którego nie należy ten voucher. Przełącz konto na adres e-mail, na który otrzymałeś voucher, aby go zobaczyć.'
            : 'Zaloguj się lub załóż konto, aby zobaczyć swój voucher. Po zalogowaniu wrócisz automatycznie na tę stronę.'}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
          {variant === 'other-account' ? (
            <>
              <button
                onClick={switchAccount}
                className="flex items-center gap-2"
                style={{ background: brand, color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 22px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius)' }}
              >
                <Repeat size={13} /> Przełącz konto
              </button>
              <a
                href="/"
                className="flex items-center gap-2"
                style={{ background: 'transparent', color: '#1A1A1A', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px 21px', border: '1px solid #1A1A1A', cursor: 'pointer', textDecoration: 'none', borderRadius: 'var(--radius)' }}
              >
                <Home size={13} /> Strona główna
              </a>
            </>
          ) : (
            <>
              <button
                onClick={login}
                className="flex items-center gap-2"
                style={{ background: brand, color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 22px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius)' }}
              >
                <LogIn size={13} /> Zaloguj się
              </button>
              <button
                onClick={login}
                className="flex items-center gap-2"
                style={{ background: 'transparent', color: '#1A1A1A', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px 21px', border: '1px solid #1A1A1A', cursor: 'pointer', borderRadius: 'var(--radius)' }}
              >
                <UserPlus size={13} /> Załóż konto
              </button>
            </>
          )}
        </div>
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid rgba(0,0,0,0.1)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Skontaktuj się ze studiem</p>
          {settings?.contact_phone && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#333', margin: '2px 0' }}>Tel. {settings.contact_phone}</p>}
          {settings?.contact_email && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#333', margin: '2px 0' }}>{settings.contact_email}</p>}
          {settings?.contact_address_street && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#777', margin: '4px 0 0' }}>{settings.contact_address_street}{settings.contact_address_city ? `, ${settings.contact_address_city}` : ''}</p>}
        </div>
      </div>
    </div>
  );
}