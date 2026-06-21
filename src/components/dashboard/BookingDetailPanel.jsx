import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Edit, Copy, Check, ExternalLink, Mail, FileText, Loader2, History, Save, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { base44 } from '@/api/base44Client';
import HealthFormPreviewModal from './HealthFormPreviewModal';

const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

function getThemeColors(theme) {
  if (theme === 'light') {
    return {
      bg: '#FFFFFF',
      title: '#111111',
      text: '#111111',
      muted: 'rgba(0,0,0,0.5)',
      border: '#E5E5E5',
    };
  }
  return {
    bg: '#0A0A0A',
    title: '#F5F0EB',
    text: '#F5F0EB',
    muted: 'rgba(245,240,235,0.5)',
    border: '#262626',
  };
}

export default function BookingDetailPanel({ booking, onClose, onStatusChange, onDelete, onEdit, t: tProp, theme = 'dark' }) {
  const t = tProp || getThemeColors(theme);
  const [copied, setCopied] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [previewFormId, setPreviewFormId] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [clientRecord, setClientRecord] = useState(null);
  const [clientNotes, setClientNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  useEffect(() => {
    if (!booking.client_email) return;
    // Load other sessions of this client
    base44.entities.Booking.filter({ client_email: booking.client_email })
      .then(sessions => {
        setClientHistory(sessions.filter(s => s.id !== booking.id).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '')));
      }).catch(() => {});
    // Load client record for notes
    base44.entities.Client.filter({ email: booking.client_email })
      .then(clients => {
        if (clients.length > 0) {
          setClientRecord(clients[0]);
          setClientNotes(clients[0].notes || '');
        }
      }).catch(() => {});
  }, [booking.id, booking.client_email]);

  const saveNotes = async () => {
    if (!clientRecord) return;
    setSavingNotes(true);
    await base44.entities.Client.update(clientRecord.id, { notes: clientNotes });
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const safeOnStatusChange = onStatusChange || (() => {});
  const safeOnDelete = onDelete || (() => {});
  const safeOnEdit = onEdit || (() => {});

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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 h-full z-50 w-full sm:w-96 overflow-y-auto"
        style={{ borderLeft: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}
      >
      <div className="flex justify-between items-start mb-2">
        <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.5rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
          {booking.client_name}
        </h3>
        <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      {/* Status change */}
      <div className="mb-5">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZMIEŃ STATUS</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => safeOnStatusChange(booking.id, s)}
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

      {[
       ['ID Sesji', booking.session_id || '—'],
       ['Email', booking.client_email],
       ['Telefon', booking.client_phone || '—'],
       ['Artysta', booking.artist_name || '—'],
       ['Data sesji', booking.session_date || '—'],
       ['Godziny', (() => {
         if (!booking.session_time) return '—';
         if (booking.session_end_time) return `${booking.session_time} — ${booking.session_end_time}`;
         if (booking.session_duration) {
           const [h, m] = booking.session_time.split(':').map(Number);
           const endTotal = h * 60 + m + booking.session_duration;
           const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
           const endM = String(endTotal % 60).padStart(2, '0');
           return `${booking.session_time} — ${endH}:${endM}`;
         }
         return booking.session_time;
       })()],
       ['Miejsce', booking.tattoo_placement || '—'],
       ['Opis projektu', booking.tattoo_description || '—'],
       ['Cena', booking.estimated_price ? `${booking.estimated_price} PLN` : '—'],
       ['Depozyt', booking.deposit_paid ? '✓ Wpłacony' : '✗ Brak'],
       ['Notatki', booking.notes || '—'],
      ].map(([label, value]) => (
       <div key={label} className="mb-3 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
         <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
         <p style={{ color: t.muted, fontSize: '12px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</p>
       </div>
      ))}

      {/* Reference images */}
      {booking.reference_images && booking.reference_images.length > 0 && (
        <div className="mb-5">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>REFERENCJE KLIENTA ({booking.reference_images.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {booking.reference_images.map((imgUrl, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={imgUrl} 
                  alt={`ref-${idx}`} 
                  className="w-full h-20 object-cover cursor-pointer"
                  style={{ border: `0.5px solid ${t.border}` }}
                  onClick={() => { setLightboxImageIndex(idx); setShowImageLightbox(true); }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                      onClick={() => { setLightboxImageIndex(idx); setShowImageLightbox(true); }}
                      style={{ background: '#FF007F', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Podgląd"
                    >
                      <Eye size={12} color="#FFF" />
                    </button>
                  <a
                    href={imgUrl}
                    download={`reference-${idx}`}
                    style={{ background: '#FF007F', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                    title="Pobierz"
                  >
                    <Download size={12} color="#FFF" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client notes */}
      {clientRecord && (
        <div className="mb-5">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>NOTATKI O KLIENCIE</p>
          <textarea
            value={clientNotes}
            onChange={e => { setClientNotes(e.target.value); setNotesSaved(false); }}
            rows={3}
            placeholder="Alergie, preferencje, uwagi..."
            style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '8px 10px', fontSize: '12px', color: t.title, fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = '#FF007F'}
            onBlur={e => e.target.style.borderColor = t.border}
          />
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="flex items-center gap-1.5 mt-2 py-1.5 px-3"
            style={{ border: `0.5px solid ${notesSaved ? '#16a34a' : t.border}`, color: notesSaved ? '#16a34a' : t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', opacity: savingNotes ? 0.6 : 1 }}
          >
            {savingNotes ? <Loader2 size={10} className="animate-spin" /> : notesSaved ? <><Check size={10} /> ZAPISANO</> : <><Save size={10} /> ZAPISZ</>}
          </button>
        </div>
      )}

      {/* Client session history */}
      {clientHistory.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <History size={10} color="#FF007F" />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              HISTORIA SESJI ({clientHistory.length})
            </p>
          </div>
          <div style={{ border: `0.5px solid ${t.border}` }}>
            {clientHistory.slice(0, 5).map((s, i) => (
              <div key={s.id} className="px-3 py-2" style={{ borderBottom: i < Math.min(clientHistory.length, 5) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
                <div className="flex items-center justify-between gap-2">
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: { pending: '#FF007F', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#9ca3af' }[s.status] || t.muted, flexShrink: 0 }} />
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, flex: 1 }}>{s.session_date || '—'}</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.status}</p>
                </div>
                {s.tattoo_placement && (
                  <p style={{ fontSize: '11px', color: t.title, marginTop: '2px', paddingLeft: '14px' }}>{s.tattoo_placement}{s.artist_name ? ` · ${s.artist_name}` : ''}</p>
                )}
                {s.estimated_price && (
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, paddingLeft: '14px' }}>{s.estimated_price} PLN</p>
                )}
              </div>
            ))}
          </div>
          {clientHistory.length > 5 && (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', marginTop: '6px', textAlign: 'right' }}>
              + {clientHistory.length - 5} więcej sesji
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={safeOnEdit}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Edit size={11} /> EDYTUJ
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 flex-1 justify-center py-2.5 transition-all hover:opacity-70"
          style={{ border: `0.5px solid #FF007F`, color: '#FF007F', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
        >
          <Trash2 size={11} /> USUŃ
        </button>
      </div>
    </motion.div>

    <ConfirmDeleteDialog
      open={showDeleteConfirm}
      title="Usuń rezerwację"
      message={`Czy na pewno chcesz usunąć sesję klienta "${booking.client_name}" z dnia ${booking.session_date}?`}
      onConfirm={() => { setShowDeleteConfirm(false); safeOnDelete(booking.id); }}
      onCancel={() => setShowDeleteConfirm(false)}
      theme={theme}
    />

    {showFormPreview && previewFormId && (
      <HealthFormPreviewModal
        healthFormId={previewFormId}
        clientName={booking.client_name}
        onClose={() => { setShowFormPreview(false); setPreviewFormId(null); }}
        t={t}
      />
    )}

    {/* Image lightbox */}
    {showImageLightbox && booking.reference_images && booking.reference_images.length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowImageLightbox(false)}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={e => e.stopPropagation()}
          className="relative max-w-4xl"
        >
          <img src={booking.reference_images[lightboxImageIndex]} alt="preview" className="max-w-full max-h-[80vh] object-contain" />
          
          {/* Navigation arrows */}
          {booking.reference_images.length > 1 && (
            <>
              <button
                onClick={() => setLightboxImageIndex(i => (i - 1 + booking.reference_images.length) % booking.reference_images.length)}
                style={{ position: 'absolute', left: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#FF007F', padding: '12px', opacity: 0.7, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.7'}
                title="Poprzednie"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={() => setLightboxImageIndex(i => (i + 1) % booking.reference_images.length)}
                style={{ position: 'absolute', right: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#FF007F', padding: '12px', opacity: 0.7, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.7'}
                title="Następne"
              >
                <ChevronRight size={28} />
              </button>
              <span style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                {lightboxImageIndex + 1} / {booking.reference_images.length}
              </span>
            </>
          )}

          <button
            onClick={() => setShowImageLightbox(false)}
            style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#FFF', padding: '8px', opacity: 0.6, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.target.style.opacity = '1'}
            onMouseLeave={e => e.target.style.opacity = '0.6'}
          >
            <X size={24} />
          </button>
          <button
            onClick={() => {
              const isMobile = /iPhone|iPad|Android|webOS|BlackBerry/i.test(navigator.userAgent);
              const url = booking.reference_images[lightboxImageIndex];
              
              const a = document.createElement('a');
              a.href = url;
              a.download = isMobile ? '' : `reference-${lightboxImageIndex}.jpg`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255,0,127,0.9)', color: '#FFF', padding: '8px 12px', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'JetBrains Mono', fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.target.style.opacity = '1'}
            onMouseLeave={e => e.target.style.opacity = '0.7'}
          >
            <Download size={11} />
          </button>
        </motion.div>
      </motion.div>
    )}
    </>
  );
}