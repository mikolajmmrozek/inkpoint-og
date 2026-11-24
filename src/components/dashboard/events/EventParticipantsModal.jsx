import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Download, Mail, Phone, Loader2, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, downloadBookingsCsv,
  formatSessionDate, formatSessionTime, sessionSpots,
} from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' };

export default function EventParticipantsModal({ event, sessions, bookings, theme, onClose, onReload }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', field: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', field: 'rgba(255,255,255,0.04)' };

  const eventSessions = sessions.filter(s => s.event_id === event.id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const eventBookings = bookings.filter(b => b.event_id === event.id);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState({
    session_id: eventSessions[0]?.id || '', first_name: '', last_name: '', email: '', phone: '', notes: '', status: 'pending',
  });

  const rows = useMemo(
    () => (sessionFilter === 'all' ? eventBookings : eventBookings.filter(b => b.session_id === sessionFilter))
      .sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '')),
    [eventBookings, sessionFilter]
  );

  const call = async (payload) => {
    setError('');
    const res = await base44.functions.invoke('manageEventBooking', payload);
    if (res.data?.error) {
      setError(res.data.error);
      return null;
    }
    onReload();
    return res.data;
  };

  const changeStatus = async (booking, status) => {
    setBusy(booking.id);
    try { await call({ action: 'update_status', booking_id: booking.id, status }); }
    finally { setBusy(''); }
  };

  const remove = async (booking) => {
    if (!window.confirm(`Usunąć zapis ${booking.client_name}?`)) return;
    setBusy(booking.id);
    try { await call({ action: 'delete', booking_id: booking.id }); }
    finally { setBusy(''); }
  };

  const saveEdit = async (booking) => {
    setBusy(booking.id);
    try {
      const res = await call({ action: 'update', booking_id: booking.id, data: draft });
      if (res) setEditId(null);
    } finally { setBusy(''); }
  };

  const addParticipant = async () => {
    if (!newRow.session_id || !newRow.first_name || !newRow.email) {
      setError('Wybierz termin oraz podaj imię i e-mail.');
      return;
    }
    setBusy('add');
    try {
      const res = await call({ action: 'add', event_id: event.id, ...newRow });
      if (res) {
        setAdding(false);
        setNewRow({ session_id: eventSessions[0]?.id || '', first_name: '', last_name: '', email: '', phone: '', notes: '', status: 'pending' });
      }
    } finally { setBusy(''); }
  };

  const input = {
    width: '100%', background: t.field, border: `0.5px solid ${t.border}`, color: t.text,
    padding: '7px 9px', fontSize: '12px', outline: 'none', borderRadius: 'var(--radius)',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '24px' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>UCZESTNICY</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', letterSpacing: '0.04em', color: t.title, lineHeight: 1.05, marginTop: '3px' }}>{event.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        {/* Obłożenie */}
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {eventSessions.map(s => {
            const spots = sessionSpots(s, eventBookings);
            const pct = spots.capacity > 0 ? Math.min(100, Math.round((spots.taken / spots.capacity) * 100)) : 0;
            return (
              <div key={s.id} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                <p style={{ ...mono, fontSize: '9px', color: t.text }}>{formatSessionDate(s.date)} · {formatSessionTime(s)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span style={{ ...mono, fontSize: '10px', color: spots.full ? '#ef4444' : 'var(--brand)' }}>{spots.taken}/{spots.capacity}</span>
                  <span style={{ ...mono, fontSize: '8px', color: t.muted }}>wolne: {spots.left}</span>
                </div>
                <div style={{ height: '3px', background: t.border, marginTop: '6px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: spots.full ? '#ef4444' : 'var(--brand)' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtry / akcje */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)} style={{ ...input, width: 'auto', minWidth: '190px' }}>
            <option value="all">Wszystkie terminy</option>
            {eventSessions.map(s => <option key={s.id} value={s.id}>{formatSessionDate(s.date, false)} · {formatSessionTime(s)}</option>)}
          </select>
          <button onClick={() => setAdding(v => !v)} style={{ ...mono, fontSize: '9px', padding: '7px 11px', border: `0.5px solid ${t.border}`, color: t.text, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius)' }}>
            <Plus size={11} /> Dodaj uczestnika
          </button>
          <button onClick={() => downloadBookingsCsv(event.title, rows)} style={{ ...mono, fontSize: '9px', padding: '7px 11px', border: `0.5px solid ${t.border}`, color: t.text, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius)' }}>
            <Download size={11} /> CSV
          </button>
        </div>

        {adding && (
          <div className="p-3 mb-4" style={{ border: `0.5px solid ${t.border}`, background: t.field, borderRadius: 'var(--radius)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={newRow.session_id} onChange={e => setNewRow(r => ({ ...r, session_id: e.target.value }))} style={input}>
                <option value="">— termin —</option>
                {eventSessions.map(s => <option key={s.id} value={s.id}>{formatSessionDate(s.date, false)} · {formatSessionTime(s)}</option>)}
              </select>
              <input placeholder="Imię" value={newRow.first_name} onChange={e => setNewRow(r => ({ ...r, first_name: e.target.value }))} style={input} />
              <input placeholder="Nazwisko" value={newRow.last_name} onChange={e => setNewRow(r => ({ ...r, last_name: e.target.value }))} style={input} />
              <input placeholder="E-mail" value={newRow.email} onChange={e => setNewRow(r => ({ ...r, email: e.target.value }))} style={input} />
              <input placeholder="Telefon" value={newRow.phone} onChange={e => setNewRow(r => ({ ...r, phone: e.target.value }))} style={input} />
              <select value={newRow.status} onChange={e => setNewRow(r => ({ ...r, status: e.target.value }))} style={input}>
                <option value="pending">Oczekuje</option>
                <option value="confirmed">Potwierdzona</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addParticipant} disabled={busy === 'add'} className="btn-oxblood" style={{ fontSize: '9px', padding: '8px 14px' }}>
                {busy === 'add' ? 'DODAWANIE...' : 'DODAJ'}
              </button>
              <button onClick={() => setAdding(false)} style={{ ...mono, fontSize: '9px', color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Anuluj</button>
            </div>
          </div>
        )}

        {error && <p className="mb-3" style={{ ...mono, fontSize: '9px', color: '#ef4444' }}>{error}</p>}

        {/* Lista */}
        {rows.length === 0 ? (
          <p style={{ ...mono, fontSize: '10px', color: t.muted, padding: '20px 0' }}>Brak zapisanych uczestników.</p>
        ) : (
          <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {rows.map((b, i) => (
              <div key={b.id} style={{ borderTop: i === 0 ? 'none' : `0.5px solid ${t.border}`, padding: '12px' }}>
                {editId === b.id ? (
                  <div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input style={input} value={draft.first_name ?? b.first_name ?? ''} onChange={e => setDraft(d => ({ ...d, first_name: e.target.value }))} placeholder="Imię" />
                      <input style={input} value={draft.last_name ?? b.last_name ?? ''} onChange={e => setDraft(d => ({ ...d, last_name: e.target.value }))} placeholder="Nazwisko" />
                      <input style={input} value={draft.email ?? b.email ?? ''} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="E-mail" />
                      <input style={input} value={draft.phone ?? b.phone ?? ''} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="Telefon" />
                    </div>
                    <textarea rows={2} style={{ ...input, marginTop: '8px', resize: 'none' }} value={draft.notes ?? b.notes ?? ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Uwagi" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveEdit(b)} disabled={busy === b.id} className="btn-oxblood" style={{ fontSize: '8px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {busy === b.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} ZAPISZ
                      </button>
                      <button onClick={() => setEditId(null)} style={{ ...mono, fontSize: '8px', color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: t.text, fontWeight: 600 }}>{b.client_name}</p>
                      <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '3px' }}>
                        {formatSessionDate(b.session_date, false)} · {b.session_start_time || '—'} · {b.participants || 1} os.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {b.email && <a href={`mailto:${b.email}`} style={{ ...mono, fontSize: '8px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Mail size={9} /> {b.email}</a>}
                        {b.phone && <a href={`tel:${String(b.phone).replace(/\s/g, '')}`} style={{ ...mono, fontSize: '8px', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Phone size={9} /> {b.phone}</a>}
                      </div>
                      {b.notes && <p style={{ fontSize: '11px', color: t.muted, marginTop: '4px', lineHeight: 1.5 }}>{b.notes}</p>}
                      {b.source === 'online' && <p style={{ ...mono, fontSize: '7px', color: t.muted, marginTop: '3px' }}>ZAPIS ONLINE</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={b.status}
                        onChange={e => changeStatus(b, e.target.value)}
                        disabled={busy === b.id}
                        style={{
                          ...mono, fontSize: '8px', padding: '5px 7px', background: 'transparent',
                          border: `0.5px solid ${BOOKING_STATUS_COLORS[b.status]}`, color: BOOKING_STATUS_COLORS[b.status],
                          cursor: 'pointer', borderRadius: 'var(--radius)',
                        }}
                      >
                        {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button onClick={() => { setEditId(b.id); setDraft({}); }} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer' }}><Pencil size={12} /></button>
                      <button onClick={() => remove(b)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}