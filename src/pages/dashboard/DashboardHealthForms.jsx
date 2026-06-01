import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, X, ExternalLink, Copy, Shield, AlertTriangle, Search, Download, Mail, Trash2, Settings, Loader2, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from './Dashboard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const safeFormat = (dateStr, fmt) => {
  try {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, fmt);
  } catch { return dateStr || ''; }
};

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

function FormDetailPanel({ selected, guardianForm, t, onClose, theme, template }) {
  useEffect(() => {
    if (template) {
      // Template already provided via props
    }
  }, [template]);
  
  const allMedical = (Array.isArray(template?.medical_fields) ? template.medical_fields : BOOL_FIELDS);
  const allProcedure = (Array.isArray(template?.procedure_questions) ? template.procedure_questions : []);

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
            {selected.client_email} · <a href={`tel:${selected.client_phone}`} style={{ color: t.fuchsia, textDecoration: 'none' }}>{selected.client_phone}</a>
          </p>
          {selected.form_filled_date && (
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '3px', letterSpacing: '0.06em' }}>
          {safeFormat(selected.form_filled_date, 'dd.MM.yyyy HH:mm')}
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
      {allMedical.filter(field => {
        const fieldKey = field.field_key || field[0];
        return selected[fieldKey] === true;
      }).length > 0 && (
        <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,0,127,0.06)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
          <AlertTriangle size={12} color="#FF007F" />
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.08em' }}>
            UWAGA: Klient zgłosił problemy zdrowotne
          </p>
        </div>
      )}

      {/* Medical fields — ALL answers */}
      <div className="px-5 py-4">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>WYWIAD MEDYCZNY</p>
        {allMedical.map(field => {
          const fieldKey = field.field_key || field[0];
          const label = field.label || field[1];
          const descField = (field.has_description !== false) ? (field[2] || `${fieldKey}_desc`) : null;
          return (
            <div key={fieldKey}>
              <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.text, letterSpacing: '0.06em' }}>{label}</p>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', color: selected[fieldKey] === true ? '#FF007F' : selected[fieldKey] === false ? '#16a34a' : 'rgba(245,240,235,0.3)' }}>
                  {selected[fieldKey] === true ? 'TAK' : selected[fieldKey] === false ? 'NIE' : '—'}
                </span>
              </div>
              {selected[fieldKey] === true && descField && selected[descField] && (
                <p style={{ color: theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.5)', fontSize: '11px', padding: '2px 0 6px 8px', fontStyle: 'italic' }}>{selected[descField]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Procedure questions — ALL answers */}
      {allProcedure.length > 0 && (
        <div className="px-5 pb-4">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>PYTANIA PRZEDZABIEGOWE</p>
          {allProcedure.map(q => (
            <div key={q.field_key}>
              <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.text, letterSpacing: '0.06em' }}>{q.label}</p>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', color: selected[q.field_key] === true ? '#f97316' : selected[q.field_key] === false ? '#16a34a' : 'rgba(245,240,235,0.3)' }}>
                  {selected[q.field_key] === true ? 'TAK' : selected[q.field_key] === false ? 'NIE' : '—'}
                </span>
              </div>
              {selected[q.field_key] === true && (q.has_description !== false) && selected[`${q.field_key}_desc`] && (
                <p style={{ color: theme === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(245,240,235,0.5)', fontSize: '11px', padding: '2px 0 6px 8px', fontStyle: 'italic' }}>{selected[`${q.field_key}_desc`]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Consents — dynamic from template */}
      <div className="px-5 pb-4">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>ZGODY</p>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const consentFields = template?.consent_fields || [];
            return consentFields.map(field => (
              <div key={field.field_key} className="flex items-center gap-1.5 px-2 py-1" style={{ border: `0.5px solid ${selected[field.field_key] ? '#16a34a' : t.border}` }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selected[field.field_key] ? '#16a34a' : t.muted }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: selected[field.field_key] ? '#16a34a' : t.muted, letterSpacing: '0.08em' }}>{field.label}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Signature */}
      {selected.client_signature && (
        <div className="px-5 pb-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '12px', marginBottom: '8px' }}>PODPIS KLIENTA</p>
          <img src={selected.client_signature} alt="Podpis" style={{ maxWidth: '240px', border: `0.5px solid ${t.border}`, background: theme === 'light' ? '#FFFFFF' : '#111', padding: '4px' }} />
        </div>
      )}

      {/* Other Information — any unmapped fields */}
      {(() => {
        const knownFields = new Set([
          'id', 'created_date', 'updated_date', 'created_by',
          'booking_id', 'client_first_name', 'client_last_name', 'client_name', 'client_email', 'client_phone',
          'date_of_birth', 'address_street', 'address_city', 'address_postal_code', 'pesel', 'id_document',
          'procedure_type', 'body_placement', 'is_minor', 'is_update_only', 'previous_form_id',
          'guardian_consent_form_id', 'client_signature', 'form_filled_date',
        ]);
        const medicalKeys = (template?.medical_fields || []).map(f => f.field_key);
        const procKeys = (template?.procedure_questions || []).map(q => q.field_key);
        const consentKeys = (template?.consent_fields || []).map(f => f.field_key);
        const declKeys = (template?.declaration_fields || []).map(f => f.field_key);
        
        medicalKeys.forEach(k => { knownFields.add(k); knownFields.add(`${k}_desc`); });
        procKeys.forEach(k => { knownFields.add(k); knownFields.add(`${k}_desc`); });
        consentKeys.forEach(k => knownFields.add(k));
        declKeys.forEach(k => knownFields.add(k));
        knownFields.add(template?.declaration_of_will?.field_key);
        
        const otherFields = Object.entries(selected).filter(([k]) => !knownFields.has(k) && selected[k]);
        if (otherFields.length === 0) return null;
        
        return null;
      })()}

      {/* Guardian consent */}
      {guardianForm && (
        <div className="px-5 pb-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <div className="flex items-center gap-2 mt-4 mb-3">
            <Shield size={12} color="#FF007F" />
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ZGODA OPIEKUNA PRAWNEGO</p>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text }}>{guardianForm.guardian_name}</p>
          <a href={`tel:${guardianForm.guardian_phone}`} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.fuchsia, marginTop: '2px', display: 'block', textDecoration: 'none' }}>{guardianForm.guardian_phone}</a>
          {guardianForm.guardian_signature && (
            <img src={guardianForm.guardian_signature} alt="Podpis opiekuna" style={{ maxWidth: '240px', border: `0.5px solid ${t.border}`, background: theme === 'light' ? '#FFFFFF' : '#111', padding: '4px', marginTop: '8px' }} />
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

  const [template, setTemplate] = useState(null);
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
  const [sendingLinkEmail, setSendingLinkEmail] = useState(null);
  const [dismissedReminders, setDismissedReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedFormReminders') || '[]'); } catch { return []; }
  });

  const dismissReminder = (bookingId) => {
    const next = [...dismissedReminders, bookingId];
    setDismissedReminders(next);
    localStorage.setItem('dismissedFormReminders', JSON.stringify(next));
  };
  const [docTab, setDocTab] = useState('ankiety'); // 'ankiety', 'aftercare', 'regulamin'
  const [instructions, setInstructions] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.HealthForm.list('-form_filled_date', 200),
      base44.entities.GuardianConsentForm.list('-form_filled_date', 100),
      base44.entities.Booking.list('-session_date', 200),
      base44.entities.Client.list('-created_date', 500),
      base44.entities.Instruction.list(),
      base44.entities.TermsAndConditions.list(),
      base44.entities.HealthFormTemplate.filter({ key: 'default' }),
    ]).then(([f, g, b, c, i, t, tplArr]) => {
      if (tplArr?.length > 0) setTemplate(tplArr[0]);
      setForms(f);
      setGuardianForms(g);
      setBookings(b);
      setClients(c);
      setInstructions(i);
      setTerms(t);
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
          <p><strong>Data wypełnienia:</strong> ${safeFormat(form.form_filled_date, 'dd.MM.yyyy HH:mm')}</p>
          <p><strong>Procedura:</strong> ${form.procedure_type}</p>
          <p><strong>Miejsce:</strong> ${form.body_placement}</p>
        </div>
      `;
      const canvas = await html2canvas(element);
      const pdf = new jsPDF();
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 277);
      pdf.save(`ankieta-${form.client_name}-${safeFormat(form.form_filled_date, 'yyyy-MM-dd')}.pdf`);
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
      await base44.integrations.Core.SendEmail({
        to: booking.client_email,
        subject: 'Wypełnij ankietę zdrowotną — Romans Tattoo',
        body: `Dzień dobry ${booking.client_name},\n\nBlesko się mamy! Aby przygotować się do Twojej sesji, prosimy o wypełnienie ankiety zdrowotnej.\n\nLink do ankiety:\n${formLink}\n\nAnkieta powinna być wypełniona przed dniem sesji: ${booking.session_date}\n\nJeśli masz pytania, skontaktuj się z nami.\n\nRomans Tattoo`
      });
    } finally {
      setSendingLinkEmail(null);
    }
  };

  const [sendingEditLink, setSendingEditLink] = useState(false);

  const sendEditLink = async (form) => {
    setSendingEditLink(true);
    try {
      const link = `${window.location.origin}/health-form?edit_form_id=${form.id}`;
      await base44.integrations.Core.SendEmail({
        to: form.client_email,
        subject: 'Popraw swoją ankietę zdrowotną — Romans Tattoo',
        body: `Dzień dobry ${form.client_name},\n\nProsimy o poprawienie danych w Twojej ankiecie zdrowotnej.\n\nKliknij poniższy link, aby edytować ankietę:\n${link}\n\nJeśli masz pytania, skontaktuj się z nami.\n\nRomans Tattoo`
      });
      alert(`Link do edycji wysłany na ${form.client_email}`);
    } finally {
      setSendingEditLink(false);
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

      {/* Dokumenty - karty sekcji */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ key: 'ankiety', label: 'Ankiety' }, { key: 'aftercare', label: 'Zalecenia' }, { key: 'regulamin', label: 'Regulamin' }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setDocTab(tab.key)}
              style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${docTab === tab.key ? t.fuchsia : t.border}`, color: docTab === tab.key ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ankiety tab */}
        {docTab === 'ankiety' && (
          <div>
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, marginBottom: '12px' }}>
              <div className="px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  ANKIETY ZDROWOTNE ({filteredForms.length})
                </p>
                {/* Legenda kropek */}
                <div className="flex flex-wrap gap-4 mb-2">
                  {[['#FF007F', 'Problemy medyczne'], ['#f97316', 'Tak na pytanie przedzabiegowe'], ['#3b82f6', 'Brak zgody na wizerunek'], ['#16a34a', 'Wszystko OK']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>{label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <span style={{ ...mono, fontSize: '7px', color: '#FF007F', border: '0.5px solid #FF007F', padding: '1px 4px', letterSpacing: '0.06em' }}>NIEPEŁNOLETNI</span>
                    <span style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Niepełnoletni klient</span>
                  </div>
                </div>
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
                        style={{ borderBottom: i < groupedClients.length - 1 ? `0.5px solid ${t.border}` : 'none', background: selected?.client_email === form.client_email ? 'rgba(255,0,127,0.05)' : 'transparent' }}
                        onClick={() => setSelected(form)}
                      >
                        <FileText size={13} color={form.is_minor ? '#FF007F' : t.fuchsia} />
                        <div className="flex-1 min-w-0">
                          <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{getClientName(form)}</p>
                          <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{form.client_email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {group.length > 1 && <span style={{ ...mono, fontSize: '7px', color: t.fuchsia, border: `0.5px solid ${t.fuchsia}`, padding: '1px 4px' }}>{group.length} ANKIET</span>}
                            <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>
                              {form.procedure_type && `${form.procedure_type} · `}
                              {form.form_filled_date ? safeFormat(form.form_filled_date, 'dd.MM.yyyy') : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-row gap-2 items-center flex-shrink-0">
                          {form.is_minor && <span style={{ ...mono, fontSize: '7px', color: '#FF007F', border: '0.5px solid #FF007F', padding: '1px 4px' }}>NIELETNI</span>}
                          {hasMedical && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF007F' }} title="Problemy medyczne" />}
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
        )}

        {/* Aftercare tab */}
        {docTab === 'aftercare' && (
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0px' }}>
                ZALECENIA ({instructions.length})
              </p>
              <button
                onClick={() => navigate('/dashboard/documents')}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
              >
                <Edit3 size={12} /> EDYTUJ
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
              </div>
            ) : instructions.length === 0 ? (
              <div className="py-16 text-center">
                <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK DOKUMENTÓW</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {instructions.map((instr) => (
                  <div key={instr.id} style={{ border: `0.5px solid ${t.border}`, padding: '16px', background: 'rgba(255,0,127,0.02)' }}>
                    <p style={{ ...display, fontSize: '1.2rem', color: t.title, letterSpacing: '0.04em', marginBottom: '8px' }}>
                      {instr.title}
                    </p>
                    <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                      {instr.type === 'aftercare_tattoo' ? 'Pielęgnacja tatuażu' : instr.type === 'aftercare_piercing' ? 'Pielęgnacja piercingu' : instr.type === 'before_tattoo' ? 'Przed tatuażem' : 'Po piercingu'}
                    </p>
                    {instr.content ? (
                      <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>{instr.content}</p>
                    ) : (
                      <p style={{ ...mono, fontSize: '10px', color: t.muted, fontStyle: 'italic' }}>Brak treści</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regulamin tab */}
        {docTab === 'regulamin' && (
          <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                REGULAMIN STUDIA
              </p>
              <button
                onClick={() => navigate('/dashboard/documents')}
                className="flex items-center gap-2"
                style={{ ...mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}
              >
                <Edit3 size={12} /> EDYTUJ
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
              </div>
            ) : (
              <div className="p-4">
                {terms.length === 0 ? (
                  <div className="py-16 text-center">
                    <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em', marginBottom: '20px' }}>BRAK DOKUMENTU</p>
                  </div>
                ) : (
                  terms.map((t_item) => (
                    <div key={t_item.id} style={{ border: `0.5px solid ${t.border}`, padding: '20px', background: 'rgba(255,0,127,0.02)' }}>
                      <p style={{ ...display, fontSize: '1.4rem', color: t.title, letterSpacing: '0.04em', marginBottom: '12px' }}>
                        {t_item.title || 'Regulamin'}
                      </p>
                      {t_item.content ? (
                        <div style={{ color: t.text, fontSize: '13px', lineHeight: 1.7 }}>{t_item.content}</div>
                      ) : (
                        <p style={{ ...mono, fontSize: '10px', color: t.muted, fontStyle: 'italic' }}>Brak treści</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal overlay */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{ width: '100%', maxWidth: '680px', margin: '0 16px', background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}` }}>
            {/* Action bar */}
            <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div className="flex items-center gap-3">
                <button onClick={() => exportPDF(selected)} disabled={exporting} title="Pobierz PDF" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', opacity: exporting ? 0.5 : 1 }}><Download size={15} /></button>
                <button onClick={() => sendConfirmationEmail(selected)} disabled={sendingEmail} title="Wyślij email" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', opacity: sendingEmail ? 0.5 : 1 }}><Mail size={15} /></button>
                <button onClick={() => sendEditLink(selected)} disabled={sendingEditLink} title="Wyślij link do edycji" style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', opacity: sendingEditLink ? 0.5 : 1 }}><Edit3 size={15} /></button>
                <button onClick={() => deleteForm(selected)} title="Usuń ankietę" style={{ color: '#FF007F', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {/* Form selector — when client has multiple forms */}
            {selectedClientForms.length > 1 && (
              <div className="flex items-center gap-2 px-5 py-2 flex-wrap" style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.03)' }}>
                <p style={{ ...mono, fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: '4px' }}>ANKIETY:</p>
                {selectedClientForms.map(f => (
                  <button key={f.id} onClick={() => setSelected(f)}
                    style={{ ...mono, fontSize: '8px', letterSpacing: '0.06em', padding: '3px 8px', border: `0.5px solid ${selected.id === f.id ? t.fuchsia : t.border}`, color: selected.id === f.id ? t.fuchsia : t.muted, background: selected.id === f.id ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer' }}
                  >
                    {f.form_filled_date ? safeFormat(f.form_filled_date, 'dd.MM.yyyy') : f.id.slice(-4)}{f.is_update_only ? ' ↻' : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Sessions */}
            {selectedSessions.length > 0 && (
              <div className="px-5 py-3" style={{ borderBottom: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.03)' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>SESJE</p>
                {selectedSessions.map(s => (
                  <div key={s.id} style={{ fontSize: '11px', color: t.text, marginBottom: '6px', paddingBottom: '6px', borderBottom: `0.5px solid ${t.border}` }}>
                    <button onClick={() => navigate('/dashboard/bookings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}>
                      <p><strong style={{ color: t.fuchsia, textDecoration: 'underline' }}>{s.session_date}</strong> · {s.artist_name}</p>
                    </button>
                    <p style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{s.tattoo_description || s.tattoo_placement || 'Brak opisu'}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <FormDetailPanel selected={selected} guardianForm={selectedGuardian} t={t} onClose={() => setSelected(null)} theme={theme} template={template} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}