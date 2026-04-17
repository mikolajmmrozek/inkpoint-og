import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, User, X, Edit, Trash2 } from 'lucide-react';
import { useTheme } from './Dashboard';

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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const [c, b] = await Promise.all([
      base44.entities.Client.list('-created_date', 300),
      base44.entities.Booking.list('-session_date', 300),
    ]);
    setClients(c);
    setBookings(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const clientBookings = (clientName, clientEmail) =>
    bookings.filter(b => b.client_name === clientName || (clientEmail && b.client_email === clientEmail));

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
    if (selected?.id === id) setSelected(null);
  };

  const openEdit = (client) => { setForm({ ...client }); setEditing(client); };
  const openNew = () => { setForm({ name: '', email: '', phone: '', notes: '' }); setEditing('new'); };

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
          <div className="relative flex items-center">
            <Search size={12} style={{ position: 'absolute', left: '10px', color: t.muted, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Szukaj klienta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, borderBottom: `0.5px solid ${t.border}`, color: t.text, paddingLeft: '30px', paddingRight: '10px', width: '220px', fontSize: '12px' }}
              onFocus={e => e.target.style.borderBottomColor = '#FF007F'}
              onBlur={e => e.target.style.borderBottomColor = t.border}
            />
          </div>
          <button onClick={openNew} className="btn-oxblood" style={{ padding: '10px 18px', fontSize: '10px' }}>
            + NOWY KLIENT
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.75rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {editing === 'new' ? 'Nowy Klient' : 'Edytuj Klienta'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div>{label('Imię i Nazwisko *')}<input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} /></div>
              <div>{label('Email')}<input type="email" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} /></div>
              <div>{label('Telefon')}<input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} /></div>
              <div>{label('Notatki')}<textarea rows={3} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} /></div>
            </div>
            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={!form.name} className="btn-oxblood flex-1" style={{ opacity: !form.name ? 0.5 : 1 }}>ZAPISZ</button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* List */}
        <div className="flex-1 min-w-0" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                {search ? 'BRAK WYNIKÓW' : 'BRAK KLIENTÓW'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const sessions = clientBookings(client.name, client.email);
            return (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 cursor-pointer transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === client.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
                onClick={() => setSelected(client)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center" style={{ border: `0.5px solid ${t.border}` }}>
                    <User size={12} color={t.fuchsia} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</p>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '2px' }}>
                      {client.email}{client.phone ? ` · ${client.phone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {sessions.length > 0 && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.08em' }}>
                      {sessions.length} {sessions.length === 1 ? 'sesja' : 'sesji'}
                    </span>
                  )}
                  <button onClick={e => { e.stopPropagation(); openEdit(client); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Edit size={13} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(client.id); }} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const sessions = clientBookings(selected.name, selected.email);
          return (
            <div className="w-72 flex-shrink-0" style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
              <div className="flex justify-between items-start mb-4 pb-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <div>
                  <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>{selected.name}</h3>
                  {selected.email && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>{selected.email}</p>}
                  {selected.phone && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>{selected.phone}</p>}
                </div>
                <button onClick={() => setSelected(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
              </div>

              {selected.notes && (
                <div className="mb-4 pb-4" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>NOTATKI</p>
                  <p style={{ color: t.muted, fontSize: '12px', lineHeight: 1.7 }}>{selected.notes}</p>
                </div>
              )}

              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                HISTORIA SESJI ({sessions.length})
              </p>
              {sessions.length === 0 ? (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>BRAK SESJI</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(b => (
                    <div key={b.id} className="p-3" style={{ border: `0.5px solid ${t.border}` }}>
                      <p style={{ color: t.text, fontSize: '12px', fontWeight: 500 }}>{b.session_date} {b.session_time ? `· ${b.session_time}` : ''}</p>
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>
                        {b.artist_name}{b.tattoo_placement ? ` · ${b.tattoo_placement}` : ''}
                      </p>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: b.status === 'completed' ? '#16a34a' : t.fuchsia, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => openEdit(selected)} className="btn-ghost-parchment w-full mt-4" style={{ fontSize: '9px', padding: '10px' }}>
                EDYTUJ DANE KLIENTA
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}