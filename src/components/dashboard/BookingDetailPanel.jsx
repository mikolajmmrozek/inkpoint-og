import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Edit, Copy, Check, ExternalLink, Mail, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import HealthFormPreviewModal from './HealthFormPreviewModal';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingDetailPanel({ booking, onClose, onStatusChange, onDelete, onEdit, t }) {
  const [copied, setCopied] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [previewFormId, setPreviewFormId] = useState(null);

  const sendFormEmail = async () => {
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: 'Wypełnij ankietę zdrowotną — Romans Tattoo',
        body: `Dzień dobry ${booking.client_name},\n\nProsimy o wypełnienie ankiety zdrowotnej przed sesją (${booking.session_date}).\n\nLink do ankiety:\n${formUrl}\n\nDo zobaczenia w studiu!\n\nRomans Tattoo`
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } finally {
      setSendingEmail(false);
    }
  };

  const formUrl = `${window.location.origin}/health-form?booking_id=${booking.id}`;

  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:w-80 lg:flex-shrink-0 lg:max-h-[calc(100vh-120px)]"
        style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', top: 'auto' }}
      >
      <div className="flex justify-between items-start mb-2">
        <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
          {booking.client_name}
        </h3>
        <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      <div className="mb-6">
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '3px 8px', border: `0.5px solid ${STATUS_COLORS[booking.status] || '#262626'}`,
          color: STATUS_COLORS[booking.status] || t.muted,
        }}>{booking.status}</span>
      </div>

      {[
        ['ID Sesji', booking.session_id || '—'],
        ['Email', booking.client_email],
        ['Telefon', booking.client_phone || '—'],
        ['Artysta', booking.artist_name || '—'],
        ['Data sesji', `${booking.session_date || '—'} ${booking.session_time || ''}`],
        ['Czas trwania', booking.session_duration ? `${Math.floor((booking.session_duration || 0) / 60)}h ${(booking.session_duration || 0) % 60}m` : '—'],
        ['Miejsce', booking.tattoo_placement || '—'],
        ['Opis projektu', booking.tattoo_description || '—'],
        ['Cena', booking.estimated_price ? `${booking.estimated_price} PLN` : '—'],
        ['Depozyt', booking.deposit_paid ? '✓ Wpłacony' : '✗ Brak'],
        ['Ankieta', booking.health_form_completed ? '✓ Wypełniona' : '✗ Brak'],
        ['Notatki', booking.notes || '—'],
      ].map(([label, value]) => (
        <div key={label} className="mb-3 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
          <p style={{ color: t.muted, fontSize: '12px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</p>
        </div>
      ))}

      {/* Status change */}
      <div className="mb-5">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZMIEŃ STATUS</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(booking.id, s)}
              style={{
                fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '7px', border: `0.5px solid ${booking.status === s ? STATUS_COLORS[s] : t.border}`,
                color: booking.status === s ? STATUS_COLORS[s] : t.muted,
                background: 'transparent', cursor: 'pointer',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Health form section */}
      {booking.health_form_completed ? (
        <div className="mb-4 p-3" style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={11} color="#16a34a" />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ANKIETA ZDROWOTNA — WYPEŁNIONA
            </p>
          </div>
          <button
           onClick={async () => {
             const forms = await base44.entities.HealthForm.filter({ booking_id: booking.id });
             if (forms.length) {
               setPreviewFormId(forms[0].id);
               setShowFormPreview(true);
             }
           }}
           style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#16a34a', background: 'transparent', padding: '7px 10px', border: '0.5px solid rgba(22,163,74,0.4)', marginTop: '6px', cursor: 'pointer', width: '100%' }}
          >
           <FileText size={10} /> PODGLĄD ANKIETY
          </button>
        </div>
      ) : (
        <div className="mb-4 p-3" style={{ border: '0.5px solid rgba(255,0,127,0.3)', background: 'rgba(255,0,127,0.04)' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
            ANKIETA ZDROWOTNA — BRAK
          </p>
          <div className="flex gap-2">
            <button onClick={copyFormLink}
              className="flex items-center gap-1.5 flex-1 justify-center py-2"
              style={{ border: '0.5px solid #FF007F', color: '#FF007F', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
              {copied ? <><Check size={11} /> SKOPIOWANO</> : <><Copy size={11} /> LINK</>}
            </button>
            <button onClick={sendFormEmail} disabled={sendingEmail}
              className="flex items-center gap-1.5 flex-1 justify-center py-2"
              style={{ border: `0.5px solid ${emailSent ? '#16a34a' : t.border}`, color: emailSent ? '#16a34a' : t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', opacity: sendingEmail ? 0.6 : 1 }}>
              {sendingEmail ? <Loader2 size={11} className="animate-spin" /> : emailSent ? <><Check size={11} /> WYSŁANO</> : <><Mail size={11} /> EMAIL</>}
            </button>
            <a href={formUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', border: `0.5px solid ${t.border}`, color: t.muted, textDecoration: 'none' }}>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Edit size={11} /> EDYTUJ
        </button>
        <button
          onClick={() => onDelete(booking.id)}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid #FF007F`, color: '#FF007F', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Trash2 size={11} /> USUŃ
        </button>
      </div>
    </motion.div>

    {showFormPreview && previewFormId && (
      <HealthFormPreviewModal
        healthFormId={previewFormId}
        clientName={booking.client_name}
        onClose={() => { setShowFormPreview(false); setPreviewFormId(null); }}
        t={t}
      />
    )}
    </>
  );
}