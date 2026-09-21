import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Gift, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import ClientEmailPicker from '@/components/dashboard/ClientEmailPicker';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const pad = (n) => String(n).padStart(2, '0');
const defaultExpiry = (type) => {
  const d = new Date();
  d.setMonth(d.getMonth() + (type === 'voucher' ? 6 : 1));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toISO = (dateStr) => (dateStr ? new Date(`${dateStr}T00:00:00`).toISOString() : undefined);

const EMPTY = {
  type: 'voucher',
  code: '',
  value_type: 'amount',
  value: '',
  usage_mode: 'single',
  expires_at: '',
  is_active: true,
  assigned_client_email: '',
  assignment_permanent: false,
  assigned_until: '',
  send_email: false,
  email_to: '',
};

export default function QuickPromotionModal({ onClose, onSaved, t, theme }) {
  const isLight = theme === 'light';
  const [form, setForm] = useState({ ...EMPTY, expires_at: defaultExpiry('voucher') });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.value || Number(form.value) <= 0) { toast({ title: 'Podaj wartość', variant: 'destructive' }); return; }
    if (!form.expires_at) { toast({ title: 'Podaj datę ważności', variant: 'destructive' }); return; }
    if (form.send_email && !form.email_to) { toast({ title: 'Podaj e-mail odbiorcy', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('managePromotion', {
        action: 'create',
        type: form.type,
        code: form.code.trim() || undefined,
        value_type: form.type === 'discount' ? form.value_type : 'amount',
        value: Number(form.value),
        usage_mode: form.usage_mode,
        expires_at: toISO(form.expires_at),
        assigned_client_email: form.assigned_client_email,
        assignment_permanent: form.assignment_permanent,
        assigned_until: form.type === 'discount' && form.assigned_until ? toISO(form.assigned_until) : undefined,
        is_active: form.type === 'discount' ? form.is_active : undefined,
        send_email: form.send_email,
        email_to: form.send_email ? form.email_to : undefined,
      });
      if (res?.data?.email?.error) toast({ title: 'Utworzono, ale e-mail nie wysłany', description: res.data.email.error, variant: 'destructive' });
      else toast({ title: form.type === 'voucher' ? 'Voucher utworzony' : 'Kod zniżkowy utworzony' });
      onSaved?.(res?.data?.promotion);
    } catch (e) {
      toast({ title: 'Błąd', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );
  const inp = (field, type = 'text') => ({
    type,
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] ?? '',
    onChange: e => set(field, e.target.value),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg max-h-screen overflow-y-auto"
        style={{ border: `0.5px solid ${t.border}`, background: isLight ? '#FFFFFF' : '#0A0A0A', padding: '36px', borderRadius: 'var(--radius)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>NOWA PROMOCJA</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>{form.type === 'voucher' ? 'Voucher' : 'Kod zniżkowy'}</h3>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="space-y-6">
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TYP</p>
            <div className="flex gap-2">
              {[['voucher', 'VOUCHER NA OKAZICIELA'], ['discount', 'KOD ZNIŻKOWY']].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v, value_type: v === 'voucher' ? 'amount' : f.value_type, expires_at: f.expires_at || defaultExpiry(v) }))} style={{ flex: 1, border: `0.5px solid ${form.type === v ? 'var(--brand)' : t.border}`, color: form.type === v ? 'var(--brand)' : t.muted, background: form.type === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px', cursor: 'pointer' }}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KOD</p>
            {label('Kod (puste = auto-generacja)')}
            <input
              type="text"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="np. SUMMER25"
              maxLength="20"
              style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}
              onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
          </div>

          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>WARTOŚĆ</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                {label('Typ wartości')}
                <select value={form.value_type} onChange={e => set('value_type', e.target.value)} disabled={form.type === 'voucher'} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: isLight ? 'light' : 'dark' }}>
                  <option value="amount">Kwota PLN</option>
                  {form.type === 'discount' && <option value="percent">Procent</option>}
                </select>
              </div>
              <div>
                {label(form.value_type === 'percent' ? 'Procent %' : 'Kwota PLN')}
                <input {...inp('value', 'number')} />
              </div>
            </div>
            <div>
              {label('Tryb użycia')}
              <div className="flex gap-2">
                {[['single', 'JEDNORAZOWY'], ['multi', 'WIELORAZOWY']].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set('usage_mode', v)} style={{ border: `0.5px solid ${form.usage_mode === v ? 'var(--brand)' : t.border}`, color: form.usage_mode === v ? 'var(--brand)' : t.muted, background: form.usage_mode === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer' }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>WAŻNOŚĆ</p>
            <div>{label('Ważny do')}<input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: isLight ? 'light' : 'dark' }} /></div>
            <button type="button" onClick={() => set('expires_at', defaultExpiry(form.type))} className="mt-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {form.type === 'voucher' ? 'DOMYŚLNIE +6 MIES.' : 'DOMYŚLNIE +1 MIES.'}
            </button>
          </div>

          {form.type === 'discount' && (
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>USTAWIENIA</p>
              <div className="mb-4">
                <button type="button" onClick={() => set('is_active', !form.is_active)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active ? '#16a34a' : t.muted }}>
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active ? '#16a34a' : t.border}`, background: form.is_active ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_active && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
                  {form.is_active ? 'Włączony' : 'Wyłączony'}
                </button>
              </div>
              <div className="mb-4">{label('Przypisz do klienta (opcjonalne)')}<ClientEmailPicker value={form.assigned_client_email} onChange={v => set('assigned_client_email', v)} t={t} /></div>
              <div className="mb-4">
                <button type="button" onClick={() => set('assignment_permanent', !form.assignment_permanent)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.assignment_permanent ? '#16a34a' : t.muted }}>
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.assignment_permanent ? '#16a34a' : t.border}`, background: form.assignment_permanent ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.assignment_permanent && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
                  Przypisanie stałe
                </button>
              </div>
              {!form.assignment_permanent && (
                <div>{label('Przypisany do (data)')}<input type="date" value={form.assigned_until} onChange={e => set('assigned_until', e.target.value)} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: isLight ? 'light' : 'dark' }} /></div>
              )}
            </div>
          )}

          {form.type === 'voucher' && (
            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>PRZYPISANIE</p>
              <div>{label('Przypisz do klienta (opcjonalne)')}<ClientEmailPicker value={form.assigned_client_email} onChange={v => set('assigned_client_email', v)} t={t} /></div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em', marginTop: '8px' }}>Voucher przypisuje się na stałe.</p>
            </div>
          )}

          <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
            <button type="button" onClick={() => set('send_email', !form.send_email)} className="flex items-center gap-2 mb-3" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.send_email ? '#16a34a' : t.muted }}>
              <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.send_email ? '#16a34a' : t.border}`, background: form.send_email ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.send_email && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
              Wyślij e-mailem po utworzeniu
            </button>
            {form.send_email && <div>{label('E-mail odbiorcy')}<ClientEmailPicker value={form.email_to} onChange={v => set('email_to', v)} t={t} /></div>}
          </div>
        </div>

        <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={handleSave} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />} {saving ? 'ZAPISYWANIE...' : 'UTWÓRZ'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}