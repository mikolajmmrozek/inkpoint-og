import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Search, Edit2, Trash2, X, Plus, ChevronDown, ChevronUp, CalendarPlus, Merge, Loader2, UserPlus, Check, Ban } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import BookingModal from '@/components/dashboard/BookingModal';
import { format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import StatsTile from '@/components/dashboard/StatsTile';
import { formatCompact } from '@/lib/formatNumber';
import ClientMessageButton from '@/components/dashboard/ClientMessageButton';
import { useCreateMenu } from '@/components/create/CreateMenuContext';

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

export default function DashboardClients() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A' };

  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [healthForms, setHealthForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all'); // 'all' | 'new' | 'returning'
  const [editing, setEditing] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  const [form, setForm] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [newSessionClient, setNewSessionClient] = useState(null);
  const [lastSessionForClient, setLastSessionForClient] = useState(null); // last booking object or undefined
  const [repeatPromptVisible, setRepeatPromptVisible] = useState(false);
  const [useRepeatData, setUseRepeatData] = useState(false);
  const [mergeSource, setMergeSource] = useState(null); // client to merge FROM (will be deleted)
  const [mergeTarget, setMergeTarget] = useState(null); // client to merge INTO (will be kept)
  const [mergeSearch, setMergeSearch] = useState('');
  const [merging, setMerging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // client to delete
  const [users, setUsers] = useState([]);
  const [inviteStatus, setInviteStatus] = useState({}); // { [clientId]: 'inviting' | 'invited' | 'error' }

  const { registerClientsRefresh } = useCreateMenu();
  const refreshClients = async () => {
    try { const data = await base44.entities.Client.list('-created_date', 5000); setClients(data); } catch (e) {}
  };
  useEffect(() => { registerClientsRefresh(refreshClients); }, [registerClientsRefresh]);

  const load = async () => {
    const [clientData, bookingData, formData, userData] = await Promise.all([
      base44.entities.Client.list('-created_date', 5000),
      base44.entities.Booking.list('-session_date', 500),
      base44.entities.HealthForm.list('-form_filled_date', 500),
      base44.entities.User.list('-created_date', 200).catch(() => []),
    ]);
    setClients(clientData);
    setBookings(bookingData);
    setHealthForms(formData);
    setUsers(userData);
    setLoading(false);
    // Oznacz wszystkich nieprzeczytanych klientów jako przeczytanych — admin przejrzał listę
    base44.entities.Client.updateMany(
      { is_read: { $ne: true } },
      { $set: { is_read: true } }
    ).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // Get sessions and forms for a client
  // Priority: match by email (exact). Fallback: match by full name only if client has NO email.
  const getClientData = (client) => {
    const clientEmail = (client.email || '').toLowerCase().trim();
    const clientName = (client.name || `${client.first_name || ''} ${client.last_name || ''}`).toLowerCase().trim();

    const sessions = bookings.filter(b => {
      const bEmail = (b.client_email || '').toLowerCase().trim();
      const bName = (b.client_name || '').toLowerCase().trim();
      if (clientEmail && bEmail) return clientEmail === bEmail;
      // No email on client — only match by name, and only if client has no email (avoid false positives)
      if (!clientEmail) return clientName && clientName === bName;
      return false;
    });

    const forms = healthForms.filter(f => {
      const fEmail = (f.client_email || '').toLowerCase().trim();
      const fName = (f.client_name || '').toLowerCase().trim();
      if (clientEmail && fEmail) return clientEmail === fEmail;
      if (!clientEmail) return clientName && clientName === fName;
      return false;
    });

    return { sessions, forms };
  };

  const getClientStatus = (client) => {
    if (!client.email) return 'no_email';
    const userExists = users.some(u => u.email?.toLowerCase() === client.email.toLowerCase());
    if (userExists) return 'active';
    if (client.invite_sent) return 'invited';
    return 'inactive';
  };

  const isNewClient = (client) => {
    if (!client.created_date) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(client.created_date) >= sevenDaysAgo;
  };

  const handleInvite = async (client) => {
    setInviteStatus(s => ({ ...s, [client.id]: 'inviting' }));
    try {
      await base44.users.inviteUser(client.email, 'user');
      await base44.entities.Client.update(client.id, {
        invite_sent: true,
        invite_sent_date: new Date().toISOString().split('T')[0],
      });
      setInviteStatus(s => ({ ...s, [client.id]: 'invited' }));
      base44.entities.User.list().then(setUsers);
      load();
    } catch (err) {
      setInviteStatus(s => ({ ...s, [client.id]: 'error' }));
    }
  };

  const handleToggleBlock = async (client) => {
    await base44.entities.Client.update(client.id, { is_blocked: !client.is_blocked });
    setClients(cs => cs.map(c => c.id === client.id ? { ...c, is_blocked: !client.is_blocked } : c));
  };

  const filtered = clients
    .filter(c => {
      if (clientFilter === 'new' && !isNewClient(c)) return false;
      if (clientFilter === 'returning' && (c.total_sessions || 0) < 2) return false;
      const q = search.toLowerCase();
      return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));

  const openEdit = (c) => { setForm({ ...c }); setEditing(c); };
  const openNew = () => { setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '', total_sessions: 0 }); setEditing('new'); };

  const openNewSession = (client) => {
    const { sessions } = getClientData(client);
    const last = sessions.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))[0];
    setNewSessionClient(client);
    setLastSessionForClient(last || null);
    setUseRepeatData(false);
    setRepeatPromptVisible(!!last); // show prompt only if there's history
  };

  const handleSave = async () => {
    const name = `${form.first_name || ''} ${form.last_name || ''}`.trim();
    const data = { ...form, name };
    if (editing === 'new') {
      await base44.entities.Client.create(data);
    } else {
      await base44.entities.Client.update(editing.id, data);
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Client.delete(id);
    setClients(c => c.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  // Merge mergeSource INTO mergeTarget:
  // 1. Re-assign all bookings & health forms from source email → target email/name
  // 2. Merge session counts
  // 3. Delete source client record
  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    setMerging(true);

    const srcEmail = (mergeSource.email || '').toLowerCase().trim();
    const srcName = (mergeSource.name || '').toLowerCase().trim();

    // Find all bookings belonging to source
    const srcBookings = bookings.filter(b => {
      const bEmail = (b.client_email || '').toLowerCase().trim();
      const bName = (b.client_name || '').toLowerCase().trim();
      if (srcEmail && bEmail) return srcEmail === bEmail;
      if (!srcEmail) return bName === srcName;
      return false;
    });

    // Find all health forms belonging to source
    const srcForms = healthForms.filter(f => {
      const fEmail = (f.client_email || '').toLowerCase().trim();
      const fName = (f.client_name || '').toLowerCase().trim();
      if (srcEmail && fEmail) return srcEmail === fEmail;
      if (!srcEmail) return fName === srcName;
      return false;
    });

    const targetName = mergeTarget.name || `${mergeTarget.first_name || ''} ${mergeTarget.last_name || ''}`.trim();
    const targetEmail = mergeTarget.email || '';
    const targetPhone = mergeTarget.phone || '';

    // Re-assign bookings
    await Promise.all(srcBookings.map(b =>
      base44.entities.Booking.update(b.id, {
        client_name: targetName,
        client_email: targetEmail,
        client_phone: targetPhone,
      })
    ));

    // Re-assign health forms
    await Promise.all(srcForms.map(f =>
      base44.entities.HealthForm.update(f.id, {
        client_name: targetName,
        client_email: targetEmail,
        client_phone: targetPhone,
      })
    ));

    // Update target session count
    const newTotal = (mergeTarget.total_sessions || 0) + (mergeSource.total_sessions || 0);
    await base44.entities.Client.update(mergeTarget.id, { total_sessions: newTotal });

    // Delete source client
    await base44.entities.Client.delete(mergeSource.id);

    setMergeSource(null);
    setMergeTarget(null);
    setMergeSearch('');
    setMerging(false);
    load();
  };

  const inp = (field) => ({
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  return (
    <div>
      {/* Stats row + new client button */}
      <div className="flex gap-4 mb-4 flex-wrap items-center">
        {[
          { label: 'Wszyscy klienci', value: formatCompact(clients.length), filter: 'all' },
          { label: 'Nowi (7 dni)', value: formatCompact(clients.filter(c => isNewClient(c)).length), filter: 'new' },
          { label: 'Powracający (2+ sesji)', value: formatCompact(clients.filter(c => (c.total_sessions || 0) >= 2).length), filter: 'returning' },
        ].map(s => (
          <StatsTile key={s.label} label={s.label} value={s.value} active={clientFilter === s.filter} onClick={() => setClientFilter(clientFilter === s.filter ? 'all' : s.filter)} t={t} />
        ))}
        <div className="ml-auto">
          <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
            <Plus size={13} /> NOWY KLIENT
          </button>
        </div>
      </div>

      {/* Search — full width above list */}
      <div className="mb-4 flex items-center" style={{ border: `0.5px solid ${t.border}`, padding: '8px 14px', gap: '8px' }}>
        <Search size={12} color={t.muted} />
        <input
          placeholder="Szukaj po nazwisku, emailu, telefonie..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '13px', fontFamily: 'var(--font-body)', width: '100%' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0 }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          {/* Header — hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Imię i Nazwisko', 'Email', 'Telefon', 'Sesje', ''].map((h, i) => (
              <p key={i} className={i === 0 ? 'col-span-4' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-1' : 'col-span-2 text-right'} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</p>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK KLIENTÓW</p>
            </div>
          ) : filtered.map((c) => {
            const isExpanded = expandedClient === c.id;
            const { sessions, forms } = getClientData(c);
            return (
              <div key={c.id}>
                {/* Mobile row — minimal */}
                <div className="md:hidden px-4 py-3 flex items-center justify-between cursor-pointer" style={{ borderBottom: `0.5px solid ${t.border}`, background: isExpanded ? 'rgb(var(--brand-rgb) /0.03)' : 'transparent' }} onClick={() => setExpandedClient(isExpanded ? null : c.id)}>
                  <div className="flex items-center gap-2">
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{c.name}</p>
                    {isNewClient(c) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#16a34a', border: '0.5px solid #16a34a', padding: '1px 4px' }}>NOWY</span>}{c.is_blocked && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px', marginLeft: '4px' }}>ZABLOKOWANY</span>}
                  </div>
                  <div className="flex gap-2">
                     {c.email && getClientStatus(c) === 'inactive' && (
                       <button onClick={(e) => { e.stopPropagation(); handleInvite(c); }} style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Utwórz konto i zaproś"><UserPlus size={13} /></button>
                     )}
                     <ClientMessageButton client={c} t={t} users={users} />
                     <button onClick={(e) => { e.stopPropagation(); openNewSession(c); }} style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Nowa sesja"><CalendarPlus size={13} /></button>
                     <button onClick={(e) => { e.stopPropagation(); setMergeSource(c); setMergeTarget(null); setMergeSearch(''); }} style={{ color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Połącz"><Merge size={13} /></button>
                     <button onClick={(e) => { e.stopPropagation(); handleToggleBlock(c); }} style={{ color: c.is_blocked ? 'var(--brand)' : t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title={c.is_blocked ? 'Odblokuj klienta' : 'Zablokuj klienta'}><Ban size={13} /></button>
                     <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Edit2 size={13} /></button>
                     <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                   </div>
                </div>

                {/* Desktop row — full grid */}
                <div 
                  className="hidden md:grid grid-cols-12 px-4 py-3 items-center cursor-pointer"
                  style={{ borderBottom: `0.5px solid ${t.border}`, background: isExpanded ? 'rgb(var(--brand-rgb) /0.03)' : 'transparent' }}
                  onClick={() => setExpandedClient(isExpanded ? null : c.id)}
                >
                  <div className="col-span-4 flex items-center gap-2">
                    {(sessions.length > 0 || forms.length > 0) && (
                      isExpanded ? <ChevronUp size={13} color={t.muted} /> : <ChevronDown size={13} color={t.muted} />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{c.name}</p>
                        {isNewClient(c) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#16a34a', border: '0.5px solid #16a34a', padding: '1px 4px' }}>NOWY</span>}{c.is_blocked && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px', marginLeft: '4px' }}>ZABLOKOWANY</span>}
                      </div>
                      {c.notes && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</p>}
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    {c.email ? (
                      <>
                        {(() => {
                          const st = getClientStatus(c);
                          const dotColor = st === 'active' ? '#16a34a' : st === 'invited' ? '#f59e0b' : 'rgba(245,240,235,0.2)';
                          const tip = st === 'active' ? 'Konto aktywne' : st === 'invited' ? 'Zaproszony — czeka na logowanie' : 'Brak konta — kliknij + aby zaprosić';
                          return <div title={tip} style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />;
                        })()}
                        <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.04em', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = 'var(--brand)'} onMouseLeave={e => e.target.style.color = t.muted}>{c.email}</a>
                        {inviteStatus[c.id] === 'inviting' && <Loader2 size={11} className="animate-spin" color={t.muted} />}
                        {inviteStatus[c.id] === 'invited' && <Check size={11} color="#16a34a" />}
                      </>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>—</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {c.phone ? <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = 'var(--brand)'} onMouseLeave={e => e.target.style.color = t.muted}>{c.phone}</a> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>—</span>}
                  </div>
                  <div className="col-span-1">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: getClientData(c).sessions.filter(s => s.status === 'completed').length >= 2 ? t.fuchsia : t.muted, fontWeight: 600 }}>{getClientData(c).sessions.filter(s => s.status === 'completed').length}</span>
                  </div>
                  <div className="col-span-2 flex justify-end gap-3">
                    {c.email && getClientStatus(c) === 'inactive' && (
                      <button onClick={(e) => { e.stopPropagation(); handleInvite(c); }} style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }} title="Utwórz konto i zaproś do aplikacji"><UserPlus size={13} /></button>
                    )}
                    <ClientMessageButton client={c} t={t} users={users} />
                    <button onClick={(e) => { e.stopPropagation(); openNewSession(c); }} style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }} title="Nowa sesja"><CalendarPlus size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setMergeSource(c); setMergeTarget(null); setMergeSearch(''); }} style={{ color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer' }} title="Połącz z innym klientem"><Merge size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleBlock(c); }} style={{ color: c.is_blocked ? 'var(--brand)' : t.muted, background: 'none', border: 'none', cursor: 'pointer' }} title={c.is_blocked ? 'Odblokuj klienta' : 'Zablokuj klienta'}><Ban size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: 'rgb(var(--brand-rgb) /0.02)', borderBottom: `0.5px solid ${t.border}`, padding: '12px 20px' }}>
                    {sessions.length > 0 && (
                      <div className="mb-4">
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Sesje ({sessions.length})</p>
                        {sessions.map(s => (
                          <p key={s.id} style={{ fontSize: '11px', color: t.text, marginBottom: '4px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedBooking(s); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: t.fuchsia, fontSize: 'inherit', fontWeight: 'bold', padding: 0 }}
                            >
                              {s.session_date}
                            </button>
                            {' · '} {s.artist_name} {s.tattoo_placement && `· ${s.tattoo_placement}`}
                          </p>
                        ))}
                      </div>
                    )}
                    {forms.length > 0 && (
                      <div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Ankiety ({forms.length})</p>
                        {forms.map(f => (
                          <p key={f.id} style={{ fontSize: '11px', color: t.text, marginBottom: '4px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFormId(f.id); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: '#16a34a', fontSize: 'inherit', padding: 0 }}
                            >
                              {f.form_filled_date ? format(new Date(f.form_filled_date), 'dd.MM.yyyy') : '—'}
                            </button>
                            {' · '} {f.procedure_type}
                          </p>
                        ))}
                      </div>
                    )}
                    {sessions.length === 0 && forms.length === 0 && (
                      <p style={{ fontSize: '11px', color: t.muted, fontStyle: 'italic' }}>Brak sesji i ankiet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking detail panel */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailPanel
            booking={selectedBooking}
            theme={theme}
            onClose={() => setSelectedBooking(null)}
            onStatusChange={async (id, status) => {
              await base44.entities.Booking.update(id, { status });
              setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
              setSelectedBooking(s => s?.id === id ? { ...s, status } : s);
            }}
            onDelete={async (id) => {
              await base44.entities.Booking.delete(id);
              setBookings(b => b.filter(x => x.id !== id));
              setSelectedBooking(null);
            }}
            onEdit={() => setSelectedBooking(null)}
          />
        )}
      </AnimatePresence>

      {/* Health form preview */}
      {selectedFormId && (
        <HealthFormPreviewModal
          healthFormId={selectedFormId}
          onClose={() => setSelectedFormId(null)}
          t={t}
        />
      )}

      {/* Repeat prompt */}
      {newSessionClient && repeatPromptVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px', maxWidth: '460px', width: '100%' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>NOWA SESJA</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '20px' }}>
              {newSessionClient.name}
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '12px', textTransform: 'uppercase' }}>
              Ostatnia sesja:
            </p>
            <div style={{ border: `0.5px solid ${t.border}`, padding: '14px 16px', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.text, marginBottom: '4px' }}>{lastSessionForClient?.session_date} · {lastSessionForClient?.artist_name || '—'}</p>
              {lastSessionForClient?.tattoo_placement && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>{lastSessionForClient.tattoo_placement}{lastSessionForClient.tattoo_description ? ` — ${lastSessionForClient.tattoo_description}` : ''}</p>}
              {lastSessionForClient?.estimated_price && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', marginTop: '4px' }}>{lastSessionForClient.estimated_price} PLN</p>}
            </div>
            <p style={{ fontSize: '13px', color: t.muted, marginBottom: '20px', lineHeight: 1.6 }}>
              Czy chcesz umówić ponownie z danymi z ostatniej sesji (artysta, opis, cena)?
            </p>
            <div className="flex gap-3">
              <button className="btn-oxblood flex-1" onClick={() => { setUseRepeatData(true); setRepeatPromptVisible(false); }}>
                TAK, POWTÓRZ SESJĘ
              </button>
              <button className="btn-ghost-parchment flex-1" onClick={() => { setUseRepeatData(false); setRepeatPromptVisible(false); }}>
                NIE, NOWA SESJA
              </button>
            </div>
            <button onClick={() => { setNewSessionClient(null); setRepeatPromptVisible(false); setLastSessionForClient(null); }} style={{ marginTop: '14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', width: '100%', textAlign: 'center' }}>
              ANULUJ
            </button>
          </div>
        </div>
      )}

      {/* New session modal */}
      {newSessionClient && !repeatPromptVisible && (
        <BookingModal
          booking={{
            _prefill: true,
            client_name: newSessionClient.name,
            client_email: newSessionClient.email,
            client_phone: newSessionClient.phone,
            ...(useRepeatData && lastSessionForClient ? {
              artist_id: lastSessionForClient.artist_id,
              artist_name: lastSessionForClient.artist_name,
              tattoo_description: lastSessionForClient.tattoo_description,
              tattoo_placement: lastSessionForClient.tattoo_placement,
              estimated_price: lastSessionForClient.estimated_price,
              service_id: lastSessionForClient.service_id,
              service_name: lastSessionForClient.service_name,
            } : {}),
          }}
          t={theme === 'light'
            ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)' }
            : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)' }
          }
          onClose={() => { setNewSessionClient(null); setLastSessionForClient(null); }}
          onSaved={() => { setNewSessionClient(null); setLastSessionForClient(null); load(); }}
        />
      )}

      {/* Merge modal */}
      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setMergeSource(null)}>
          <div className="w-full max-w-lg" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Merge size={14} color="#a855f7" />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#a855f7', letterSpacing: '0.2em', textTransform: 'uppercase' }}>ŁĄCZENIE KLIENTÓW</p>
              </div>
              <button onClick={() => setMergeSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={16} /></button>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em', marginBottom: '20px' }}>
              Połącz duplikaty
            </h3>

            {/* Source */}
            <div className="mb-5">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>DUPLIKAT (zostanie usunięty)</p>
              <div style={{ border: `0.5px solid #a855f7`, padding: '12px 16px', background: 'rgba(168,85,247,0.05)' }}>
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{mergeSource.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '3px' }}>
                  {[mergeSource.email, mergeSource.phone].filter(Boolean).join(' · ') || '—'} · {mergeSource.total_sessions || 0} sesji
                </p>
              </div>
            </div>

            {/* Target search */}
            <div className="mb-5">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>DOCELOWY PROFIL (zostanie zachowany)</p>
              {mergeTarget ? (
                <div style={{ border: `0.5px solid #16a34a`, padding: '12px 16px', background: 'rgba(22,163,74,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{mergeTarget.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '3px' }}>
                      {[mergeTarget.email, mergeTarget.phone].filter(Boolean).join(' · ') || '—'} · {mergeTarget.total_sessions || 0} sesji
                    </p>
                  </div>
                  <button onClick={() => setMergeTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={13} /></button>
                </div>
              ) : (
                <div>
                  <div style={{ border: `0.5px solid ${t.border}`, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Search size={11} color={t.muted} />
                    <input
                      autoFocus
                      placeholder="Szukaj klienta docelowego..."
                      value={mergeSearch}
                      onChange={e => setMergeSearch(e.target.value)}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '13px', fontFamily: 'var(--font-body)', width: '100%' }}
                    />
                  </div>
                  {mergeSearch.trim() && (
                    <div style={{ border: `0.5px solid ${t.border}`, maxHeight: '200px', overflowY: 'auto' }}>
                      {clients
                        .filter(c => c.id !== mergeSource.id && (
                          c.name?.toLowerCase().includes(mergeSearch.toLowerCase()) ||
                          c.email?.toLowerCase().includes(mergeSearch.toLowerCase()) ||
                          c.phone?.includes(mergeSearch)
                        ))
                        .slice(0, 8)
                        .map(c => (
                          <button key={c.id} onClick={() => setMergeTarget(c)}
                            className="w-full text-left px-4 py-3"
                            style={{ background: 'none', border: 'none', borderBottom: `0.5px solid ${t.border}`, cursor: 'pointer', display: 'block' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{c.name}</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, marginTop: '2px' }}>
                              {[c.email, c.phone].filter(Boolean).join(' · ') || '—'} · {c.total_sessions || 0} sesji
                            </p>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {mergeTarget && (
              <div className="mb-5 px-4 py-3" style={{ background: 'rgba(168,85,247,0.05)', border: `0.5px solid rgba(168,85,247,0.3)` }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#a855f7', letterSpacing: '0.1em', marginBottom: '4px' }}>PO POŁĄCZENIU:</p>
                <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.6 }}>
                  Wszystkie sesje i ankiety z <strong style={{ color: t.text }}>{mergeSource.name}</strong> zostaną przeniesione na <strong style={{ color: t.text }}>{mergeTarget.name}</strong>. Profil duplikatu zostanie usunięty.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button
                onClick={handleMerge}
                disabled={!mergeTarget || merging}
                className="btn-oxblood flex-1"
                style={{ opacity: (!mergeTarget || merging) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: !mergeTarget || merging ? undefined : 'linear-gradient(135deg,#a855f7,#7c3aed)' }}
              >
                {merging ? <><Loader2 size={13} className="animate-spin" /> ŁĄCZENIE...</> : <><Merge size={13} /> POŁĄCZ PROFILE</>}
              </button>
              <button onClick={() => setMergeSource(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title={`Usuń klienta`}
        message={`Czy na pewno chcesz usunąć klienta "${deleteConfirm?.name}"? Tej operacji nie można cofnąć.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                {editing === 'new' ? 'Nowy Klient' : 'Edytuj Klienta'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>{label('Imię *')}<input {...inp('first_name')} /></div>
                <div>{label('Nazwisko *')}<input {...inp('last_name')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>{label('Email')}<input type="email" {...inp('email')} /></div>
                <div>{label('Telefon')}<input {...inp('phone')} /></div>
              </div>
              <div>{label('Liczba sesji')}<input type="number" {...inp('total_sessions')} /></div>
              <div>{label('Notatki')}
                <textarea rows={3} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
              </div>
            </div>
            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={!form.first_name} className="btn-oxblood flex-1" style={{ opacity: !form.first_name ? 0.5 : 1 }}>ZAPISZ</button>
              <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}