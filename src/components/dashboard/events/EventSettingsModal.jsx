import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { invalidateEventSettings } from '@/hooks/useEventSettings';
import EventCategoriesPanel from '@/components/dashboard/events/EventCategoriesPanel';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' };

export default function EventSettingsModal({ categories = [], theme, onClose, onSaved, onReload }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', field: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', field: 'rgba(255,255,255,0.04)' };

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.EventSettings.filter({ key: 'default' })
      .then(list => setSettings(list[0] || { key: 'default' }))
      .catch(() => setSettings({ key: 'default' }));
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        key: 'default',
        booking_enabled: settings.booking_enabled !== false,
        home_events_label: settings.home_events_label ?? '',
        home_events_heading: settings.home_events_heading ?? '',
        home_events_text: settings.home_events_text ?? '',
      };
      if (settings.id) await base44.entities.EventSettings.update(settings.id, payload);
      else await base44.entities.EventSettings.create(payload);
      invalidateEventSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (e) {
      setError(e?.message || 'Nie udało się zapisać ustawień ofert.');
    } finally {
      setSaving(false);
    }
  };

  const input = {
    width: '100%', background: t.field, border: `0.5px solid ${t.border}`, color: t.text,
    padding: '9px 10px', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 'var(--radius)',
  };
  const label = { ...mono, fontSize: '8px', color: t.muted, display: 'block', marginBottom: '4px' };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '26px' }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>USTAWIENIA OFERT</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: t.title, lineHeight: 1.05, marginTop: '4px' }}>
              Wspólne dla wszystkich
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        {!settings ? (
          <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin" color="var(--brand)" /></div>
        ) : (
          <>
            <button
              onClick={() => set('booking_enabled', settings.booking_enabled === false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: '9px',
                letterSpacing: '0.1em', color: settings.booking_enabled !== false ? '#16a34a' : t.muted,
                display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px',
              }}
            >
              <span style={{
                width: '12px', height: '12px',
                border: `0.5px solid ${settings.booking_enabled !== false ? '#16a34a' : t.border}`,
                background: settings.booking_enabled !== false ? '#16a34a' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {settings.booking_enabled !== false && <Check size={9} color="#fff" />}
              </span>
              Oferty przyjmują rezerwacje online
            </button>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, lineHeight: 1.7, marginBottom: '22px' }}>
              Wyłączone = klient widzi ofertę, ale nie może wysłać zapisu. Zapis przez panel działa zawsze.
            </p>

            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px' }}>
              <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '12px' }}>SEKCJA OFERT NA STRONIE GŁÓWNEJ</p>
              <div className="space-y-4">
                <div>
                  <label style={label}>Nadtytuł</label>
                  <input style={input} value={settings.home_events_label ?? ''} placeholder="OFERTY" onChange={e => set('home_events_label', e.target.value)} />
                </div>
                <div>
                  <label style={label}>Nagłówek</label>
                  <input style={input} value={settings.home_events_heading ?? ''} placeholder="Warsztaty i wydarzenia" onChange={e => set('home_events_heading', e.target.value)} />
                </div>
                <div>
                  <label style={label}>Opis</label>
                  <textarea rows={3} style={{ ...input, resize: 'vertical' }} value={settings.home_events_text ?? ''} placeholder="Szkolenia i spotkania prowadzone przez naszych artystów…" onChange={e => set('home_events_text', e.target.value)} />
                </div>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, lineHeight: 1.7 }}>
                  Puste pole = tekst domyślny. Na stronie głównej pokazujemy oferty wyróżnione gwiazdką, a gdy żadnej nie ma — losowy wybór.
                </p>
              </div>
            </div>

            <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '18px', marginTop: '20px' }}>
              <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '12px' }}>KATEGORIE OFERT</p>
              <EventCategoriesPanel categories={categories} theme={theme} onReload={onReload} />
            </div>

            {error && <p style={{ ...mono, fontSize: '9px', color: '#ef4444', marginTop: '14px', lineHeight: 1.6 }}>{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving} className="btn-oxblood flex items-center gap-2" style={{ padding: '10px 18px', opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
                {saved ? 'ZAPISANO' : 'ZAPISZ USTAWIENIA'}
              </button>
              <button onClick={onClose} className="btn-ghost-parchment">ZAMKNIJ</button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}