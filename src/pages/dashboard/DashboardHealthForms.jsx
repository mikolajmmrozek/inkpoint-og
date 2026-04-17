import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, X, ExternalLink, Copy, Shield, AlertTriangle, Search, Download, Mail, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from './Dashboard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BOOL_FIELDS = [
  ['has_heart_condition', 'Choroby serca', 'heart_condition_description'],
  ['has_kidney_condition', 'Choroby nerek', 'kidney_condition_description'],
  ['has_liver_condition', 'Choroby wątroby', 'liver_condition_description'],
  ['has_lung_condition', 'Choroby płuc', 'lung_condition_description'],
  ['has_cancer', 'Nowotwory', 'cancer_description'],
  ['has_infectious_diseases', 'Choroby zakaźne (HIV/WZW)', 'infectious_diseases_description'],
  ['has_epilepsy', 'Epilepsja', 'epilepsy_description'],
  ['has_diabetes', 'Cukrzyca', 'diabetes_description'],
  ['has_hemophilia', 'Hemofilia', 'hemophilia_description'],
  ['has_allergies', 'Alergie', 'allergies_description'],
  ['has_inflammatory_conditions', 'Choroby zapalne skóry', 'inflammatory_conditions_description'],
  ['has_skin_conditions', 'Inne choroby skóry', 'skin_conditions_description'],
  ['has_mental_conditions', 'Zaburzenia psychiczne', 'mental_conditions_description'],
  ['is_pregnant', 'Ciąża', null],
  ['is_under_alcohol_drug_influence', 'Pod wpływem alkoholu/narkotyków', null],
  ['is_allergic_to_metals_dyes_latex', 'Alergia na metale/barwniki/lateks', 'allergies_metals_dyes_latex_description'],
  ['has_blood_clotting_disorders', 'Zaburzenia krzepnięcia', 'blood_clotting_disorders_description'],
  ['has_scars_skin_changes', 'Bliznowce/zmiany skórne', 'scars_skin_changes_description'],
  ['had_tattoo_piercing_before', 'Wcześniejszy tatuaż/piercing', 'previous_reactions_description'],
];

const CONSENT_FIELDS = [
  ['consent_tattoo_piercing', 'Zgoda na zabieg'],
  ['confirm_sober', 'Trzeźwość'],
  ['consent_image_use', 'Zgoda na wizerunek'],
  ['confirm_regulations_read', 'Regulamin'],
];

function FormDetailPanel({ selected, guardianForm, t, onClose, theme }) {
  const hasFlags = BOOL_FIELDS.some(([k]) => selected[k] === true);

  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: '80vh', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex justify-between items-start p-5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
              {selected.client_name}
            </h3>
            {selected.is_minor && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', border: '0.5px solid #FF007F', padding: '2px 6px', letterSpacing: '0.08em' }}>NIELETNI</span>
            )}
            {selected.is_update_only && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#16a34a', border: '0.5px solid #16a34a', padding: '2px 6px', letterSpacing: '0.08em' }}>AKTUALIZACJA</span>
            )}
          </div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>
            {selected.client_email} · {selected.client_phone}
          </p>
          {selected.form_filled_date && (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '3px', letterSpacing: '0.06em' }}>
              {format(new Date(selected.form_filled_date), 'dd.MM.yyyy HH:mm')}
            </p>
          )}
        </div>
        <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* Session info */}
      <div className="px-5 py-3 flex gap-6" style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.03)' }}>
        {selected.procedure_type && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>ZABIEG</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#FF007F' }}>{selected.procedure_type}</p>
          </div>
        )}
        {selected.body_placement && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>MIEJSCE</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.text }}>{selected.body_placement}</p>
          </div>
        )}
        {selected.date_of_birth && (
          <div>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>DATA UR.</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.text }}>{selected.date_of_birth}</p>
          </div>
        )}
      </div>

      {/* Medical flags warning */}
      {hasFlags && (
        <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.06)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
          <AlertTriangle size={12} color="#FF007F" />
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>
            UWAGA: Klient zgłosił problemy zdrowotne
          </p>
        </div>
      )}

      {/* Medical fields */}
      <div className="px-5 py-4">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>DANE MEDYCZNE</p>
        {BOOL_FIELDS.map(([field, label, descField]) => {
          const val = selected[field];
          if (val === undefined || val === null) return null;
          return (
            <div key={field}>
              <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.06em' }}>{label}</p>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', color: val === true ? '#FF007F' : '#16a34a' }}>
                  {val === true ? 'TAK' : 'NIE'}
                </span>
              </div>
              {descField && val && selected[descField] && (
                <p style={{ color: theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.5)', fontSize: '11px', padding: '2px 0 6px 8px', fontStyle: 'italic' }}>{selected[descField]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Consents */}
      <div className="px-5 pb-4">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>ZGODY</p>
        <div className="flex flex-wrap gap-2">
          {CONSENT_FIELDS.map(([field, label]) => (
            <div key={field} className="flex items-center gap-1.5 px-2 py-1" style={{ border: `0.5px solid ${selected[field] ? '#16a34a' : t.border}` }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selected[field] ? '#16a34a' : t.muted }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: selected[field] ? '#16a34a' : t.muted, letterSpacing: '0.08em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature */}
      {selected.client_signature && (
        <div className="px-5 pb-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '12px', marginBottom: '8px' }}>PODPIS KLIENTA</p>
          <img src={selected.client_signature} alt="Podpis" style={{ maxWidth: '240px', border: `0.5px solid ${t.border}`, background: theme === 'light' ? '#FFFFFF' : '#111', padding: '4px' }} />
        </div>
      )}

      {/* Guardian consent */}
      {guardianForm && (
        <div className="px-5 pb-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <div className="flex items-center gap-2 mt-4 mb-3">
            <Shield size={12} color="#FF007F" />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ZGODA OPIEKUNA PRAWNEGO</p>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text }}>{guardianForm.guardian_name}</p>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, marginTop: '2px' }}>{guardianForm.guardian_phone}</p>
          {guardianForm.guardian_signature && (
            <img src={guardianForm.guardian_signature} alt="Podpis opiekuna" style={{ maxWidth: '240px', border: `0.5px solid ${t.border}`, background: '#111', padding: '4px', marginTop: '8px' }} />
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardHealthForms() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F' };

  const [forms, setForms] = useState([]);
  const [guardianForms, setGuardianForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.HealthForm.list('-form_filled_date', 200),
      base44.entities.GuardianConsentForm.list('-form_filled_date', 100),
      base44.entities.Booking.list('-session_date', 200),
      base44.entities.Client.list('-created_date', 500),
    ]).then(([f, g, b, c]) => {
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
  const pendingBookings = bookings.filter(b => !b.health_form_completed && b.status !== 'cancelled');

  // Filter forms by search query
  const filteredForms = forms.filter(form => {
    const q = searchQuery.toLowerCase();
    return !q || 
      form.client_name?.toLowerCase().includes(q) ||
      form.client_first_name?.toLowerCase().includes(q) ||
      form.client_last_name?.toLowerCase().includes(q) ||
      form.client_email?.toLowerCase().includes(q) ||
      (form.form_filled_date && format(new Date(form.form_filled_date), 'dd.MM.yyyy').includes(q));
  });

  // Get sessions for selected form's booking
  const selectedSessions = selected ? bookings.filter(b => b.client_email === selected.client_email || b.client_name === selected.client_name) : [];

  const exportPDF = async (form) => {
    setExporting(true);
    try {
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; font-size: 12px;">
          <h1 style="font-size: 20px; margin-bottom: 20px;">ANKIETA ZDROWOTNA</h1>
          <p><strong>Imię i nazwisko:</strong> ${form.client_name}</p>
          <p><strong>Email:</strong> ${form.client_email}</p>
          <p><strong>Telefon:</strong> ${form.client_phone}</p>
          <p><strong>Data urodzenia:</strong> ${form.date_of_birth}</p>
          <p><strong>Data wypełnienia:</strong> ${format(new Date(form.form_filled_date), 'dd.MM.yyyy HH:mm')}</p>
          <p><strong>Procedura:</strong> ${form.procedure_type}</p>
          <p><strong>Miejsce:</strong> ${form.body_placement}</p>
        </div>
      `;
      const canvas = await html2canvas(element);
      const pdf = new jsPDF();
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 277);
      pdf.save(`ankieta-${form.client_name}-${form.form_filled_date}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const sendConfirmationEmail = async (form) => {
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: form.client_email,
        subject: 'Potwierdzenie wypełnienia ankiety zdrowotnej',
        body: `Dzień dobry ${form.client_name},\n\nPotwierdzamy, że Twoja ankieta zdrowotna została pomyślnie zarejestrowana w naszym systemie.\n\nDane na dzień: ${format(new Date(form.form_filled_date), 'dd.MM.yyyy')}\n\nDo zobaczenia w studiu!\n\nRomans Tattoo`
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const deleteForm = async (form) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ankietę dla ${getClientName(form)}?`)) return;
    await base44.entities.HealthForm.delete(form.id);
    setForms(f => f.filter(x => x.id !== form.id));
    setSelected(null);
  };

  const generalFormLink = `${window.location.origin}/health-form`;
  const [copiedGeneral, setCopiedGeneral] = useState(false);

  const copyGeneralLink = () => {
    navigator.clipboard.writeText(generalFormLink);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2000);
  };

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p style={{ ...mono, fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>DANE MEDYCZNE</p>
          <h2 style={{ ...display, fontSize: '2.5rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Ankiety Zdrowotne</h2>
        </div>
        <button
          onClick={() => navigate('/dashboard/form-template')}
          title="Edytuj szablon formularza"
          className="flex items-center gap-2"
          style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
        >
          <Settings size={13} /> EDYTUJ SZABLON
        </button>
      </div>

      {/* General form link section */}
      <div className="mb-6 p-4" style={{ border: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.03)' }}>
        <p style={{ ...mono, fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
          LINK OGÓLNY DO ANKIETY
        </p>
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
          <div className="px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <p style={{ ...mono, fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              REZERWACJE BEZ ANKIETY — WYŚLIJ LINK
            </p>
          </div>
          {pendingBookings.slice(0, 5).map((b, i) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < Math.min(pendingBookings.length, 5) - 1 ? `0.5px solid ${t.border}` : 'none' }}>
              <div>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{b.client_name}</p>
                <p style={{ ...mono, fontSize: '9px', color: t.muted, marginTop: '2px' }}>{b.session_date} · {b.artist_name}</p>
              </div>
              <div className="flex items-center gap-2">
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

      {/* Main grid: list + detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* List */}
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          <div className="px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              WYPEŁNIONE ANKIETY ({filteredForms.length})
            </p>
            <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '6px 10px' }}>
              <Search size={12} color={t.muted} />
              <input
                type="text"
                placeholder="Szukaj: imię, email, data..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '11px', width: '100%', fontFamily: 'Inter' }}
              />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="py-16 text-center">
              <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ANKIET</p>
            </div>
          ) : filteredForms.map((form, i) => (
            <div key={form.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              style={{ borderBottom: i < filteredForms.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.id === form.id ? 'rgba(255,0,127,0.05)' : 'transparent' }}
              onClick={() => setSelected(form)}
            >
              <FileText size={13} color={form.is_minor ? '#FF007F' : t.fuchsia} />
              <div className="flex-1 min-w-0">
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{getClientName(form)}</p>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{form.client_email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {form.is_minor && <span style={{ ...mono, fontSize: '7px', color: '#FF007F', border: '0.5px solid #FF007F', padding: '1px 4px' }}>NIELETNI</span>}
                  {form.is_update_only && <span style={{ ...mono, fontSize: '7px', color: '#16a34a', border: '0.5px solid #16a34a', padding: '1px 4px' }}>AKTUALIZACJA</span>}
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>
                    {form.procedure_type && `${form.procedure_type} · `}
                    {form.form_filled_date ? format(new Date(form.form_filled_date), 'dd.MM.yyyy') : ''}
                  </p>
                </div>
              </div>
              {/* Medical flag dot */}
              {BOOL_FIELDS.some(([k]) => form[k] === true) && (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF007F', flexShrink: 0 }} title="Problemy zdrowotne" />
              )}
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, maxHeight: '80vh', overflowY: 'auto' }}>
            {/* Header with actions */}
            <div className="flex justify-between items-start p-5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/dashboard/clients?email=${encodeURIComponent(selected.client_email)}`;
                    link.click();
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                >
                  <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.6rem', fontWeight: 400, color: t.fuchsia, letterSpacing: '0.04em', textDecoration: 'underline' }}>
                    {getClientName(selected)}
                  </h3>
                </button>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '4px' }}>
                  {selected.client_email} · {selected.client_phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportPDF(selected)}
                  disabled={exporting}
                  title="Pobierz PDF"
                  style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', opacity: exporting ? 0.5 : 1 }}
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => sendConfirmationEmail(selected)}
                  disabled={sendingEmail}
                  title="Wyślij email"
                  style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', opacity: sendingEmail ? 0.5 : 1 }}
                >
                  <Mail size={16} />
                </button>
                <button
                  onClick={() => deleteForm(selected)}
                  title="Usuń ankietę"
                  style={{ color: '#FF007F', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sessions list */}
            {selectedSessions.length > 0 && (
              <div className="px-5 py-3" style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.03)' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>SESJE</p>
                {selectedSessions.map(s => (
                  <div key={s.id} style={{ fontSize: '11px', color: t.text, marginBottom: '6px', paddingBottom: '6px', borderBottom: `0.5px solid ${t.border}` }}>
                    <button
                      onClick={() => navigate('/dashboard/bookings')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}
                    >
                      <p><strong style={{ color: t.fuchsia, textDecoration: 'underline' }}>{s.session_date}</strong> · {s.artist_name}</p>
                    </button>
                    <p style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{s.tattoo_description || s.tattoo_placement || 'Brak opisu'}</p>
                  </div>
                ))}
              </div>
            )}

            <FormDetailPanel selected={selected} guardianForm={selectedGuardian} t={t} onClose={() => setSelected(null)} theme={theme} />
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ border: `0.5px solid ${t.border}`, minHeight: '200px' }}>
            <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>WYBIERZ ANKIETĘ</p>
          </div>
        )}
      </div>
    </div>
  );
}