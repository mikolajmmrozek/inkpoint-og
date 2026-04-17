import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Search, Edit2, Trash2, X, Plus } from 'lucide-react';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

export default function DashboardClients() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const data = await base44.entities.Client.list('-created_date', 200);
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const openEdit = (c) => { setForm({ ...c }); setEditing(c); };
  const openNew = () => { setForm({ name: '', email: '', phone: '', notes: '', total_sessions: 0 }); setEditing('new'); };

  const handleSave = async () => {
    if (editing === 'new') {
      await base44.entities.Client.create(form);
    } else {
      await base44.entities.Client.update(editing.id, form);
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Client.delete(id);
    setClients(c => c.filter(x => x.id !== id));
  };

  const inp = (field) => ({
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>BAZA DANYCH</p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Klienci</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex items-center" style={{ border: `0.5px solid ${t.border}`, padding: '8px 14px', gap: '8px', minWidth: '220px' }}>
            <Search size={12} color={t.muted} />
            <input
              placeholder="Szukaj..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '13px', fontFamily: 'Inter', width: '100%' }}
            />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '10px 20px' }}>
            <Plus size={13} /> NOWY KLIENT
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Łączna liczba klientów', value: clients.length },
          { label: 'Powracający (2+ sesji)', value: clients.filter(c => (c.total_sessions || 0) >= 2).length },
        ].map(s => (
          <div key={s.label} className="px-5 py-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2rem', fontWeight: 400, color: t.fuchsia, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Imię i Nazwisko', 'Email', 'Telefon', 'Sesje', ''].map((h, i) => (
              <p key={i} className={i === 0 ? 'col-span-4' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-1' : 'col-span-2 text-right'} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK KLIENTÓW</p>
            </div>
          ) : filtered.map((c, i) => (
            <div key={c.id} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
              <div className="col-span-4">
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{c.name}</p>
                {c.notes && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</p>}
              </div>
              <p className="col-span-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.04em' }}>{c.email || '—'}</p>
              <p className="col-span-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted }}>{c.phone || '—'}</p>
              <div className="col-span-1">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: (c.total_sessions || 0) >= 2 ? t.fuchsia : t.muted, fontWeight: 600 }}>{c.total_sessions || 0}</span>
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <button onClick={() => openEdit(c)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(c.id)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {editing === 'new' ? 'Nowy Klient' : 'Edytuj Klienta'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div>{label('Imię i Nazwisko *')}<input {...inp('name')} /></div>
              <div className="grid grid-cols-2 gap-5">
                <div>{label('Email')}<input type="email" {...inp('email')} /></div>
                <div>{label('Telefon')}<input {...inp('phone')} /></div>
              </div>
              <div>{label('Liczba sesji')}<input type="number" {...inp('total_sessions')} /></div>
              <div>{label('Notatki')}
                <textarea rows={3} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
              </div>
            </div>
            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={!form.name} className="btn-oxblood flex-1" style={{ opacity: !form.name ? 0.5 : 1 }}>ZAPISZ</button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}