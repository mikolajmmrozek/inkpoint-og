import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Edit, Copy, Check, ExternalLink, Mail, FileText, Loader2, Save, Download, ChevronLeft, ChevronRight, Wallet, Phone, User, Calendar, Clock, MapPin, FileSignature, MessageSquare, CreditCard, QrCode } from 'lucide-react';
import { openHealthFormQRPage } from '@/lib/qrPage';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import HealthFormPreviewModal from './HealthFormPreviewModal';
import SettlementModal from './SettlementModal';
import ClientQuickViewModal from './ClientQuickViewModal';

const PAYMENT_METHOD_LABELS = { cash: 'Gotówka', card: 'Karta', voucher: 'Voucher' };
const PAYMENT_METHOD_COLORS = { cash: '#16a34a', card: '#2563eb', voucher: '#f59e0b' };
const STATUS_COLORS = {
  pending: '#FF007F',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};
const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled'];

function getThemeColors(theme) {
  if (theme === 'light') {
    return { bg: '#FFFFFF', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.65)', border: '#E5E5E5' };
  }
  return { bg: '#0A0A0A', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.75)', border: '#262626' };
}

export default function BookingDetailPanel({ booking, onClose, onStatusChange, onDelete, onEdit, t: tProp, theme = 'dark' }) {
  const t = tProp || getThemeColors(theme);
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [previewFormId, setPreviewFormId] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [clientRecord, setClientRecord] = useState(null);
  const [clientNotes, setClientNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(booking);

  useEffect(() => { setCurrentBooking(booking); }, [booking]);

  const handleSettled = (updated) => {
    setCurrentBooking(updated);
    setShowSettlement(false);
    if (onStatusChange) onStatusChange(updated.id, 'completed');
    // When settlement was opened from the detail panel, close the panel too.
    onClose();
  };

  useEffect(() => {
    // Gdy klient ma email — szukamy po emailu. Gdy nie ma — po imieniu i nazwisku (fallback).
    const hasEmail = !!(booking.client_email && booking.client_email.trim());
    const clientName = (booking.client_name || '').trim();
    const bookFilter = hasEmail ? { client_email: booking.client_email } : { client_name: clientName };
    base44.entities.Booking.filter(bookFilter)
      .then(sessions => {
        setClientHistory(sessions.filter(s => s.id !== booking.id).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '')));
      }).catch(() => {});
    const clientFilter = hasEmail ? { email: booking.client_email } : { name: clientName };
    base44.entities.Client.filter(clientFilter)
      .then(clients => {
        if (clients.length > 0) {
          setClientRecord(clients[0]);
          setClientNotes(clients[0].notes || '');
        }
      }).catch(() => {});
  }, [booking.id, booking.client_email, booking.client_name]);

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

  const formUrl = `${window.location.origin}/health-form?booking_id=${booking.id}`;
  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendFormEmail = async () => {
    setSendingEmail(true);
    try {
      await base44.functions.invoke('sendEmailViaResend', {
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

  const openHealthForm = async () => {
    const forms = await base44.entities.HealthForm.filter({ booking_id: booking.id });
    if (forms.length) {
      setPreviewFormId(forms[0].id);
      setShowFormPreview(true);
      setShowClientView(false);
    }
  };

  const timeLabel = (() => {
    if (!booking.session_time) return '—';
    if (booking.session_end_time) return `${booking.session_time} — ${booking.session_end_time}`;
    if (booking.session_duration) {
      const [h, m] = booking.session_time.split(':').map(Number);
      const endTotal = h * 60 + m + booking.session_duration;
      return `${booking.session_time} — ${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
    }
    return booking.session_time;
  })();

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };
  const phone = (booking.client_phone || clientRecord?.phone || '').trim();
  const email = (booking.client_email || clientRecord?.email || '').trim();

  const DetailRow = ({ label: lbl, value, icon: Icon }) => (
    <div className="py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={9} color="var(--brand)" />}
        <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{lbl}</p>
      </div>
      <p style={{ color: t.text, fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>{value || '—'}</p>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showImageLightbox ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', pointerEvents: showImageLightbox ? 'none' : 'auto' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: showImageLightbox ? '100%' : 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 h-full z-50 w-full sm:w-96 overflow-y-auto"
        style={{ borderLeft: `0.5px solid ${t.border}`, background: t.bg, padding: '24px', pointerEvents: showImageLightbox ? 'none' : 'auto' }}
      >
        {/* Header: avatar + name + client button + close */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setShowClientView(true)}
              title="Dane klienta"
              className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '0.5px solid rgb(var(--brand-rgb) /0.4)',
                background: 'rgb(var(--brand-rgb) /0.06)',
                cursor: 'pointer', padding: 0,
              }}
            >
              {clientRecord?.avatar_url ? (
                <img src={clientRecord.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--brand)', letterSpacing: '0.04em' }}>
                  {(booking.client_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <h3 style={{ ...display, fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                {booking.client_name}
              </h3>
              {(phone || email) && (
                <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.05em', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {phone}{phone && email ? ' · ' : ''}{email}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '7px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick contact buttons */}
        {(phone || email) && (
          <div className="flex gap-2 mb-5">
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 flex-1 py-2" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Phone size={11} color="#16a34a" /> ZADZWOŃ
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center justify-center gap-1.5 flex-1 py-2" style={{ border: `0.5px solid ${t.border}`, color: t.text, textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Mail size={11} color="var(--brand)" /> EMAIL
              </a>
            )}
          </div>
        )}

        {/* Action buttons (top) */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setShowSettlement(true)}
            className="btn-oxblood flex items-center gap-1.5 flex-1 justify-center py-2.5"
            style={{ fontSize: '9px' }}
          >
            <Wallet size={11} /> {currentBooking.is_settled ? 'EDYTUJ ROZLICZENIE' : 'ROZLICZ'}
          </button>
          <button
            onClick={safeOnEdit}
            className="flex items-center gap-1.5 justify-center py-2.5 px-3 transition-all hover:opacity-70"
            style={{ border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
          >
            <Edit size={11} /> EDYTUJ
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 justify-center py-2.5 px-3 transition-all hover:opacity-70"
            style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Status change */}
        <div className="mb-5">
          <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ZMIEŃ STATUS</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => safeOnStatusChange(booking.id, s)}
                style={{
                  ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
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
          <div className="mb-5 p-3" style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={11} color="#16a34a" />
              <p style={{ ...mono, fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                ANKIETA ZDROWOTNA — WYPEŁNIONA
              </p>
            </div>
            <button
              onClick={openHealthForm}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#16a34a', background: 'transparent', padding: '7px 10px', border: '0.5px solid rgba(22,163,74,0.4)', marginTop: '6px', cursor: 'pointer', width: '100%' }}
            >
              <FileText size={10} /> PODGLĄD ANKIETY
            </button>
          </div>
        ) : (
          <div className="mb-5 p-3" style={{ border: '0.5px solid rgb(var(--brand-rgb) /0.3)', background: 'rgb(var(--brand-rgb) /0.04)' }}>
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              ANKIETA ZDROWOTNA — BRAK
            </p>
            <div className="flex gap-2">
              <button onClick={() => openHealthFormQRPage(formUrl)}
                title="Pokaż kod QR do ankiety"
                className="flex items-center gap-1.5 flex-1 justify-center py-2"
                style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
                <QrCode size={12} /> QR
              </button>
              <button onClick={copyFormLink}
                className="flex items-center gap-1.5 flex-1 justify-center py-2"
                style={{ border: '0.5px solid var(--brand)', color: 'var(--brand)', ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}>
                {copied ? <><Check size={11} /> SKOPIOWANO</> : <><Copy size={11} /> LINK</>}
              </button>
              <button onClick={sendFormEmail} disabled={sendingEmail}
                className="flex items-center gap-1.5 flex-1 justify-center py-2"
                style={{ border: `0.5px solid ${emailSent ? '#16a34a' : t.border}`, color: emailSent ? '#16a34a' : t.muted, ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', opacity: sendingEmail ? 0.6 : 1 }}>
                {sendingEmail ? <Loader2 size={11} className="animate-spin" /> : emailSent ? <><Check size={11} /> WYSŁANO</> : <><Mail size={11} /> EMAIL</>}
              </button>
              <a href={formUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', border: `0.5px solid ${t.border}`, color: t.muted, textDecoration: 'none' }}>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {/* Settlement summary */}
        {currentBooking.is_settled && currentBooking.payment_breakdown && (
          <div className="mb-5 p-3" style={{ border: '0.5px solid rgba(22,163,74,0.3)', background: 'rgba(22,163,74,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Check size={11} color="#16a34a" />
              <p style={{ ...mono, fontSize: '8px', color: '#16a34a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                ROZLICZONO
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>FINAŁNA KWOTA</span>
                <span style={{ ...mono, fontSize: '12px', color: t.title, fontWeight: 600 }}>{Number(currentBooking.final_amount || 0).toLocaleString('pl-PL')} PLN</span>
              </div>
              {Number(currentBooking.deposit_amount || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>ZALICZKA</span>
                  <span style={{ ...mono, fontSize: '12px', color: t.muted }}>{Number(currentBooking.deposit_amount).toLocaleString('pl-PL')} PLN</span>
                </div>
              )}
              <div className="pt-2" style={{ borderTop: '0.5px solid rgba(22,163,74,0.2)' }}>
                {currentBooking.payment_breakdown.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PAYMENT_METHOD_COLORS[p.method] || t.muted }} />
                      <span style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                    </div>
                    <span style={{ ...mono, fontSize: '12px', color: t.title }}>{Number(p.amount || 0).toLocaleString('pl-PL')} PLN</span>
                  </div>
                ))}
              </div>
              {currentBooking.settled_by_name && (
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid rgba(22,163,74,0.15)' }}>
                  ROZLICZYŁ: {currentBooking.settled_by_name}{currentBooking.settled_date ? ` · ${new Date(currentBooking.settled_date).toLocaleDateString('pl-PL')}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="mb-5">
          <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>SZCZEGÓŁY SESJI</p>
          <div style={{ borderTop: `0.5px solid ${t.border}` }}>
            <DetailRow label="Data" value={booking.session_date || '—'} icon={Calendar} />
            <DetailRow label="Godziny" value={timeLabel} icon={Clock} />
            <DetailRow label="Artysta" value={booking.artist_name || '—'} icon={User} />
            <DetailRow label="Miejsce" value={booking.tattoo_placement || '—'} icon={MapPin} />
            <DetailRow label="Opis projektu" value={booking.tattoo_description || '—'} icon={FileSignature} />
            {booking.service_name && <DetailRow label="Usługa" value={booking.service_name} icon={FileText} />}
            <DetailRow label="Cena" value={booking.estimated_price ? `${booking.estimated_price} PLN` : '—'} icon={CreditCard} />
            <DetailRow label="Zaliczka" value={booking.deposit_amount ? `${booking.deposit_amount} PLN` : '—'} icon={Wallet} />
            <DetailRow label="Notatki klienta" value={booking.notes || '—'} icon={MessageSquare} />
            <DetailRow label="Notatki admina" value={booking.admin_notes || '—'} icon={FileText} />
          </div>
        </div>

        {/* Reference images */}
        {booking.reference_images && booking.reference_images.length > 0 && (
          <div className="mb-5">
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>REFERENCJE KLIENTA ({booking.reference_images.length})</p>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client notes */}
        {clientRecord && (
          <div className="mb-5">
            <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>NOTATKI O KLIENCIE</p>
            <textarea
              value={clientNotes}
              onChange={e => { setClientNotes(e.target.value); setNotesSaved(false); }}
              rows={3}
              placeholder="Alergie, preferencje, uwagi..."
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

        {/* Session ID — at the very bottom */}
        <div className="pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <p style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3px' }}>ID SESJI</p>
          <p style={{ ...mono, fontSize: '11px', color: t.muted, letterSpacing: '0.05em' }}>{booking.session_id || '—'}</p>
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

      {showSettlement && (
        <SettlementModal
          booking={currentBooking}
          user={user}
          onClose={() => setShowSettlement(false)}
          onSettled={handleSettled}
          t={t}
        />
      )}

      {showClientView && (
        <ClientQuickViewModal
          booking={booking}
          clientRecord={clientRecord}
          clientHistory={clientHistory}
          onClose={() => setShowClientView(false)}
          onShowHealthForm={openHealthForm}
          t={t}
        />
      )}

      {/* Image lightbox */}
      {showImageLightbox && booking.reference_images && booking.reference_images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            paddingTop: 'max(env(safe-area-inset-top), 1rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
            zIndex: 70, pointerEvents: 'auto', overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl"
            style={{ touchAction: 'none' }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={lightboxImageIndex}
                src={booking.reference_images[lightboxImageIndex]}
                alt="preview"
                className="max-w-full max-h-[80vh] object-contain cursor-grab active:cursor-grabbing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onTouchStart={(e) => { window.touchStartX = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diff = window.touchStartX - touchEndX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) setLightboxImageIndex(i => (i + 1) % booking.reference_images.length);
                    else setLightboxImageIndex(i => (i - 1 + booking.reference_images.length) % booking.reference_images.length);
                  }
                }}
              />
            </AnimatePresence>
          </motion.div>

          {booking.reference_images && booking.reference_images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImageIndex(i => (i - 1 + booking.reference_images.length) % booking.reference_images.length); }}
                style={{ position: 'fixed', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '12px', opacity: 0.7, transition: 'opacity 0.2s', zIndex: 71 }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.7'}
                title="Poprzednie"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImageIndex(i => (i + 1) % booking.reference_images.length); }}
                style={{ position: 'fixed', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '12px', opacity: 0.7, transition: 'opacity 0.2s', zIndex: 71 }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.7'}
                title="Następne"
              >
                <ChevronRight size={28} />
              </button>
              <span style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.5)', zIndex: 71 }}>
                {lightboxImageIndex + 1} / {booking.reference_images.length}
              </span>
            </>
          )}

          <button
            onClick={() => setShowImageLightbox(false)}
            style={{ position: 'fixed', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#FFF', padding: '8px', opacity: 0.8, transition: 'opacity 0.2s', zIndex: 72 }}
            onMouseEnter={e => e.target.style.opacity = '1'}
            onMouseLeave={e => e.target.style.opacity = '0.8'}
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
            style={{ position: 'fixed', bottom: '12px', right: '12px', background: 'rgb(var(--brand-rgb) /0.9)', color: '#FFF', padding: '8px 12px', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', opacity: 0.7, transition: 'opacity 0.2s', zIndex: 71 }}
            onMouseEnter={e => e.target.style.opacity = '1'}
            onMouseLeave={e => e.target.style.opacity = '0.7'}
          >
            <Download size={11} />
          </button>
        </motion.div>
      )}
    </>
  );
}