import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Edit3, Check } from 'lucide-react';
import AccountSecurity from '@/components/client/AccountSecurity';
import ClientAvatar from '@/components/client/ClientAvatar';

const formFromClient = (client) => {
  const parts = (client.name || '').split(' ');
  return {
    first_name: client.first_name || parts[0] || '',
    last_name: client.last_name || parts.slice(1).join(' '),
    phone: client.phone || '',
    notes: client.notes || '',
  };
};

export default function ClientProfile() {
  const { client, user, theme, reloadClient } = useOutletContext();
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', mutedLow: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', mutedLow: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)' };

  useEffect(() => {
    if (client) {
      setForm(formFromClient(client));
    }
  }, [client]);

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    await base44.entities.Client.update(client.id, {
      first_name: form.first_name,
      last_name: form.last_name,
      name: `${form.first_name} ${form.last_name}`.trim(),
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
      setForm(formFromClient(client));
    }
    setEditing(false);
  };

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
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
    fontFamily: 'var(--font-body)',
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
    fontFamily: 'var(--font-body)',
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
          KONTO
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>
          Twój Profil
        </h1>
      </div>

      {/* ── AVATAR ── */}
      <div className="pt-6 mb-8" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
          ZDJĘCIE PROFLOWE
        </p>
        <ClientAvatar
          client={client}
          user={user}
          t={t}
          size={110}
          onSave={async (avatarUrl) => {
            if (!client?.id) return;
            await base44.entities.Client.update(client.id, { avatar_url: avatarUrl });
            if (reloadClient) await reloadClient();
          }}
        />
      </div>

      {/* ── DANE ── */}
      <div className="pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            DANE
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              <Edit3 size={13} /> EDYTUJ
            </button>
          )}
        </div>

        <div className="space-y-5">
          {/* Editable: imię i nazwisko */}
          {[['first_name', 'Imię'], ['last_name', 'Nazwisko']].map(([key, text]) => (
            <div key={key}>
              {label(text)}
              {editing ? (
                <input
                  style={inputStyle}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  onFocus={e => e.target.style.borderBottomColor = t.fuchsia}
                  onBlur={e => e.target.style.borderBottomColor = t.border}
                />
              ) : (
                <input readOnly value={form[key] || '—'} style={readOnlyStyle} />
              )}
            </div>
          ))}
          {/* E-mail jest identyfikatorem konta logowania — tylko do odczytu */}
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
                fontFamily: 'var(--font-mono)',
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em' }}>
                ✓ ZAPISANO
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── BEZPIECZEŃSTWO ── */}
      <AccountSecurity user={user} client={client} t={t} />
    </div>
  );
}