import { motion } from 'framer-motion';
import { X, Phone, Mail, ArrowRight, History, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' };

export default function ClientQuickViewModal({ booking, clientRecord, clientHistory, onClose, onShowHealthForm, t }) {
  const navigate = useNavigate();
  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const phone = (clientRecord?.phone || booking?.client_phone || '').trim();
  const email = (clientRecord?.email || booking?.client_email || '').trim();
  const totalSessions = clientRecord?.total_sessions ?? 0;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg === '#FFFFFF' ? '#FFFFFF' : '#0A0A0A' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0">
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>DANE KLIENTA</p>
            <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>{booking?.client_name}</h3>
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

        {/* Contact details */}
        <div className="space-y-2 mb-5" style={{ borderBottom: `0.5px solid ${t.border}`, paddingBottom: '16px' }}>
          {phone && (
            <div className="flex items-center gap-2">
              <Phone size={11} color={t.muted} />
              <span style={{ ...mono, fontSize: '11px', color: t.text }}>{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2">
              <Mail size={11} color={t.muted} />
              <span style={{ ...mono, fontSize: '11px', color: t.text, wordBreak: 'break-all' }}>{email}</span>
            </div>
          )}
          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{totalSessions} SESJI W STUDIU</p>
        </div>

        {/* Notes */}
        {clientRecord?.notes && (
          <div className="mb-5">
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>NOTATKI O KLIENCIE</p>
            <p style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5 }}>{clientRecord.notes}</p>
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
              {clientHistory.slice(0, 6).map((s, i) => (
                <div key={s.id} className="px-3 py-2" style={{ borderBottom: i < Math.min(clientHistory.length, 6) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[s.status] || t.muted, flexShrink: 0 }} />
                    <p style={{ ...mono, fontSize: '9px', color: t.muted, flex: 1 }}>{s.session_date || '—'}</p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.status}</p>
                  </div>
                  {s.tattoo_placement && (
                    <p style={{ fontSize: '11px', color: t.title, marginTop: '2px', paddingLeft: '14px' }}>{s.tattoo_placement}{s.artist_name ? ` · ${s.artist_name}` : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {clientHistory.length > 6 && (
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '6px', textAlign: 'right' }}>+ {clientHistory.length - 6} WIĘCEJ</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={onShowHealthForm} className="flex items-center justify-center gap-2 py-2.5" style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
            <FileText size={12} /> ANKIETA ZDROWOTNA
          </button>
          <button onClick={() => navigate('/dashboard/clients')} className="flex items-center justify-center gap-2 py-2.5" style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
            <ArrowRight size={12} /> PRZEJDŹ DO KLIENTÓW
          </button>
        </div>
      </motion.div>
    </div>
  );
}