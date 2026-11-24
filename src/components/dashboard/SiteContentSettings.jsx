import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Check, GripVertical, Lock, CalendarCheck } from 'lucide-react';
import { NAV_TABS, normalizeNavOrder } from '@/lib/siteNav';

const mono = { fontFamily: 'var(--font-mono)' };

export default function SiteContentSettings({ t }) {
  const [record, setRecord] = useState(null);
  const [order, setOrder] = useState(NAV_TABS.map(item => item.key));
  const [dragKey, setDragKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'content' })
      .then(list => {
        const r = list[0] || { key: 'content' };
        setRecord(r);
        setOrder(normalizeNavOrder(r.nav_order));
      })
      .catch(() => setRecord({ key: 'content' }));
  }, []);

  const isOn = (field) => record?.[field] !== false;
  const toggle = (field) => setRecord(r => ({ ...r, [field]: r?.[field] === false }));

  const reorder = (fromKey, toKey) => {
    setOrder(prev => {
      const from = prev.indexOf(fromKey);
      const to = prev.indexOf(toKey);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        key: 'content',
        show_blog: isOn('show_blog'),
        show_faq: isOn('show_faq'),
        show_shop: isOn('show_shop'),
        show_booking: isOn('show_booking'),
        nav_order: order,
      };
      if (record?.id) await base44.entities.SiteSettings.update(record.id, payload);
      else {
        const created = await base44.entities.SiteSettings.create(payload);
        setRecord(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!record) return <div className="flex justify-center py-16"><div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} /></div>;

  const pinnedRow = (label, hint) => (
    <div className="flex items-center gap-3 py-3" style={{ borderTop: `0.5px solid ${t.border}`, opacity: 0.7 }}>
      <Lock size={11} color={t.muted} style={{ flexShrink: 0 }} />
      <span style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text }}>{label}</span>
      <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.04em' }}>{hint}</span>
    </div>
  );

  return (
    <div className="max-w-2xl" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '32px', borderRadius: 'var(--radius)' }}>
      <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
        ZAWARTOŚĆ STRONY
      </p>
      <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.05em', lineHeight: 1.8, marginBottom: '22px' }}>
        Przeciągnij karty, aby ustawić kolejność zakładek w pasku, menu i stopce. Home jest zawsze pierwszy, Kontakt zawsze ostatni. Odznaczone sekcje znikają z nawigacji i ze strony.
      </p>

      {pinnedRow('Home', 'zawsze pierwszy')}

      {order.map(key => {
        const tab = NAV_TABS.find(item => item.key === key);
        if (!tab) return null;
        const on = tab.field ? isOn(tab.field) : true;
        return (
          <div
            key={key}
            draggable
            onDragStart={() => setDragKey(key)}
            onDragEnd={() => setDragKey(null)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => dragKey && reorder(dragKey, key)}
            className="flex items-center gap-3 py-3"
            style={{
              borderTop: `0.5px solid ${t.border}`,
              cursor: 'grab',
              opacity: dragKey === key ? 0.4 : 1,
              background: dragKey === key ? 'rgb(var(--brand-rgb) /0.05)' : 'transparent',
            }}
          >
            <GripVertical size={13} color={t.muted} style={{ flexShrink: 0 }} />
            <span style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: on ? t.text : t.muted, flex: 1 }}>
              {tab.label}
            </span>
            {tab.field ? (
              <button
                onClick={() => toggle(tab.field)}
                title={on ? 'Ukryj zakładkę' : 'Pokaż zakładkę'}
                className="flex items-center gap-1.5"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: on ? '#16a34a' : t.muted,
                }}
              >
                {on ? <Eye size={11} /> : <EyeOff size={11} />} {on ? 'widoczne' : 'ukryte'}
              </button>
            ) : (
              <span style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#16a34a' }}>
                <Eye size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />zawsze widoczne
              </span>
            )}
          </div>
        );
      })}

      {pinnedRow('Kontakt', 'zawsze ostatni')}

      <button
        onClick={() => toggle('show_booking')}
        className="flex items-center gap-3 w-full text-left py-3 mt-2"
        style={{ background: 'none', border: 'none', borderTop: `0.5px solid ${t.border}`, cursor: 'pointer' }}
      >
        <CalendarCheck size={13} color={t.muted} style={{ flexShrink: 0 }} />
        <span className="min-w-0 flex-1">
          <span style={{ display: 'block', ...mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isOn('show_booking') ? t.text : t.muted }}>
            Rezerwowanie wizyt — {isOn('show_booking') ? 'widoczne' : 'ukryte'}
          </span>
          <span style={{ display: 'block', ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.04em', lineHeight: 1.8, marginTop: '4px' }}>
            Formularz rezerwacji online i przyciski „Umów Sesję”. Nie jest zakładką w nawigacji.
          </span>
        </span>
        <span style={{ width: '14px', height: '14px', flexShrink: 0, border: `0.5px solid ${isOn('show_booking') ? '#16a34a' : t.border}`, background: isOn('show_booking') ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isOn('show_booking') && <Check size={10} color="#fff" />}
        </span>
      </button>

      <div className="pt-5 mt-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <button onClick={save} disabled={saving} className="btn-oxblood">
          {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ ZMIANY'}
        </button>
      </div>
    </div>
  );
}