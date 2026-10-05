import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ClaimVoucherForm({ onClaimed }) {
  const { theme } = useOutletContext();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = theme === 'light'
    ? { border: '#E5E5E5', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)', panelBg: '#FAFAFA' }
    : { border: '#262626', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)', panelBg: '#141414' };

  const close = () => { setOpen(false); setCode(''); setError(''); };

  const handleClaim = async () => {
    setError('');
    if (!code.trim()) {
      setError('Podaj kod vouchera');
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('managePromotion', { action: 'claim', code: code.trim() });
      close();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      onClaimed();
    } catch (e) {
      setError(e?.response?.data?.error || 'Nie udało się dodać vouchera');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.border}`, color: t.text,
    padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none',
    fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase',
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Dostałeś voucher od studia?
        </p>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}
          >
            <Plus size={12} /> DODAJ VOUCHER
          </button>
        )}
      </div>

      {success && (
        <p className="mt-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em' }}>
          ✓ VOUCHER DODANY DO TWOJEGO KONTA
        </p>
      )}

      {open && (
        <div className="p-5 mt-3" style={{ border: `0.5px solid ${t.border}`, background: t.panelBg }}>
          <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5, marginBottom: '16px' }}>
            Wpisz kod z vouchera. Po dodaniu pojawi się na Twojej liście poniżej.
          </p>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <input
              style={inputStyle}
              placeholder="KOD VOUCHERA"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleClaim(); }}
              onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleClaim} disabled={submitting} className="btn-oxblood flex items-center gap-2" style={{ opacity: submitting ? 0.5 : 1, padding: '12px 24px' }}>
                {submitting ? <><Loader2 size={13} className="animate-spin" /> DODAWANIE...</> : 'DODAJ'}
              </button>
              <button
                onClick={close}
                style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 20px', background: 'transparent', color: t.text, border: `0.5px solid ${t.text}`, cursor: 'pointer' }}
              >
                ANULUJ
              </button>
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-2 mt-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}