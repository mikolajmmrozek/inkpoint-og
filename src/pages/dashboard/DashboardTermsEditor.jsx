import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';

export default function DashboardTermsEditor() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' };

  const [terms, setTerms] = useState({ key: 'default', title: 'Regulamin', content: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.TermsAndConditions.filter({ key: 'default' })
      .then(data => {
        if (data.length > 0) setTerms(data[0]);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (terms.id) {
        await base44.entities.TermsAndConditions.update(terms.id, {
          title: terms.title,
          content: terms.content,
          last_updated: new Date().toISOString().split('T')[0],
        });
      } else {
        await base44.entities.TermsAndConditions.create({
          ...terms,
          last_updated: new Date().toISOString().split('T')[0],
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    color: t.text,
    outline: 'none',
    fontFamily: 'var(--font-body)',
    width: '100%',
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  return (
    <div>
      <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '20px' }}>
        <div className="mb-6">
          <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Tytuł
          </label>
          <input
            type="text"
            value={terms.title}
            onChange={e => setTerms({ ...terms, title: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div className="mb-6">
          <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Treść (HTML lub zwykły tekst)
          </label>
          <textarea
            value={terms.content}
            onChange={e => setTerms({ ...terms, content: e.target.value })}
            rows={20}
            style={{
              background: 'transparent',
              border: `0.5px solid ${t.border}`,
              padding: '12px',
              fontSize: '13px',
              color: t.text,
              outline: 'none',
              fontFamily: 'var(--font-body)',
              width: '100%',
              resize: 'vertical',
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-oxblood"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'ZAPISYWANIE...' : saved ? '✓ ZAPISANO' : 'ZAPISZ REGULAMIN'}
        </button>
      </div>
    </div>
  );
}