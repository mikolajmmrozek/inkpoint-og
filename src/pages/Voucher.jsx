import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const A4_WIDTH = '210mm';
const A4_HEIGHT = '297mm';

export default function Voucher() {
  const { code } = useParams();
  const [promo, setPromo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [promos, allSettings] = await Promise.all([
          base44.entities.Promotion.filter({ code }),
          base44.entities.SiteSettings.list(),
        ]);
        if (cancelled) return;
        const found = promos.find(p => p.type === 'voucher');
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPromo(found);
        // If voucher is assigned to a client, look up their name for "Dla [name]"
        if (found.assigned_client_email) {
          try {
            const clients = await base44.entities.Client.filter({ email: found.assigned_client_email });
            if (!cancelled && clients[0]) setRecipientName(clients[0].name || `${clients[0].first_name || ''} ${clients[0].last_name || ''}`.trim());
          } catch { /* ignore */ }
        }
        // Merge contact data (key 'contact') with theme data (key 'theme')
        const contact = allSettings.find(s => s.key === 'contact') || {};
        const theme = allSettings.find(s => s.key === 'theme') || {};
        setSettings({ ...theme, ...contact, primary_color: theme.primary_color || contact.primary_color });
        const amt = found.value || 0;
        const studio = contact.app_description || theme.app_description || 'Studio';
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
    <div className="voucher-wrap" style={{ background: '#ECECEC', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
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
        <div style={{ position: 'relative', zIndex: 2, padding: '18mm 24mm 16mm 28mm', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8mm', marginBottom: '6mm' }}>
            {settings?.site_logo_url && (
              <img src={settings.site_logo_url} alt="Logo" style={{ height: '26mm', width: 'auto', objectFit: 'contain' }} />
            )}
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18mm', fontWeight: 400, letterSpacing: '0.04em', color: '#111111', lineHeight: 0.85, margin: 0 }}>{studioName}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.5mm', color: brand, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '3mm' }}>Voucher prezentowy</p>
            </div>
          </div>

          {/* Inactive banner */}
          {inactive && (
            <div style={{ marginBottom: '8mm', padding: '5mm 7mm', border: `0.5mm solid ${brand}`, background: `${brand}11`, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.5mm', color: brand, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2mm' }}>{statusLabel}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '3.5mm', color: '#555', lineHeight: 1.6, margin: 0 }}>{statusDesc}</p>
            </div>
          )}

          {/* Amount — hero */}
          <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.5mm', color: '#888', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4mm' }}>Wartość vouchera</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '42mm', fontWeight: 400, color: brand, lineHeight: 0.85, letterSpacing: '0.01em', margin: 0 }}>
              {amount}
              <span style={{ fontSize: '14mm', marginLeft: '4mm', letterSpacing: '0.1em' }}>PLN</span>
            </p>
            <div style={{ width: '34mm', height: '0.6mm', background: brand, margin: '5mm auto 0' }} />
          </div>

          {/* Recipient */}
          <div style={{ textAlign: 'center', marginBottom: '10mm' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2.5mm' }}>{recipientName ? 'Dla' : 'Na okaziciela'}</p>
            {recipientName && (
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '9mm', fontWeight: 400, color: '#111111', letterSpacing: '0.03em', margin: 0, lineHeight: 1 }}>{recipientName}</p>
            )}
          </div>

          {/* QR (left) + code & expiry (right) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10mm', marginBottom: '10mm', paddingBottom: '8mm', borderBottom: `0.3mm solid ${brand}33` }}>
            {promo.qr_code_url && (
              <div style={{ padding: '4mm', background: '#FFFFFF', border: `0.3mm solid ${brand}33`, flexShrink: 0 }}>
                <img src={promo.qr_code_url} alt="Kod QR vouchera" style={{ width: '38mm', height: '38mm', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6mm' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '2mm' }}>Kod vouchera</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8mm', color: '#111111', letterSpacing: '0.35em', margin: 0 }}>{promo.code}</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2mm' }}>Ważny do</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '6mm', color: '#111111', letterSpacing: '0.04em', margin: 0 }}>{formatDate(promo.expires_at)}</p>
                {isGrace && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8mm', color: brand, letterSpacing: '0.1em', marginTop: '2mm' }}>Ostatnia szansa do: {formatDate(promo.grace_expires_at)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Studio info */}
          <div style={{ marginTop: 'auto' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: brand, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '4mm', textAlign: 'center' }}>Dane kontaktowe</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm', alignItems: 'center', textAlign: 'center' }}>
              {addressLine && <p style={{ fontFamily: 'var(--font-body)', fontSize: '4mm', color: '#333', margin: 0, lineHeight: 1.5 }}>{addressLine}</p>}
              {settings?.contact_phone && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4mm', color: '#333', letterSpacing: '0.08em', margin: 0 }}>Tel: {settings.contact_phone}</p>}
              {settings?.contact_email && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '4mm', color: '#333', letterSpacing: '0.08em', margin: 0 }}>{settings.contact_email}</p>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          html, body { background: #FFFFFF !important; background-image: none !important; height: auto !important; }
          .voucher-wrap { background: #FFFFFF !important; min-height: 0 !important; padding: 0 !important; display: block !important; }
          .voucher-sheet { box-shadow: none !important; margin: 0 !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}