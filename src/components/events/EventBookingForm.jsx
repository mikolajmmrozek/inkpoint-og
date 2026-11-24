import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Check, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice, formatSessionDate, formatSessionTime } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' };

export default function EventBookingForm({ event, session, spots, user, onClose, onBooked }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const full = spots?.full;

  const submit = async () => {
    setError('');
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Uzupełnij imię, nazwisko, e-mail i telefon.');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('createEventBooking', {
        event_id: event.id,
        session_id: session.id,
        ...form,
      });
      if (res.data?.error) {
        setError(res.data.message || res.data.error);
        return;
      }
      setDone(true);
      if (onBooked) onBooked();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || 'Nie udało się zapisać. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgb(var(--foreground-rgb) / 0.04)',
    border: '0.5px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    padding: '11px 12px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    borderRadius: 'var(--radius)',
  };
  const labelStyle = { ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.5)', display: 'block', marginBottom: '5px' };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.78)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'hsl(var(--background))', border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '28px' }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>ZAPIS NA WYDARZENIE</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', lineHeight: 1.05, letterSpacing: '0.04em', color: 'hsl(var(--foreground))', marginTop: '6px' }}>
              {event.title}
            </h2>
            <p style={{ ...mono, fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.55)', marginTop: '8px' }}>
              {formatSessionDate(session.date)} · {formatSessionTime(session)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--foreground-rgb) / 0.5)' }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Check size={16} color="#16a34a" />
              <p style={{ ...mono, fontSize: '10px', color: '#16a34a' }}>ZAPIS PRZYJĘTY</p>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgb(var(--foreground-rgb) / 0.7)' }}>
              Twoje zgłoszenie zostało zapisane i oczekuje na potwierdzenie przez studio. Potwierdzenie otrzymasz e-mailem na adres {form.email}.
            </p>
            <button onClick={onClose} className="btn-oxblood mt-6 w-full">ZAMKNIJ</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={labelStyle}>Imię *</label>
                <input style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nazwisko *</label>
                <input style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <label style={labelStyle}>E-mail *</label>
              <input type="email" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="mb-4">
              <label style={labelStyle}>Telefon *</label>
              <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Uwagi (opcjonalnie)</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'none' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div className="flex items-center justify-between py-3 mb-4" style={{ borderTop: '0.5px solid hsl(var(--border))', borderBottom: '0.5px solid hsl(var(--border))' }}>
              <span style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
                <Users size={11} className="inline mr-1" />
                {full ? 'Brak wolnych miejsc' : `Wolne miejsca: ${spots?.left} / ${spots?.capacity}`}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--brand)' }}>{formatPrice(event.price)}</span>
            </div>

            {error && (
              <p className="mb-4" style={{ ...mono, fontSize: '9px', color: '#ef4444', lineHeight: 1.6 }}>{error}</p>
            )}

            <button
              onClick={submit}
              disabled={saving || full}
              className="btn-oxblood w-full flex items-center justify-center gap-2"
              style={{ opacity: saving || full ? 0.5 : 1, cursor: saving || full ? 'not-allowed' : 'pointer' }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {full ? 'BRAK WOLNYCH MIEJSC' : saving ? 'ZAPISYWANIE...' : 'ZAREZERWUJ MIEJSCE'}
            </button>
            <p style={{ ...mono, fontSize: '8px', color: 'rgb(var(--foreground-rgb) / 0.4)', marginTop: '10px', lineHeight: 1.7 }}>
              Miejsce potwierdza studio. Nie wymagamy zakładania konta.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}