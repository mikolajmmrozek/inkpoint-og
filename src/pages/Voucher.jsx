import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Voucher() {
  const { code } = useParams();
  const [promo, setPromo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [promos, settingsRecs] = await Promise.all([
          base44.entities.Promotion.filter({ code }),
          base44.entities.SiteSettings.filter({ key: 'theme' }),
        ]);
        if (cancelled) return;
        const found = promos.find(p => p.type === 'voucher');
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPromo(found);
        setSettings(settingsRecs[0] || null);
        const amt = found.value || 0;
        const studio = settingsRecs[0]?.app_description || 'Studio';
        document.title = `Voucher ${amt} PLN — ${studio}`;
        setLoading(false);
      } catch {
        if (!cancelled) { setNotFound(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
    return hasTime
      ? d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '14px' }}>VOUCHER</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>Voucher nie znaleziony</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '14px', letterSpacing: '0.05em' }}>Sprawdź kod lub skontaktuj się ze studiem.</p>
        </div>
      </div>
    );
  }

  const amount = promo.value || 0;
  const studioName = settings?.app_description || 'ROMANS TATTOO';
  const addressLine = [settings?.contact_address_street, settings?.contact_address_city].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12" style={{ background: 'hsl(var(--background))' }}>
      <div className="w-full" style={{ maxWidth: '480px', border: 'var(--border-width) solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '40px 36px' }}>
        {/* Header: logo + studio name */}
        <div className="flex flex-col items-center text-center mb-7">
          {settings?.site_logo_url && (
            <img
              src={settings.site_logo_url}
              alt="Logo studia"
              style={{ height: '56px', width: 'auto', marginBottom: '16px', objectFit: 'contain' }}
            />
          )}
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.08em', color: 'hsl(var(--foreground))', lineHeight: 1 }}>
            {studioName}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '10px' }}>
            Voucher
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 'var(--border-width)', background: 'hsl(var(--border))', marginBottom: '28px' }} />

        {/* Amount */}
        <div className="text-center mb-8">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>Kwota</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 400, color: 'var(--brand)', lineHeight: 0.9, letterSpacing: '0.02em' }}>
            {amount}<span style={{ fontSize: '1.5rem', marginLeft: '6px', letterSpacing: '0.08em' }}>PLN</span>
          </p>
        </div>

        {/* Valid until */}
        <div className="text-center mb-8">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Ważny do</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'hsl(var(--foreground))', letterSpacing: '0.02em' }}>
            {formatDate(promo.expires_at)}
          </p>
        </div>

        {/* QR + code */}
        <div className="flex flex-col items-center mb-7">
          {promo.qr_code_url && (
            <img
              src={promo.qr_code_url}
              alt="Kod QR vouchera"
              style={{ width: '180px', height: '180px', objectFit: 'contain', background: '#FFFFFF', padding: '8px' }}
            />
          )}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '16px' }}>Kod</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', color: 'hsl(var(--foreground))', letterSpacing: '0.3em', marginTop: '4px' }}>
            {promo.code}
          </p>
        </div>

        {/* Company info */}
        {(addressLine || settings?.contact_phone || settings?.contact_email) && (
          <div style={{ borderTop: 'var(--border-width) solid hsl(var(--border))', paddingTop: '18px' }} className="text-center">
            {addressLine && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', lineHeight: 1.7 }}>
                {addressLine}
              </p>
            )}
            {settings?.contact_phone && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', lineHeight: 1.7 }}>
                {settings.contact_phone}
              </p>
            )}
            {settings?.contact_email && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', lineHeight: 1.7 }}>
                {settings.contact_email}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}