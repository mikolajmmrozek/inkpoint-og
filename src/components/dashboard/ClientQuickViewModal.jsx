import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Phone, Mail, ArrowRight, History, FileText, Gift, Plus, Loader2, Save, Check, Calendar, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };
const STATUS_LABELS = { pending: 'Oczekuje', confirmed: 'Potwierdzona', completed: 'Zakończona', cancelled: 'Anulowana' };

export default function ClientQuickViewModal({ booking, clientRecord, clientHistory, onClose, onShowHealthForm, t }) {
  const navigate = useNavigate();
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const phone = (clientRecord?.phone || booking?.client_phone || '').trim();
  const email = (clientRecord?.email || booking?.client_email || '').trim();
  const totalSessions = clientRecord?.total_sessions ?? 0;

  const [healthForms, setHealthForms] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [notes, setNotes] = useState(clientRecord?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({ value: '', value_type: 'amount', expires_at: '' });

  // Load health forms + promotions for this client (by email).
  useEffect(() => {
    if (!email) return;
    setLoadingForms(true);
    base44.entities.HealthForm.filter({ client_email: email })
      .then(forms => setHealthForms(forms.sort((a, b) => (b.form_filled_date || '').localeCompare(a.form_filled_date || ''))))
      .catch(() => {})
      .finally(() => setLoadingForms(false));
    setLoadingPromos(true);
    base44.entities.Promotion.filter({ assigned_client_email: email })
      .then(p => setPromotions(p.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))))
      .catch(() => {})
      .finally(() => setLoadingPromos(false));
  }, [email]);

  // Sync notes when clientRecord changes.
  useEffect(() => { setNotes(clientRecord?.notes || ''); }, [clientRecord?.id]);

  const saveNotes = async () => {
    if (!clientRecord?.id) return;
    setSavingNotes(true);
    try {
      await base44.entities.Client.update(clientRecord.id, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setSavingNotes(false);
    }
  };

  const createPromo = async () => {
    if (!newPromo.value || !newPromo.expires_at) return;
    setCreatingPromo(true);
    try {
      const expiresIso = new Date(newPromo.expires_at + 'T23:59:59').toISOString();
      const code = 'VIP' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await base44.entities.Promotion.create({
        type: 'voucher',
        code,
        value: Number(newPromo.value),
        value_type: newPromo.value_type,
        balance: Number(newPromo.value),
        original_value: Number(newPromo.value),
        usage_mode: 'multi',
        is_active: true,
        assigned_client_email: email,
        assignment_permanent: true,
        expires_at: expiresIso,
        status: 'active',
      });
      // Refresh list
      const p = await base44.entities.Promotion.filter({ assigned_client_email: email });
      setPromotions(p.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
      setShowAddPromo(false);
      setNewPromo({ value: '', value_type: 'amount', expires_at: '' });
    } finally {
      setCreatingPromo(false);
    }
  };

  const avatarUrl = clientRecord?.avatar_url || '';
  const initials = (booking?.client_name || email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const promoStatus = (p) => {
    if (p.revoked) return { label: 'Odwołany', color: '#9ca3af' };
    if (p.status === 'used') return { label: 'Wykorzystany', color: '#9ca3af' };
    if (p.status === 'expired') return { label: 'Wygasł', color: '#9ca3af' };
    if (p.status === 'grace') return { label: 'Ostatnia szansa', color: '#f59e0b' };
    return { label: 'Aktywny', color: '#16a34a' };
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md max-h-[88vh] overflow-y-auto p-6"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with avatar */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-4 min-w-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${t.border}`, flexShrink: 0 }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgb(var(--brand-rgb) /0.08)', border: '0.5px solid rgb(var(--brand-rgb) /0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--brand)', letterSpacing: '0.04em', flexShrink: 0 }}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>DANE KLIENTA</p>
              <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>{booking?.client_name}</h3>
              {totalSessions > 0 && (
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>{totalSessions} SESJI W STUDIU</p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick contact actions */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-2 py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Phone size={12} color="#16a34a" /> ZADZWOŃ
            </a>
          ) : (
            <div className="flex items-center justify-center py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em' }}>BRAK TELEFONU</div>
          )}
          {email ? (
            <a href={`mailto:${email}`} className="flex items-center justify-center gap-2 py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Mail size={12} color="var(--brand)" /> EMAIL
            </a>
          ) : (
            <div className="flex items-center justify-center py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em' }}>BRAK EMAIL</div>
          )}
        </div>

        {/* Internal note (admin/artist only) */}
        {clientRecord && (
          <div className="mb-5">
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>NOTATKA WEWNĘTRZNA (STUDIO)</p>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
              rows={2}
              placeholder="Alergie, preferencje, uwagi dla studia..."
              style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '8px 10px', fontSize: '12px', color: t.title, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = t.border}
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="flex items-center gap-1.5 mt-2 py-1.5 px-3"
              style={{ border: `0.5px solid ${notesSaved ? '#16a34a' : t.border}`, color: notesSaved ? '#16a34a' : t.muted, ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', opacity: savingNotes ? 0.6 : 1 }}
            >
              {savingNotes ? <Loader2 size={10} className="animate-spin" /> : notesSaved ? <><Check size={10} /> ZAPISANO</> : <><Save size={10} /> ZAPISZ</>}
            </button>
          </div>
        )}

        {/* Previous sessions */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <History size={11} color="var(--brand)" />
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>POPRZEDNIE SESJE ({clientHistory.length})</p>
          </div>
          {clientHistory.length === 0 ? (
            <p style={{ ...mono, fontSize: '9px', color: t.muted }}>BRAK INNYCH SESJI</p>
          ) : (
            <div style={{ border: `0.5px solid ${t.border}` }}>
              {clientHistory.slice(0, 8).map((s, i) => (
                <div key={s.id} className="px-3 py-2" style={{ borderBottom: i < Math.min(clientHistory.length, 8) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[s.status] || t.muted, flexShrink: 0 }} />
                    <p style={{ ...mono, fontSize: '9px', color: t.text, flex: 1 }}>{s.session_date || '—'}{s.session_time ? ` · ${s.session_time}` : ''}</p>
                    <p style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{STATUS_LABELS[s.status] || s.status}</p>
                  </div>
                  {(s.tattoo_placement || s.artist_name) && (
                    <p style={{ fontSize: '11px', color: t.muted, marginTop: '2px', paddingLeft: '14px' }}>
                      {s.tattoo_placement}{s.tattoo_placement && s.artist_name ? ' · ' : ''}{s.artist_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {clientHistory.length > 8 && (
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '6px', textAlign: 'right' }}>+ {clientHistory.length - 8} WIĘCEJ</p>
          )}
        </div>

        {/* Health forms */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={11} color="var(--brand)" />
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ANKIETY ZDROWOTNE ({healthForms.length})</p>
          </div>
          {loadingForms ? (
            <div className="flex justify-center py-2"><Loader2 size={12} className="animate-spin" style={{ color: t.muted }} /></div>
          ) : healthForms.length === 0 ? (
            <p style={{ ...mono, fontSize: '9px', color: t.muted }}>BRAK ANKIET</p>
          ) : (
            <div style={{ border: `0.5px solid ${t.border}` }}>
              {healthForms.slice(0, 5).map((f, i) => (
                <div key={f.id} className="px-3 py-2" style={{ borderBottom: i < Math.min(healthForms.length, 5) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                  <p style={{ ...mono, fontSize: '9px', color: t.text }}>{f.form_filled_date || '—'}{f.procedure_type ? ` · ${f.procedure_type}` : ''}</p>
                  {f.body_placement && <p style={{ fontSize: '11px', color: t.muted, marginTop: '2px' }}>{f.body_placement}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vouchers & promotions */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gift size={11} color="var(--brand)" />
              <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>VOUCHERY I PROMOCJE ({promotions.length})</p>
            </div>
            <button
              onClick={() => setShowAddPromo(v => !v)}
              style={{ background: 'none', border: `0.5px solid ${showAddPromo ? 'var(--brand)' : t.border}`, color: showAddPromo ? 'var(--brand)' : t.muted, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={10} /> DODAJ
            </button>
          </div>

          {showAddPromo && (
            <div className="mb-3 p-3" style={{ border: `0.5px solid rgb(var(--brand-rgb) /0.3)`, background: 'rgb(var(--brand-rgb) /0.04)' }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wartość</label>
                  <input
                    type="number"
                    value={newPromo.value}
                    onChange={e => setNewPromo(p => ({ ...p, value: e.target.value }))}
                    placeholder="np. 200"
                    style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '6px 8px', fontSize: '12px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Typ</label>
                  <select
                    value={newPromo.value_type}
                    onChange={e => setNewPromo(p => ({ ...p, value_type: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '6px 8px', fontSize: '12px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }}
                  >
                    <option value="amount">Kwota PLN</option>
                    <option value="percent">Procent %</option>
                  </select>
                </div>
              </div>
              <div className="mb-2">
                <label style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ważny do</label>
                <input
                  type="date"
                  value={newPromo.expires_at}
                  onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))}
                  style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '6px 8px', fontSize: '12px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }}
                />
              </div>
              <button
                onClick={createPromo}
                disabled={creatingPromo || !newPromo.value || !newPromo.expires_at}
                className="btn-oxblood w-full"
                style={{ fontSize: '9px', padding: '8px', opacity: (creatingPromo || !newPromo.value || !newPromo.expires_at) ? 0.5 : 1 }}
              >
                {creatingPromo ? 'TWORZENIE...' : 'UTWÓRZ VOUCHER'}
              </button>
            </div>
          )}

          {loadingPromos ? (
            <div className="flex justify-center py-2"><Loader2 size={12} className="animate-spin" style={{ color: t.muted }} /></div>
          ) : promotions.length === 0 ? (
            <p style={{ ...mono, fontSize: '9px', color: t.muted }}>BRAK VOUCHERÓW</p>
          ) : (
            <div style={{ border: `0.5px solid ${t.border}` }}>
              {promotions.slice(0, 6).map((p, i) => {
                const st = promoStatus(p);
                return (
                  <div key={p.id} className="px-3 py-2" style={{ borderBottom: i < Math.min(promotions.length, 6) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                    <div className="flex items-center justify-between">
                      <p style={{ ...mono, fontSize: '9px', color: t.text, letterSpacing: '0.05em' }}>{p.code}</p>
                      <span style={{ ...mono, fontSize: '7px', color: st.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: t.muted, marginTop: '2px' }}>
                      {p.value_type === 'percent' ? `${p.value}%` : `${Number(p.value).toLocaleString('pl-PL')} PLN`}
                      {p.balance !== undefined && p.balance !== p.value ? ` · saldo ${p.value_type === 'percent' ? `${p.balance}%` : `${Number(p.balance).toLocaleString('pl-PL')} PLN`}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          {booking?.health_form_completed && (
            <button onClick={onShowHealthForm} className="flex items-center justify-center gap-2 py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
              <FileText size={12} /> ANKIETA Z TEJ SESJI
            </button>
          )}
          <button onClick={() => navigate('/dashboard/clients')} className="flex items-center justify-center gap-2 py-2.5" style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
            <ArrowRight size={12} /> PRZEJDŹ DO KLIENTÓW
          </button>
        </div>
      </motion.div>
    </div>
  );
}