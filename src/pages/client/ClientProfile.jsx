import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Edit3, Check } from 'lucide-react';
import AccountSecurity from '@/components/client/AccountSecurity';

export default function ClientProfile() {
  const { client, user, theme } = useOutletContext();
  const [form, setForm] = useState({ phone: '', notes: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', mutedLow: 'rgba(0,0,0,0.5)', fuchsia: '#FF007F' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', mutedLow: 'rgba(245,240,235,0.5)', fuchsia: '#FF007F' };

  useEffect(() => {
    if (client) {
      setForm({ phone: client.phone || '', notes: client.notes || '' });
    }
  }, [client]);

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    await base44.entities.Client.update(client.id, {
      phone: form.phone,
      notes: form.notes,
    });

    base44.functions.invoke('trackUserActivity', {
      event_type: 'profile_update',
      metadata: {}
    }).catch(() => null);

    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    if (client) {
      setForm({ phone: client.phone || '', notes: client.notes || '' });
    }
    setEditing(false);
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const readOnlyStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    color: t.mutedLow,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    cursor: 'default',
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    color: t.text,
    padding: '10px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          KONTO
        </p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Twój Profil
        </h1>
      </div>

      {/* ── DANE ── */}
      <div className="pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DANE
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              <Edit3 size={13} /> EDYTUJ
            </button>
          )}
        </div>

        <div className="space-y-5">
          {/* Read-only: name & email */}
          <div>
            {label('Imię i Nazwisko')}
            <input readOnly value={client?.name || user?.full_name || ''} style={readOnlyStyle} />
          </div>
          <div>
            {label('E-mail')}
            <input readOnly value={user?.email || ''} style={readOnlyStyle} />
          </div>

          {/* Editable: phone & notes */}
          <div>
            {label('Telefon')}
            {editing ? (
              <input
                style={inputStyle}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
                onBlur={e => e.target.style.borderBottomColor = t.border}
              />
            ) : (
              <input readOnly value={form.phone || '—'} style={readOnlyStyle} />
            )}
          </div>
          <div>
            {label('Notatki / Preferencje')}
            {editing ? (
              <textarea
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Alergie, preferencje, ważne informacje..."
                onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
                onBlur={e => e.target.style.borderBottomColor = t.border}
              />
            ) : (
              <input readOnly value={form.notes || '—'} style={readOnlyStyle} />
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !client?.id}
              className="btn-oxblood flex items-center gap-2"
              style={{ opacity: (saving || !client?.id) ? 0.5 : 1 }}
            >
              {saving ? <><Loader2 size={13} className="animate-spin" /> ZAPISYWANIE...</> : 'ZAPISZ ZMIANY'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                fontSize: '10px',
                fontFamily: 'JetBrains Mono',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '13px 31px',
                background: 'transparent',
                color: t.text,
                border: `0.5px solid ${t.text}`,
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              ANULUJ
            </button>
            {saved && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em' }}>
                ✓ ZAPISANO
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── BEZPIECZEŃSTWO ── */}
      <AccountSecurity user={user} t={t} />
    </div>
  );
}