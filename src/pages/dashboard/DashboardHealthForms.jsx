import { useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, X, ExternalLink, Copy, Shield, AlertTriangle, Search, Download, Mail, Trash2, Settings, Loader2, Edit3, Printer, CheckCheck, Plus, QrCode } from 'lucide-react';
import { openHealthFormQRPage } from '@/lib/qrPage';
import { format } from 'date-fns';
import { useTheme } from './Dashboard';
import { AnimatePresence } from 'framer-motion';
import BookingDetailPanel from '@/components/dashboard/BookingDetailPanel';
import HealthFormPreviewModal from '@/components/dashboard/HealthFormPreviewModal';
import StatsTile from '@/components/dashboard/StatsTile';
import { formatCompact } from '@/lib/formatNumber';
import { BOOL_FIELDS, safeFormat, openHealthFormPdf } from '@/lib/healthFormPdf';

export default function DashboardHealthForms() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)' };

  const [template, setTemplate] = useState(null);
  const [forms, setForms] = useState([]);
  const [guardianForms, setGuardianForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formFilter, setFormFilter] = useState('all'); // 'all' | 'unread'
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingLinkEmail, setSendingLinkEmail] = useState(null);
  const [dismissedReminders, setDismissedReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedFormReminders') || '[]'); } catch { return []; }
  });

  const dismissReminder = (bookingId) => {
    const next = [...dismissedReminders, bookingId];
    setDismissedReminders(next);
    localStorage.setItem('dismissedFormReminders', JSON.stringify(next));
  };

  useEffect(() => {
    Promise.all([
      base44.entities.HealthForm.list('-form_filled_date', 5000),
      base44.entities.GuardianConsentForm.list('-form_filled_date', 100),
      base44.entities.Booking.list('-session_date', 5000),
      base44.entities.Client.list('-created_date', 5000),
      base44.entities.HealthFormTemplate.filter({ key: 'default' }),
    ]).then(([f, g, b, c, tplArr]) => {
      if (tplArr?.length > 0) setTemplate(tplArr[0]);
      setForms(f);
      setGuardianForms(g);
      setBookings(b);
      setClients(c);
    }).finally(() => setLoading(false));
  }, []);

  const selectedGuardian = selected
    ? guardianForms.find(g => g.health_form_id === selected.id)
    : null;

  const getClientName = (form) => {
    if (form.client_first_name || form.client_last_name) {
      return `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
    }
    const client = clients.find(c => c.email === form.client_email || c.name === form.client_name);
    if (client) {
      return `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name;
    }
    return form.client_name;
  };

  const getFormLink = (booking) => {
    const base = window.location.origin;
    return `${base}/health-form?booking_id=${booking.id}`;
  };

  const copyLink = (booking) => {
    navigator.clipboard.writeText(getFormLink(booking));
    setCopiedId(booking.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Bookings without completed health form
  const pendingBookings = bookings.filter(b => !b.health_form_completed && b.status !== 'cancelled' && !dismissedReminders.includes(b.id));

  // Separate drafts from completed forms
  const completedForms = forms.filter(f => !f.is_draft);
  const draftForms = forms.filter(f => f.is_draft);

  // Filter forms by search query
  const filteredForms = completedForms.filter(form => {
    if (formFilter === 'unread' && form.is_read) return false;
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    return !q || 
      form.client_name?.toLowerCase().includes(q) ||
      form.client_first_name?.toLowerCase().includes(q) ||
      form.client_last_name?.toLowerCase().includes(q) ||
      form.client_email?.toLowerCase().includes(q) ||
      (form.form_filled_date && format(new Date(form.form_filled_date), 'dd.MM.yyyy').includes(q)) ||
      form.id?.toLowerCase().includes(q) ||
      form.id?.slice(-8).toLowerCase().includes(q);
  });

  const filteredDrafts = draftForms.filter(form => {
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    return !q ||
      form.client_name?.toLowerCase().includes(q) ||
      form.client_first_name?.toLowerCase().includes(q) ||
      form.client_email?.toLowerCase().includes(q);
  });

  // Get sessions for selected form's booking — only match by email (to avoid false matches on name)
  const selectedSessions = selected && selected.client_email
    ? bookings.filter(b => b.client_email === selected.client_email)
    : [];

  // Group forms by client email
  const groupedClients = Object.values(
    filteredForms.reduce((acc, form) => {
      const key = form.client_email || form.client_name || form.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(form);
      return acc;
    }, {})
  ).map(group => group.sort((a, b) => new Date(b.form_filled_date) - new Date(a.form_filled_date)));

  const selectedClientForms = selected
    ? (groupedClients.find(g => (g[0].client_email || g[0].client_name) === (selected.client_email || selected.client_name)) || [selected])
    : [];

  const exportPDF = async (form, mode = 'print') => {
    setExporting(true);
    try {
      const guardianForm = guardianForms.find(g => g.health_form_id === form.id);
      openHealthFormPdf(form, template, guardianForm, mode);
    } finally {
      setExporting(false);
    }
  };

  const sendConfirmationEmail = async (form) => {
    setSendingEmail(true);
    try {
      await base44.functions.invoke('sendEmailViaResend', {
        to: form.client_email,
        subject: 'Potwierdzenie wypełnienia ankiety zdrowotnej',
        body: `Dzień dobry ${form.client_name},\n\nPotwierdzamy, że Twoja ankieta zdrowotna została pomyślnie zarejestrowana w naszym systemie.\n\nDane na dzień: ${safeFormat(form.form_filled_date, 'dd.MM.yyyy')}\n\nDo zobaczenia w studiu!\n\nRomans Tattoo`
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const sendHealthFormLink = async (booking) => {
    setSendingLinkEmail(booking.id);
    try {
      const formLink = getFormLink(booking);
      await base44.functions.invoke('sendEmailViaResend', {
        to: booking.client_email,
        subject: 'Wypełnij ankietę zdrowotną — Romans Tattoo',
        body: `Dzień dobry ${booking.client_name},\n\nBlesko się mamy! Aby przygotować się do Twojej sesji, prosimy o wypełnienie ankiety zdrowotnej.\n\nLink do ankiety:\n${formLink}\n\nAnkieta powinna być wypełniona przed dniem sesji: ${booking.session_date}\n\nJeśli masz pytania, skontaktuj się z nami.\n\nRomans Tattoo`
      });
    } finally {
      setSendingLinkEmail(null);
    }
  };

  const [selectedSession, setSelectedSession] = useState(null);
  const [sendingEditLink, setSendingEditLink] = useState(false);

  const sendEditLink = async (form) => {
    setSendingEditLink(true);
    try {
      const link = `${window.location.origin}/health-form?edit_form_id=${form.id}`;
      await base44.functions.invoke('sendEmailViaResend', {
        to: form.client_email,
        subject: 'Popraw swoją ankietę zdrowotną — Romans Tattoo',
        body: `Dzień dobry ${form.client_name},\n\nProsimy o poprawienie danych w Twojej ankiecie zdrowotnej.\n\nKliknij poniższy link, aby edytować ankietę:\n${link}\n\nJeśli masz pytania, skontaktuj się z nami.\n\nRomans Tattoo`
      });
      alert(`Link do edycji wysłany na ${form.client_email}`);
    } finally {
      setSendingEditLink(false);
    }
  };

  const handleSelectForm = async (form) => {
    setSelected(form);
    if (!form.is_read) {
      try {
        await base44.entities.HealthForm.update(form.id, { is_read: true });
        setForms(prev => prev.map(f => f.id === form.id ? { ...f, is_read: true } : f));
      } catch (e) {}
    }
  };

  const markAllFormsAsRead = async () => {
    const unread = filteredForms.filter(f => !f.is_read);
    if (unread.length === 0) return;
    try {
      const unreadIds = unread.map(f => f.id);
      await base44.entities.HealthForm.updateMany({ id: { $in: unreadIds } }, { $set: { is_read: true } });
      setForms(prev => prev.map(f => unreadIds.includes(f.id) ? { ...f, is_read: true } : f));
    } catch (e) {}
  };

  const deleteForm = async (form) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ankietę dla ${getClientName(form)}?`)) return;
    await base44.entities.HealthForm.delete(form.id);
    setForms(f => f.filter(x => x.id !== form.id));
    setSelected(null);
  };

  const dismissAllReminders = () => {
    if (!window.confirm(`Ukryć wszystkie przypomnienia (${pendingBookings.length})?`)) return;
    const next = [...dismissedReminders, ...pendingBookings.map(b => b.id)];
    setDismissedReminders(next);
    localStorage.setItem('dismissedFormReminders', JSON.stringify(next));
  };

  const deleteAllDrafts = async () => {
    if (!window.confirm(`Czy na pewno chcesz usunąć wszystkie niedokończone ankiety (${filteredDrafts.length})?`)) return;
    try {
      await base44.entities.HealthForm.deleteMany({ id: { $in: filteredDrafts.map(f => f.id) } });
      setForms(prev => prev.filter(f => !f.is_draft));
    } catch (e) {}
  };

  const generalFormLink = `${window.location.origin}/health-form`;
  const [copiedGeneral, setCopiedGeneral] = useState(false);

  const copyGeneralLink = () => {
    navigator.clipboard.writeText(generalFormLink);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2000);
  };

  const mono = { fontFamily: 'var(--font-mono)' };
  const display = { fontFamily: 'var(--font-display)', fontWeight: 400 };

  return (
    <div>
      {/* Stats tiles + new button */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <StatsTile label="Wszystkie ankiety" value={formatCompact(completedForms.length)} active={formFilter === 'all'} onClick={() => setFormFilter('all')} t={t} />
        <StatsTile label="Nowe (nieprzeczytane)" value={formatCompact(completedForms.filter(f => !f.is_read).length)} active={formFilter === 'unread'} onClick={() => setFormFilter(formFilter === 'unread' ? 'all' : 'unread')} t={t} />
        <div className="ml-auto">
          <button
            onClick={() => openHealthFormQRPage(generalFormLink)}
            className="flex items-center gap-2 btn-oxblood"
            style={{ padding: '8px 16px' }}
          >
            <QrCode size={13} /> WYPEŁNIJ ANKIETĘ
          </button>
        </div>
      </div>

      {/* General form link section */}
      <div className="mb-6 p-4" style={{ border: `0.5px solid ${t.border}`, background: 'rgb(var(--brand-rgb) /0.03)' }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ ...mono, fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            LINK OGÓLNY DO ANKIETY
          </p>
          <a
            href="/dashboard/form-template"
            className="flex items-center gap-1.5"
            style={{ ...mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', textDecoration: 'none' }}
          >
            <Settings size={10} /> EDYTUJ SZABLON
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ flex: 1, padding: '8px 10px', border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: '2px' }}>
            <p style={{ ...mono, fontSize: '9px', color: t.muted, wordBreak: 'break-all' }}>{generalFormLink}</p>
          </div>
          <button
            onClick={copyGeneralLink}
            style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${copiedGeneral ? '#16a34a' : t.border}`, color: copiedGeneral ? '#16a34a' : t.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
          >
            {copiedGeneral ? '✓ SKOPIOWANO' : 'KOPIUJ'}
          </button>
          <a href={generalFormLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: `0.5px solid ${t.border}`, color: t.muted, cursor: 'pointer' }}>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Pending links section */}
      {pendingBookings.length > 0 && (
        <div className="mb-6" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <p style={{ ...mono, fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              REZERWACJE BEZ ANKIETY — WYŚLIJ LINK
            </p>
            <button onClick={dismissAllReminders} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${t.border}`, padding: '4px 10px', cursor: 'pointer' }}>
              <X size={10} /> UKRYJ WSZYSTKIE ({pendingBookings.length})
            </button>
          </div>
          {pendingBookings.slice(0, 5).map((b, i) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < Math.min(pendingBookings.length, 5) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
              <div>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{b.client_name}</p>
                <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '2px' }}>{b.session_date} · {b.artist_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dismissReminder(b.id)}
                  title="Ukryj przypomnienie"
                  style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                >
                  <X size={12} />
                </button>
               <button
                  onClick={() => sendHealthFormLink(b)}
                  disabled={sendingLinkEmail === b.id}
                  title="Wyślij link do ankiety"
                  style={{ color: sendingLinkEmail === b.id ? t.muted : t.fuchsia, background: 'none', border: 'none', cursor: sendingLinkEmail === b.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: sendingLinkEmail === b.id ? 0.5 : 1 }}
                >
                  {sendingLinkEmail === b.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                </button>
                <a href={getFormLink(b)} target="_blank" rel="noopener noreferrer"
                  style={{ color: t.muted, display: 'flex', alignItems: 'center' }}>
                  <ExternalLink size={12} />
                </a>
                <button onClick={() => copyLink(b)}
                  style={{ ...mono, fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', border: `0.5px solid ${copiedId === b.id ? '#16a34a' : t.border}`, color: copiedId === b.id ? '#16a34a' : t.muted, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Copy size={10} /> {copiedId === b.id ? 'SKOPIOWANO' : 'KOPIUJ LINK'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drafts section */}
      {filteredDrafts.length > 0 && (
        <div className="mb-6" style={{ border: `0.5px solid rgba(255,165,0,0.4)`, background: 'rgba(255,165,0,0.03)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `0.5px solid rgba(255,165,0,0.3)` }}>
            <p style={{ ...mono, fontSize: '8px', color: '#f97316', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              NIEDOKOŃCZONE ANKIETY (DRAFT) — {filteredDrafts.length}
            </p>
            <button onClick={deleteAllDrafts} className="flex items-center gap-1.5" style={{ ...mono, fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid var(--brand)', padding: '4px 10px', cursor: 'pointer' }}>
              <Trash2 size={10} /> USUŃ WSZYSTKIE ({filteredDrafts.length})
            </button>
          </div>
          {filteredDrafts.map((form, i) => (
            <div key={form.id} className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < filteredDrafts.length - 1 ? `0.5px solid rgba(255,165,0,0.2)` : 'none' }}>
              <div>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{form.client_name || form.client_first_name || '—'}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{form.client_email || 'brak email'}</p>
                <p style={{ ...mono, fontSize: '8px', color: 'rgba(255,165,0,0.7)', marginTop: '2px' }}>Ostatnia aktywność: {safeFormat(form.updated_date || form.created_date, 'dd.MM.yyyy HH:mm')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ ...mono, fontSize: '7px', color: '#f97316', border: '0.5px solid #f97316', padding: '2px 6px' }}>DRAFT</span>
                <a
                  href={`/health-form?edit_form_id=${form.id}`}
                  title="Kontynuuj wypełnianie"
                  style={{ ...mono, fontSize: '8px', color: '#f97316', border: '0.5px solid #f97316', padding: '3px 8px', textDecoration: 'none', letterSpacing: '0.08em', cursor: 'pointer' }}
                >
                  KONTYNUUJ
                </a>
                <button
                  onClick={() => deleteForm(form)}
                  title="Usuń draft"
                  style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ankiety zdrowotne */}
      <div className="mb-8">
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, marginBottom: '12px' }}>
          <div className="px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              ANKIETY ZDROWOTNE ({filteredForms.length}) — UKOŃCZONE
            </p>
            {/* Legenda kropek */}
            <div className="flex flex-wrap gap-4 mb-2">
              {[['var(--brand)', 'Problemy medyczne'], ['#f97316', 'Tak na pytanie przedzabiegowe'], ['#3b82f6', 'Brak zgody na wizerunek'], ['#16a34a', 'Wszystko OK']].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span style={{ ...mono, fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px', letterSpacing: '0.06em' }}>NIEPEŁNOLETNI</span>
                <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Niepełnoletni klient</span>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '6px 10px' }}>
              <Search size={12} color={t.muted} />
              <input
                type="text"
                placeholder="Szukaj: imię, email, data, #ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '11px', width: '100%', fontFamily: 'var(--font-body)' }}
              />
            </div>
            {filteredForms.some(f => !f.is_read) && (
              <button
                onClick={markAllFormsAsRead}
                className="mt-2 flex items-center gap-2"
                style={{ ...mono, fontSize: '8px', color: t.fuchsia, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid ' + t.fuchsia, padding: '5px 10px', cursor: 'pointer' }}
              >
                <CheckCheck size={11} /> Oznacz wszystkie jako przeczytane
              </button>
            )}
            </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ANKIET</p>
            </div>
          ) : (
            <div>
              {groupedClients.map((group, i) => {
                const form = group[0];
                const boolFieldKeys = BOOL_FIELDS.map(b => b[0]);
                const hasMedical = boolFieldKeys.some(k => form[k] === true);
                const hasProcedureYes = (template?.procedure_questions || []).some(q => form[q.field_key] === true || (form[`${q.field_key}_desc`] && form[`${q.field_key}_desc`].trim()));
                const noImageConsent = form.consent_image_use === false;
                const allOk = !hasMedical && !hasProcedureYes && !noImageConsent && !form.is_minor;
                return (
                  <div key={form.client_email || form.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    style={{ borderBottom: i < groupedClients.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.client_email === form.client_email ? 'rgb(var(--brand-rgb) /0.05)' : group.some(f => !f.is_read) ? 'rgb(var(--brand-rgb) /0.025)' : 'transparent', borderLeft: group.some(f => !f.is_read) ? '2px solid rgb(var(--brand-rgb) /0.4)' : '2px solid transparent' }}
                    onClick={() => handleSelectForm(form)}
                  >
                    <FileText size={13} color={form.is_minor ? 'var(--brand)' : t.fuchsia} />
                    {group.some(f => !f.is_read) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px' }}>NOWA</span>}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{getClientName(form)}</p>
                      <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{form.client_email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {group.length > 1 && <span style={{ ...mono, fontSize: '7px', color: t.fuchsia, border: `0.5px solid ${t.fuchsia}`, padding: '1px 4px' }}>{group.length} ANKIET</span>}
                        <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>
                          {form.procedure_type && `${form.procedure_type} · `}
                          {form.form_filled_date ? safeFormat(form.form_filled_date, 'dd.MM.yyyy') : ''}
                          {' · '}{form.id?.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center flex-shrink-0">
                      {form.is_minor && <span style={{ ...mono, fontSize: '7px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '1px 4px' }}>NIELETNI</span>}
                      {hasMedical && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--brand)' }} title="Problemy medyczne" />}
                      {hasProcedureYes && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f97316' }} title="Tak na pytanie przedzabiegowe" />}
                      {noImageConsent && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} title="Brak zgody na wizerunek" />}
                      {allOk && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }} title="Wszystko OK" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking detail panel */}
      <AnimatePresence>
        {selectedSession && (
          <BookingDetailPanel
            booking={selectedSession}
            theme={theme}
            onClose={() => setSelectedSession(null)}
            onStatusChange={async (id, status) => {
              await base44.entities.Booking.update(id, { status });
              setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
              setSelectedSession(s => s?.id === id ? { ...s, status } : s);
            }}
            onDelete={async (id) => {
              await base44.entities.Booking.delete(id);
              setBookings(b => b.filter(x => x.id !== id));
              setSelectedSession(null);
            }}
            onEdit={() => setSelectedSession(null)}
          />
        )}
      </AnimatePresence>

      {/* Health form preview modal — unified with client/artist panels */}
      {selected && (
        <HealthFormPreviewModal
          healthFormId={selected.id}
          clientName={getClientName(selected)}
          onClose={() => setSelected(null)}
          t={t}
          extraActions={[
            { icon: <Download size={14} />, label: 'Pobierz', onClick: () => exportPDF(selected, 'save'), color: exporting ? t.muted : t.muted },
            { icon: <Printer size={14} />, label: 'Drukuj', onClick: () => exportPDF(selected, 'print'), color: exporting ? t.muted : t.muted },
            { icon: <Trash2 size={14} />, label: 'Usuń', onClick: () => deleteForm(selected), color: 'var(--brand)' },
          ]}
          formSelector={selectedClientForms.length > 1 ? {
            forms: selectedClientForms,
            selectedId: selected.id,
            onSelect: (f) => setSelected(f),
          } : undefined}
        />
      )}
    </div>
  );
}