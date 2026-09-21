import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const A4_WIDTH = '210mm';
const A4_HEIGHT = '297mm';
const SIDEBAR_WIDTH = '16mm';

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
        if (found.assigned_client_email) {
          try {
            const clients = await base44.entities.Client.filter({ email: found.assigned_client_email });
            if (!cancelled && clients[0]) setRecipientName(clients[0].name || `${clients[0].first_name || ''} ${clients[0].last_name || ''}`.trim());
          } catch { /* ignore */ }
        }
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

  const studioName = (settings?.app_description || 'ROMANS TATTOO').toUpperCase();
  const street = settings?.contact_address_street;
  const city = settings?.contact_address_city;
  const phone = settings?.contact_phone;
  const emailAddr = settings?.contact_email;
  const brand = settings?.primary_color || '#FF007F';
  const ink = '#1A1A1A';
  const muted = '#8A8A8A';

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
          height: A4_HEIGHT,
          background: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          color: ink,
          fontFamily: 'var(--font-body)',
          display: 'flex',
        }}
      >
        {/* Left magenta sidebar */}
        <div style={{
          width: SIDEBAR_WIDTH,
          background: brand,
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '7mm',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            whiteSpace: 'nowrap',
          }}>
            {studioName}
          </span>
          {/* sidebar decorative tick */}
          <div style={{ position: 'absolute', bottom: '10mm', left: '50%', transform: 'translateX(-50%)', width: '1.2mm', height: '12mm', background: '#FFFFFF', opacity: 0.5 }} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Arc line art background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 194 297" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="arcFade" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={brand} stopOpacity="0.10" />
                <stop offset="100%" stopColor={brand} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <circle cx="170" cy="40" r="70" fill="none" stroke={brand} strokeOpacity="0.07" strokeWidth="0.4" />
            <circle cx="170" cy="40" r="100" fill="none" stroke={brand} strokeOpacity="0.05" strokeWidth="0.4" />
            <circle cx="170" cy="40" r="130" fill="none" stroke={brand} strokeOpacity="0.03" strokeWidth="0.4" />
            <circle cx="20" cy="260" r="60" fill="none" stroke={brand} strokeOpacity="0.06" strokeWidth="0.4" />
            <circle cx="20" cy="260" r="90" fill="none" stroke={brand} strokeOpacity="0.04" strokeWidth="0.4" />
            <circle cx="20" cy="260" r="120" fill="none" stroke={brand} strokeOpacity="0.02" strokeWidth="0.4" />
            <path d="M 0 150 Q 97 110 194 150" fill="none" stroke="url(#arcFade)" strokeWidth="0.5" />
            <path d="M 0 170 Q 97 130 194 170" fill="none" stroke="url(#arcFade)" strokeWidth="0.4" />
          </svg>

          {/* Inner frame */}
          <div style={{ position: 'absolute', inset: '10mm 12mm 10mm 14mm', display: 'flex', flexDirection: 'column' }}>

            {/* Inactive banner */}
            {inactive && (
              <div style={{ marginBottom: '6mm', padding: '4mm 6mm', border: `0.4mm solid ${brand}`, background: `${brand}0D`, borderRadius: '1.5mm' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3mm', color: brand, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1.5mm' }}>{statusLabel}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '3mm', color: muted, lineHeight: 1.5, margin: 0 }}>{statusDesc}</p>
              </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '6mm' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20mm', fontWeight: 700, color: brand, letterSpacing: '0.02em', lineHeight: 0.85, margin: 0 }}>VOUCHER</p>
              <div style={{ width: '40mm', height: '0.8mm', background: brand, margin: '2mm 0 3mm' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '8mm', fontWeight: 600, color: brand, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>PODARUNKOWY</p>
            </div>

            {/* Recipient */}
            <div style={{ marginBottom: '5mm' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.2mm', color: ink, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 2mm' }}>{recipientName ? 'DLA' : 'NA OKAZICIELA'}</p>
              {recipientName && (
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '11mm', fontWeight: 700, color: brand, letterSpacing: '0.03em', lineHeight: 0.95, margin: 0 }}>{recipientName}</p>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: '8mm' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '3.2mm', color: ink, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 2mm' }}>O WARTOŚCI</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: amount >= 1000 ? '30mm' : '34mm', fontWeight: 700, color: brand, lineHeight: 0.82, letterSpacing: '0.01em', margin: 0 }}>
                {amount}<span style={{ fontSize: '12mm', marginLeft: '3mm', letterSpacing: '0.1em' }}>PLN</span>
              </p>
            </div>

            {/* Milky info windows */}
            <div style={{ display: 'flex', gap: '4mm', marginBottom: '6mm' }}>
              {/* Code + date window */}
              <div style={{
                flex: 1,
                background: 'rgba(0,0,0,0.04)',
                backdropFilter: 'blur(2px)',
                border: '0.3mm solid rgba(0,0,0,0.06)',
                borderRadius: '2mm',
                padding: '5mm 6mm',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8mm', color: brand, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 1mm' }}>KOD VOUCHERA</p>
                <div style={{ width: '14mm', height: '0.4mm', background: brand, marginBottom: '3mm' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7mm', color: ink, letterSpacing: '0.3em', fontWeight: 600, margin: '0 0 4mm' }}>{promo.code}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8mm', color: brand, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 1mm' }}>WAŻNY DO</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '5mm', color: ink, fontWeight: 600, margin: 0 }}>{formatDate(promo.expires_at)}</p>
                {isGrace && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.6mm', color: brand, letterSpacing: '0.08em', marginTop: '1.5mm' }}>Ostatnia szansa: {formatDate(promo.grace_expires_at)}</p>
                )}
              </div>

              {/* QR window */}
              <div style={{
                width: '44mm',
                background: 'rgba(0,0,0,0.04)',
                backdropFilter: 'blur(2px)',
                border: '0.3mm solid rgba(0,0,0,0.06)',
                borderRadius: '2mm',
                padding: '5mm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {promo.qr_code_url ? (
                  <div style={{ padding: '2mm', background: '#FFFFFF', border: '0.3mm solid rgba(0,0,0,0.1)' }}>
                    <img src={promo.qr_code_url} alt="QR" style={{ width: '32mm', height: '32mm', objectFit: 'contain', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ width: '32mm', height: '32mm', border: `0.4mm solid ${brand}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '6mm', color: brand, letterSpacing: '0.1em' }}>QR</span>
                  </div>
                )}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4mm', color: muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '2mm' }}>ZESKAJ ABY ZREALIZOWAĆ</p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '8mm', alignItems: 'flex-end' }}>
              <p style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '3mm', color: muted, lineHeight: 1.6, margin: 0 }}>
                Voucher do zrealizowania na usługi w studio, nie podlega wymianie na gotówkę. Zachowaj go i pamiętaj o okazaniu na sesji.
              </p>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8mm', color: brand, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2mm' }}>DANE KONTAKTOWE</p>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '3.2mm', color: ink, lineHeight: 1.7 }}>
                  {street && <p style={{ margin: 0 }}>{street}</p>}
                  {city && <p style={{ margin: 0 }}>{city}</p>}
                  {phone && <p style={{ margin: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>Tel. {phone}</p>}
                  {emailAddr && <p style={{ margin: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{emailAddr}</p>}
                </div>
              </div>
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