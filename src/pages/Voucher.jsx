import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const A4_WIDTH = '210mm';
const A4_HEIGHT = '297mm';

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
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#ECECEC' }}>
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#ECECEC' }}>
        <div className="text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '14px' }}>VOUCHER</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: '#111', letterSpacing: '0.04em' }}>Voucher nie znaleziony</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#666', marginTop: '14px', letterSpacing: '0.05em' }}>Sprawdź kod lub skontaktuj się ze studiem.</p>
        </div>
      </div>
    );
  }

  const studioName = settings?.app_description || 'ROMANS TATTOO';
  const addressLine = [settings?.contact_address_street, settings?.contact_address_city].filter(Boolean).join(', ');
  const brand = settings?.primary_color || '#FF007F';

  const isDisabled = promo.is_active === false;
  const isRevoked = promo.revoked === true;
  const expired = promo.expires_at ? new Date(promo.expires_at).getTime() < Date.now() : false;
  const isGrace = promo.is_grace === true && promo.grace_expires_at ? new Date(promo.grace_expires_at).getTime() >= Date.now() : false;
  const inactive = isDisabled || isRevoked || expired;
  const amount = isGrace ? (promo.balance || promo.grace_value || promo.value || 0) : (promo.value || 0);
  const statusLabel = isRevoked ? 'Voucher odwołany' : isDisabled ? 'Voucher wyłączony' : expired ? (isGrace ? 'Tryb ostatniej szansy' : 'Voucher wygasł') : '';
  const statusDesc = isRevoked
    ? 'Ten voucher został odwołany przez studio i nie może zostać zrealizowany.'
    : isDisabled
      ? 'Ten voucher został tymczasowo wyłączony przez studio.'
      : expired
        ? isGrace
          ? 'Voucher wygasł, ale został przedłużony w trybie ostatniej szansy z obniżoną wartością.'
          : 'Upłynęła data ważności tego vouchera.'
        : '';

  return (
    <div style={{ background: '#ECECEC', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
      <div
        className="voucher-sheet"
        style={{
          width: A4_WIDTH,
          minHeight: A4_HEIGHT,
          background: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          color: '#111111',
          fontFamily: 'var(--font-body)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Decorative accent corners / gradient — printable */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14mm', background: `linear-gradient(90deg, ${brand} 0%, ${brand}CC 60%, transparent 100%)` }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '14mm', bottom: 0, background: `linear-gradient(180deg, ${brand} 0%, ${brand}CC 50%, transparent 100%)` }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40mm', height: '40mm', background: `radial-gradient(circle at bottom right, ${brand}22 0%, transparent 70%)` }} />
        <div style={{ position: 'absolute', top: '20mm', right: '8mm', width: '2mm', height: '60mm', background: brand, opacity: 0.5 }} />

        {/* Content padding */}
        <div style={{ position: 'relative', zIndex: 2, padding: '26mm 22mm 18mm 26mm', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', marginBottom: '14mm' }}>
            {settings?.site_logo_url && (
              <img src={settings.site_logo_url} alt="Logo" style={{ height: '22mm', width: 'auto', objectFit: 'contain' }} />
            )}
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '14mm', fontWeight: 400, letterSpacing: '0.06em', color: '#111111', lineHeight: 0.9, margin: 0 }}>{studioName}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: brand, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2mm' }}>Voucher prezentowy</p>
            </div>
          </div>

          {/* Inactive banner */}
          {inactive && (
            <div style={{ marginBottom: '10mm', padding: '6mm 7mm', border: `0.5mm solid ${brand}`, background: `${brand}11`, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.5mm', color: brand, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2mm' }}>{statusLabel}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '3.5mm', color: '#555', lineHeight: 1.6, margin: 0 }}>{statusDesc}</p>
            </div>
          )}

          {/* Amount — hero */}
          <div style={{ textAlign: 'center', marginBottom: '12mm' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4mm' }}>Wartość vouchera</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '34mm', fontWeight: 400, color: brand, lineHeight: 0.85, letterSpacing: '0.01em', margin: 0 }}>
              {amount}
              <span style={{ fontSize: '12mm', marginLeft: '3mm', letterSpacing: '0.1em' }}>PLN</span>
            </p>
            <div style={{ width: '30mm', height: '0.6mm', background: brand, margin: '6mm auto 0' }} />
          </div>

          {/* QR + code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14mm' }}>
            {promo.qr_code_url && (
              <div style={{ padding: '4mm', background: '#FFFFFF', border: `0.3mm solid ${brand}33` }}>
                <img src={promo.qr_code_url} alt="Kod QR vouchera" style={{ width: '42mm', height: '42mm', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '6mm 0 2mm' }}>Kod vouchera</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7mm', color: '#111111', letterSpacing: '0.4em', margin: 0 }}>{promo.code}</p>
          </div>

          {/* Valid until */}
          <div style={{ textAlign: 'center', marginBottom: '14mm', paddingBottom: '8mm', borderBottom: `0.3mm solid ${brand}33` }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '3mm' }}>Ważny do</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '6mm', color: '#111111', letterSpacing: '0.04em', margin: 0 }}>{formatDate(promo.expires_at)}</p>
            {isGrace && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: brand, letterSpacing: '0.1em', marginTop: '3mm' }}>Ostatnia szansa do: {formatDate(promo.grace_expires_at)}</p>
            )}
          </div>

          {/* Studio info */}
          <div style={{ marginTop: 'auto' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: brand, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '5mm', textAlign: 'center' }}>Dane kontaktowe</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm', alignItems: 'center', textAlign: 'center' }}>
              {addressLine && <p style={{ fontFamily: 'var(--font-body)', fontSize: '4mm', color: '#333', margin: 0, lineHeight: 1.5 }}>{addressLine}</p>}
              {settings?.contact_phone && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4mm', color: '#333', letterSpacing: '0.08em', margin: 0 }}>Tel: {settings.contact_phone}</p>}
              {settings?.contact_email && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4mm', color: '#333', letterSpacing: '0.08em', margin: 0 }}>{settings.contact_email}</p>}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '10mm', paddingTop: '5mm', borderTop: `0.3mm solid #DDD`, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.6mm', color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
              Voucher na okaziciela · Ważny w dniu sesji · Nr {promo.code}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: #FFFFFF !important; }
          .voucher-sheet { box-shadow: none !important; margin: 0 !important; width: 210mm !important; min-height: 297mm !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}