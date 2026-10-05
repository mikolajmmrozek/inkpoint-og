import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Gift, QrCode, ExternalLink, Copy, Check, Clock } from 'lucide-react';
import ClaimVoucherForm from '@/components/client/ClaimVoucherForm';

export default function ClientVouchers() {
  const { user, theme } = useOutletContext();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [qrFor, setQrFor] = useState(null);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', mutedLow: 'rgba(0,0,0,0.55)', fuchsia: 'var(--brand)', panelBg: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', mutedLow: 'rgba(245,240,235,0.65)', fuchsia: 'var(--brand)', panelBg: '#141414' };

  const load = () => base44.entities.Promotion.list('-created_date', 200)
    .then(res => setVouchers(res.filter(p => p.type === 'voucher')))
    .catch(() => {})
    .finally(() => setLoading(false));

  useEffect(() => {
    if (user?.email) load();
  }, [user]);

  const computeStatus = (p) => {
    if (p.revoked) return 'revoked';
    if (p.is_active === false) return 'inactive';
    const now = Date.now();
    const exp = p.expires_at ? new Date(p.expires_at).getTime() : 0;
    const graceExp = p.grace_expires_at ? new Date(p.grace_expires_at).getTime() : 0;
    if (p.is_grace && graceExp > now) return 'grace';
    if (exp && exp < now) return 'expired';
    if ((p.balance || 0) <= 0) return 'used';
    return 'active';
  };

  const STATUS = {
    active: { label: 'AKTYWNY', color: '#16a34a' },
    used: { label: 'WYKORZYSTANY', color: t.mutedLow },
    expired: { label: 'WYGASŁY', color: '#ef4444' },
    grace: { label: 'OSTATNIA SZANSA', color: '#f59e0b' },
    revoked: { label: 'ODWOŁANY', color: '#ef4444' },
    inactive: { label: 'WYŁĄCZONY', color: t.mutedLow },
  };

  const valueStr = (p) => `${p.value} PLN`;
  const dateStr = (p) => p.expires_at ? new Date(p.expires_at).toLocaleDateString('pl-PL') : '—';

  const copyCode = (p) => {
    navigator.clipboard.writeText(p.code).catch(() => {});
    setCopied(p.id);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>;
  }

  return (
    <div>
      <div className="mb-10">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>TWOJE</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Vouchery</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.05em', marginTop: '10px', maxWidth: '480px', lineHeight: 1.6 }}>
          Pokaż kod lub QR w studio, aby zrealizować voucher na sesję.
        </p>
      </div>

      <ClaimVoucherForm onClaimed={load} />

      {vouchers.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg }}>
          <Gift size={28} color={t.mutedLow} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK VOUCHERÓW</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map(p => {
            const st = computeStatus(p);
            const stInfo = STATUS[st];
            const usable = st === 'active' || st === 'grace';
            const displayAmount = st === 'grace' ? (p.balance || p.grace_value || p.value || 0) : (p.value || 0);
            return (
              <div key={p.id} style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: stInfo.color }} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>VOUCHER PODARUNKOWY</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '17px', letterSpacing: '0.15em', color: t.title, fontWeight: 600, marginTop: '4px' }}>{p.code}</p>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: stInfo.color }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: stInfo.color }} />{stInfo.label}
                  </span>
                </div>

                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', color: t.fuchsia, lineHeight: 0.9, letterSpacing: '0.02em', marginBottom: '16px' }}>
                  {displayAmount}<span style={{ fontSize: '1rem', marginLeft: '6px', letterSpacing: '0.1em' }}>PLN</span>
                </p>

                <div className="space-y-1.5 mb-5" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.04em' }}>
                  <div className="flex justify-between"><span>Ważny do</span><span style={{ color: t.text }}>{dateStr(p)}</span></div>
                  {p.balance !== undefined && p.balance !== p.value && (
                    <div className="flex justify-between"><span>Saldo</span><span style={{ color: t.text }}>{p.balance} PLN</span></div>
                  )}
                  {st === 'grace' && p.grace_expires_at && (
                    <div className="flex justify-between"><span>Ostatnia szansa</span><span style={{ color: t.fuchsia }}>{new Date(p.grace_expires_at).toLocaleDateString('pl-PL')}</span></div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <button onClick={() => copyCode(p)} className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}>
                    {copied === p.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />} {copied === p.id ? 'SKOPIOWANO' : 'KOPIUJ KOD'}
                  </button>
                  {p.qr_code_url && <button onClick={() => setQrFor(p)} className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, background: 'transparent', cursor: 'pointer' }}><QrCode size={12} /> QR</button>}
                  <a href={`${window.location.origin}/voucher/${p.code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: `0.5px solid ${t.border}`, background: 'transparent', textDecoration: 'none', cursor: 'pointer' }}><ExternalLink size={12} /> PODGLĄD</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setQrFor(null)}>
          <div className="flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrFor(null)} style={{ alignSelf: 'flex-end', color: t.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>✕</button>
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', borderRadius: 'var(--radius)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>{qrFor.code}</p>
              {qrFor.qr_code_url && <img src={qrFor.qr_code_url} alt="QR" style={{ width: '240px', height: '240px', display: 'block', margin: '0 auto' }} />}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.fuchsia, textAlign: 'center', marginTop: '12px' }}>{valueStr(qrFor)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}