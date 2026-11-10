import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import { ArrowRight, Check, Loader2, UserPlus } from 'lucide-react';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const FIELDS = [
  { key: 'first_name', label: 'Imię *', placeholder: 'Anna' },
  { key: 'last_name', label: 'Nazwisko *', placeholder: 'Kowalska' },
  { key: 'email', label: 'E-mail *', placeholder: 'anna@example.com', type: 'email' },
  { key: 'phone', label: 'Telefon *', placeholder: '600 100 200' },
];

export default function ClientQuickAdd() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const missing = FIELDS.filter((f) => !String(form[f.key] || '').trim());
    if (missing.length > 0) {
      setError(`Uzupełnij: ${missing.map((f) => f.label.replace(' *', '').toLowerCase()).join(', ')}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('quickAddClient', form);
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }
      setResult(res.data?.status === 'exists' ? 'exists' : 'created');
    } catch (err) {
      setError('Nie udało się zapisać. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center px-8 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-lg text-center"
            style={{ border: '0.5px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '48px 32px' }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-8" style={{ border: '0.5px solid var(--brand)' }}>
              <Check size={22} color="var(--brand)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, lineHeight: 1, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>
              {result === 'created' ? 'Dziękujemy!' : 'Mamy już ten kontakt'}
            </h1>
            <p className="mt-5" style={{ fontSize: '14px', lineHeight: 1.8, color: 'rgb(var(--foreground-rgb) / 0.6)' }}>
              {result === 'created'
                ? 'Twoje dane są u nas zapisane. Odezwiemy się, gdy będziemy ustalać szczegóły sesji.'
                : 'Ten adres e-mail jest już w naszym studiu. Jeśli dane się zmieniły, napisz do nas — zaktualizujemy profil.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Link to="/" className="btn-oxblood flex items-center justify-center gap-2">
                STRONA GŁÓWNA <ArrowRight size={13} />
              </Link>
              <button onClick={() => base44.auth.redirectToLogin('/')} className="btn-ghost-parchment">
                ZALOGUJ SIĘ
              </button>
            </div>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen pt-32 pb-20 px-8 md:px-16 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={14} color="var(--brand)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>NOWY KLIENT</p>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.6rem)', fontWeight: 400, lineHeight: 0.95, color: 'hsl(var(--foreground))' }}>
            Zostaw nam kontakt
          </h1>
          <p className="mt-4 mb-10" style={{ fontSize: '14px', lineHeight: 1.8, color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
            Wypełnij dane, abyśmy mogli przygotować Twoją sesję. Wszystkie pola są wymagane.
          </p>
        </motion.div>

        <form onSubmit={submit} className="space-y-7">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label style={{ display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.45)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {field.label}
              </label>
              <input
                type={field.type || 'text'}
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => set(field.key, e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderBottomColor = 'var(--brand)')}
                onBlur={(e) => (e.target.style.borderBottomColor = 'hsl(var(--border))')}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.45)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Uwagi (opcjonalnie)
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={(e) => (e.target.style.borderBottomColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderBottomColor = 'hsl(var(--border))')}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--brand)', borderLeft: '2px solid var(--brand)', paddingLeft: '12px' }}>{error}</p>
          )}

          <button type="submit" disabled={saving} className="btn-oxblood flex items-center justify-center gap-2 w-full" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> ZAPISYWANIE...</> : 'ZAPISZ DANE'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}