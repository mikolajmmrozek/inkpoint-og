import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { UserPlus, Mail, Link2, Copy, Check, X } from 'lucide-react';

export default function DashboardUsers() {
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteArtistId, setInviteArtistId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', rowBorder: '#E5E5E5', rowHover: 'rgba(0,0,0,0.03)', inputBorder: '#CCCCCC' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', rowBorder: '#262626', rowHover: 'rgba(255,255,255,0.04)', inputBorder: '#262626' };

  const inputStyle = {
    background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`,
    color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)',
  };

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.Artist.list(),
    ]).then(([u, a]) => {
      setUsers(u);
      setArtists(a);
    }).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess(null);
    try {
      // Platform inviteUser only accepts 'user' or 'admin' — 'artist' is applied on first login via pending invite
      const platformRole = inviteRole === 'artist' ? 'user' : inviteRole;
      await base44.users.inviteUser(inviteEmail, platformRole);
      // For artist role, store pending assignment to be applied automatically on first login
      if (inviteRole === 'artist') {
        const linkedArtist = artists.find(a => a.id === inviteArtistId);
        await base44.entities.PendingStaffInvite.create({
          email: inviteEmail,
          role: 'artist',
          artist_id: inviteArtistId || null,
          artist_name: linkedArtist?.name || null,
        });
      }
      setInviteSuccess({ email: inviteEmail, role: inviteRole, artistId: inviteArtistId });
      setInviteEmail('');
      setInviteArtistId('');
      setInviteRole('user');
      base44.entities.User.list().then(setUsers);
    } catch (err) {
      setInviteError(err?.message || 'Wystąpił błąd podczas wysyłania zaproszenia.');
    }
    setInviting(false);
  };

  const copyInviteLink = async (email) => {
    // Build invite link — the platform handles this via the login page with email prefilled
    const link = `${window.location.origin}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(email);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateUser = async () => {
    if (!editingUser?.id) return;
    setSaving(true);
    await base44.auth.updateMe ? null : null; // can't update other users' built-in fields
    // We can update custom fields via entity
    await base44.entities.User.update(editingUser.id, {
      display_name: editingUser.full_name || null,
      role: editingUser.role,
      artist_id: editingUser.artist_id || null,
    });
    // If artist is linked and name was changed, update Artist entity
    if (editingUser.artist_id && editingUser.artist_name) {
      const linkedArtist = artists.find(a => a.id === editingUser.artist_id);
      if (linkedArtist && linkedArtist.name !== editingUser.artist_name) {
        await base44.entities.Artist.update(editingUser.artist_id, { name: editingUser.artist_name });
        setArtists(prev => prev.map(a => a.id === editingUser.artist_id ? { ...a, name: editingUser.artist_name } : a));
      }
    }
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, display_name: editingUser.full_name || null, role: editingUser.role, artist_id: editingUser.artist_id } : u));
    setEditingUser(null);
    setSaving(false);
  };

  const ROLE_COLORS = { admin: 'var(--brand)', artist: '#f59e0b', user: '#9ca3af' };
  const ROLE_LABELS = { admin: 'ADMIN', artist: 'ARTYSTA', user: 'UŻYTKOWNIK' };

  return (
    <div>
      {/* Invite form */}
      <div className="p-6 mb-8" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
        <div className="flex items-center gap-2 mb-6">
          <UserPlus size={14} color="var(--brand)" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ZAPROŚ UŻYTKOWNIKA</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>ADRES E-MAIL *</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="artysta@email.pl"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>ROLA</label>
            <select
              value={inviteRole}
              onChange={e => { setInviteRole(e.target.value); if (e.target.value !== 'artist') setInviteArtistId(''); }}
              style={{ ...inputStyle, colorScheme: theme === 'dark' ? 'dark' : 'light' }}
            >
              <option value="user">Użytkownik</option>
              <option value="artist">Artysta</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {inviteRole === 'artist' && (
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>POWIĄŻ Z ARTYSTĄ</label>
              <select
                value={inviteArtistId}
                onChange={e => setInviteArtistId(e.target.value)}
                style={{ ...inputStyle, colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              >
                <option value="">— wybierz artystę —</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {inviteError && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em', marginBottom: '12px' }}>⚠ {inviteError}</p>
        )}
        {inviteSuccess && (
          <div className="mb-4 px-3 py-2 flex items-center justify-between" style={{ border: '0.5px solid #16a34a', background: 'rgba(22,163,74,0.06)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.08em' }}>
              ✓ Zaproszenie wysłane na {inviteSuccess.email} — rola: {ROLE_LABELS[inviteSuccess.role]}
            </p>
            <button onClick={() => copyInviteLink(inviteSuccess.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em' }}>
              {copiedId === inviteSuccess.email ? <><Check size={10} /> SKOPIOWANO</> : <><Copy size={10} /> KOPIUJ LINK</>}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleInvite}
            disabled={!inviteEmail || inviting}
            className="btn-oxblood"
            style={{ fontSize: '10px', opacity: !inviteEmail || inviting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={12} /> {inviting ? 'WYSYŁAM...' : 'WYŚLIJ ZAPROSZENIE'}
          </button>
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '12px' }}>
          Użytkownik otrzyma e-mail z linkiem do rejestracji. Rola i profil artysty zostaną ustawione automatycznie po pierwszym logowaniu.
        </p>
      </div>

      {/* Users list */}
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          ZAREJESTROWANI UŻYTKOWNICY ({users.length})
        </p>
        {loading ? (
          <div className="p-8 text-center" style={{ border: `0.5px solid ${t.cardBorder}` }}>
            <div className="w-8 h-px mx-auto animate-pulse" style={{ background: 'var(--brand)' }} />
          </div>
        ) : (
          <div style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
            {users.filter(u => u.role === 'artist' || u.role === 'admin').map((u, i) => {
              const linkedArtist = artists.find(a => a.id === u.artist_id);
              const filtered = users.filter(uu => uu.role === 'artist' || uu.role === 'admin');
              return (
                <div key={u.id} className="flex items-center justify-between p-4 gap-4"
                  style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                  <div className="min-w-0 flex-1">
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{u.display_name || u.full_name || u.email}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
                      {u.email}{linkedArtist ? ` · ${linkedArtist.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', padding: '3px 8px', border: `0.5px solid ${ROLE_COLORS[u.role] || '#9ca3af'}`, color: ROLE_COLORS[u.role] || '#9ca3af' }}>
                      {ROLE_LABELS[u.role] || u.role?.toUpperCase()}
                    </span>
                    <button
                       onClick={() => setEditingUser({ ...u, full_name: u.display_name || u.full_name || '', artist_name: linkedArtist?.name || '' })}
                       style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${t.cardBorder}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
                     >
                      EDYTUJ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-md p-8" style={{ background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>EDYCJA UŻYTKOWNIKA</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em' }}>{editingUser.full_name || editingUser.email}</h3>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>NAZWA WYŚWIETLANA</label>
                <input
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={e => setEditingUser(u => ({ ...u, full_name: e.target.value }))}
                  placeholder={editingUser.display_name || editingUser.email}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>ROLA</label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={e => setEditingUser(u => ({ ...u, role: e.target.value, artist_id: e.target.value !== 'artist' ? '' : u.artist_id }))}
                  style={{ ...inputStyle, colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                >
                  <option value="user">Użytkownik</option>
                  <option value="artist">Artysta</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {editingUser.role === 'artist' && (
                <>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>PROFIL ARTYSTY</label>
                    <select
                      value={editingUser.artist_id || ''}
                      onChange={e => setEditingUser(u => ({ ...u, artist_id: e.target.value, artist_name: artists.find(a => a.id === e.target.value)?.name || '' }))}
                      style={{ ...inputStyle, colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                    >
                      <option value="">— wybierz artystę —</option>
                      {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  {editingUser.artist_id && (
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>NAZWA ARTYSTY</label>
                      <input
                        type="text"
                        value={editingUser.artist_name || ''}
                        onChange={e => setEditingUser(u => ({ ...u, artist_name: e.target.value }))}
                        placeholder="Imię i nazwisko / pseudonim"
                        style={inputStyle}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateUser} disabled={saving} className="btn-oxblood flex-1" style={{ fontSize: '10px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'ZAPISUJĘ...' : 'ZAPISZ'}
              </button>
              <button onClick={() => setEditingUser(null)} className="btn-ghost-parchment" style={{ fontSize: '10px' }}>ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}