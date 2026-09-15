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
      const clientName = form.client_name || `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();

      const medFields = template?.medical_fields
        ? template.medical_fields.map(f => ({ key: f.field_key, label: f.label, descKey: f.has_description !== false ? `${f.field_key}_desc` : null }))
        : BOOL_FIELDS.map(f => ({ key: f[0], label: f[1], descKey: f[2] }));
      const procQs = template?.procedure_questions || [];
      const consentFields = template?.consent_fields || [];
      const decl = template?.declaration_of_will;
      const declCustomFields = template?.declaration_fields || [];

      const row = (label, val) => val ? `<tr><td class="lbl">${label}</td><td class="val">${val}</td></tr>` : '';

      const medRows = medFields.map(({ key, label, descKey }) => {
        const ans = form[key];
        const color = ans === true ? '#c8003c' : ans === false ? '#16a34a' : '#999';
        const txt = ans === true ? 'TAK' : ans === false ? 'NIE' : '—';
        const desc = ans === true && descKey && form[descKey] ? `<div class="desc">→ ${form[descKey]}</div>` : '';
        return `<tr><td class="q">${label}</td><td class="ans" style="color:${color}">${txt}</td></tr>${desc ? `<tr><td colspan="2">${desc}</td></tr>` : ''}`;
      }).join('');

      const procRows = procQs.map(q => {
        const ans = form[q.field_key];
        const color = ans === true ? '#f97316' : ans === false ? '#16a34a' : '#999';
        const txt = ans === true ? 'TAK' : ans === false ? 'NIE' : '—';
        const desc = ans === true && form[`${q.field_key}_desc`] ? `<div class="desc">→ ${form[`${q.field_key}_desc`]}</div>` : '';
        return `<tr><td class="q">${q.label}</td><td class="ans" style="color:${color}">${txt}</td></tr>${desc ? `<tr><td colspan="2">${desc}</td></tr>` : ''}`;
      }).join('');

      const consentItems = consentFields.map(cf => {
        const agreed = form[cf.field_key];
        const markColor = agreed ? '#16a34a' : '#c8003c';
        const desc = cf.description ? `<p class="cdesc">${cf.description}</p>` : '';
        return `<div class="ci"><span class="cm" style="color:${markColor}">${agreed ? '✓' : '✕'}</span><div class="cb"><strong>${cf.label}</strong>${desc}</div></div>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Ankieta zdrowotna – ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:auto}
  body{font-family:'var(--font-body)',Arial,sans-serif;font-size:7.5pt;color:#111;background:#fff}
  .page{max-width:185mm;margin:0 auto;padding:6mm 0}
  .title-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px}
  h1{font-size:14pt;font-weight:800;letter-spacing:-0.5px}
  .form-id{font-size:7pt;color:#888;letter-spacing:.1em;font-family:monospace}
  .line{height:1.5px;background:#c8003c;margin-bottom:7px}
  .sec{margin-bottom:7px;page-break-inside:avoid}
  .sec-title{font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#c8003c;margin-bottom:3px;padding-bottom:2px;border-bottom:.5px solid #ddd}
  table{width:100%;border-collapse:collapse}
  td{padding:1px 0;vertical-align:top;font-size:7.5pt;line-height:1.3}
  td.lbl{font-weight:600;color:#444;width:38%;padding-right:6px}
  td.val{color:#111}
  td.q{width:82%;padding:1px 0}
  td.ans{width:18%;font-weight:700;text-align:right;padding:1px 0;white-space:nowrap;font-size:6.5pt}
  .desc{font-style:italic;color:#666;font-size:6.5pt;padding:0 0 2px 8px}
  .decl-ok{font-weight:700;font-size:8pt}
  .ci{display:flex;gap:5px;align-items:flex-start;margin-bottom:3px}
  .cm{font-size:9pt;font-weight:700;line-height:1.1;flex-shrink:0;width:13px}
  .cb strong{font-size:7.5pt}
  .cdesc{font-size:6.5pt;color:#555;margin-top:1px;line-height:1.3}
  .sig{border:.5px solid #ccc;padding:3px;display:inline-block;margin-top:3px;background:#fff}
  .sig img{max-width:160px;max-height:48px;display:block}
  .personal-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
  .personal-grid .row{display:flex;gap:4px;padding:1px 0;border-bottom:.5px solid #f0f0f0}
  .personal-grid .row .lbl{font-weight:600;color:#444;font-size:7pt;width:45%;flex-shrink:0}
  .personal-grid .row .val{color:#111;font-size:7pt}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:0}
    html,body{height:auto !important;overflow:visible !important}
    @page{margin:10mm 12mm;size:A4}
  }
</style>
</head>
<body>
<div class="page">
  <div class="title-row">
    <h1>ANKIETA ZDROWOTNA</h1>
    <span class="form-id">${form.id?.slice(-8).toUpperCase()}</span>
  </div>
  <div class="line"></div>

  <div class="sec">
    <div class="sec-title">Dane osobowe</div>
    <div class="personal-grid">
      <div class="row"><span class="lbl">Imię i nazwisko</span><span class="val">${clientName}</span></div>
      <div class="row"><span class="lbl">Email</span><span class="val">${form.client_email || '&mdash;'}</span></div>
      <div class="row"><span class="lbl">Telefon</span><span class="val">${form.client_phone || '&mdash;'}</span></div>
      <div class="row"><span class="lbl">Data urodzenia</span><span class="val">${form.date_of_birth || '&mdash;'}</span></div>
      ${form.pesel ? `<div class="row"><span class="lbl">PESEL</span><span class="val">${form.pesel}</span></div>` : ''}
      ${form.id_document ? `<div class="row"><span class="lbl">Dokument</span><span class="val">${form.id_document}</span></div>` : ''}
      <div class="row"><span class="lbl">Adres</span><span class="val">${[form.address_street, form.address_city, form.address_postal_code].filter(Boolean).join(', ') || '&mdash;'}</span></div>
      <div class="row"><span class="lbl">Zabieg</span><span class="val">${form.procedure_type || '&mdash;'}</span></div>
      <div class="row"><span class="lbl">Miejsce zabiegu</span><span class="val">${form.body_placement || '&mdash;'}</span></div>
      <div class="row"><span class="lbl">Data wypełnienia</span><span class="val">${safeFormat(form.form_filled_date, 'dd.MM.yyyy')}</span></div>
    </div>
  </div>

  <div class="sec" style="page-break-before:avoid">
    <div class="sec-title">Wywiad medyczny</div>
    <table style="border-top:.5px solid #eee">${medRows}</table>
  </div>

  ${procQs.length > 0 ? `<div class="sec"><div class="sec-title">Pytania przedzabiegowe</div><table>${procRows}</table></div>` : ''}

  <div class="sec"><div class="sec-title">Oświadczenie woli</div><p style="font-size:7.5pt;color:#333;margin-bottom:5px;font-weight:600">W pełni rozumiem, że:</p><table style="width:100%;border-collapse:collapse;font-size:6.5pt;color:#444;line-height:1.4"><tr><td style="width:50%;vertical-align:top;padding-right:8px"><ol style="margin:0;padding-left:12px">
    <li style="margin-bottom:2px">Tatuaż zostaje na całe życie i nie ma sposobu, żeby go usunąć tak, aby nie pozostał żaden ślad.</li>
    <li style="margin-bottom:2px">Wpływ tatuażu na zdrowie nie został do tej pory dokładnie zbadany.</li>
    <li style="margin-bottom:2px">Tatuaż lub przełkucie może mieć wpływ na interakcje społeczne.</li>
    <li style="margin-bottom:2px">Tatuaż może ulec zmianie z biegiem czasu &mdash; kolorystyka po zagojeniu zależy od koloru skóry, a starzenie wpływa na intensywność barw.</li>
    <li style="margin-bottom:2px">Tatuaż może odbiegać od projektu/symulacji w zależności od typu skóry i umiejscowienia wzoru.</li>
    <li style="margin-bottom:2px">Motyw tatuowany lub przełkucie może stać się z czasem niemodny, niepożądany bądź śmieszny.</li>
    <li style="margin-bottom:2px">Tatuator ma prawo dopasować wzór wielkością, formą i kolorem do anatomii miejsca.</li>
    <li style="margin-bottom:2px">Piercer ma prawo dopasować wybrany kolczyk do anatomii przesuwanego miejsca.</li>
    <li style="margin-bottom:2px">Tatuaż może zawierać cechy charakterystyczne dla stylu artysty.</li>
  </ol></td><td style="width:50%;vertical-align:top;padding-left:8px"><ol start="10" style="margin:0;padding-left:12px">
    <li style="margin-bottom:2px">Wizja artystyczna może odbiegać od oczekiwań klienta &mdash; wzor nie jest dokładną symulacją projektu.</li>
    <li style="margin-bottom:2px">Tatuaż lub kolczyk może wywołać reakcję alergiczną.</li>
    <li style="margin-bottom:2px">Tatuaż może spowodować efekt rozmycia pod skórą &mdash; uzależnione od rodzaju skóry.</li>
    <li style="margin-bottom:2px">Nie będę mógł oddać krwi przez 4 miesiące od wykonania tatuażu lub przełkucia.</li>
    <li style="margin-bottom:2px">Nie będę korzystać z kąpieli słonecznych przez 2 miesiące od zabiegu.</li>
    <li style="margin-bottom:2px">Nie będę korzystać z basenu ani otwartych zbiorników wodnych do czasu pełnego wygojenia (min. 2 miesiące).</li>
    <li style="margin-bottom:2px">Proces jest czasochłonny i bolesny; będę stosować się do zaleceń pielęgnacyjnych studia „ROMANS".</li>
    <li style="margin-bottom:2px">Tatuowane/przełkuwane miejsce może puchnąć, utrudniając motorykę ciała przez pewien czas.</li>
    <li style="margin-bottom:2px">Cena tatuażu/przełkucia zależy od wielkości/rodzaju; czas pracy artysty nie wpływa na cenę.</li>
  </ol></td></tr></table>${declCustomFields.length > 0 ? `<table style="margin-top:6px;margin-bottom:4px">${declCustomFields.map(f => form[f.field_key] ? `<tr><td class="lbl" style="width:45%">${f.label}</td><td class="val">${form[f.field_key]}</td></tr>` : '').join('')}</table>` : ''}<p class="decl-ok" style="margin-top:8px;color:${decl && form[decl.field_key] ? '#16a34a' : '#c8003c'}">${decl && form[decl.field_key] ? '✓ AKCEPTUJĘ POWYŻSZE INFORMACJE' : '✕ NIE ZAAKCEPTOWANO'}</p></div>

  ${consentFields.length > 0 ? `<div class="sec"><div class="sec-title">Zgody</div>${consentItems}</div>` : ''}

  ${form.client_signature ? `<div class="sec"><div class="sec-title">Podpis klienta</div><div class="sig"><img src="${form.client_signature}" alt="Podpis" /></div></div>` : ''}

  ${guardianForm ? `<div class="sec"><div class="sec-title">Zgoda opiekuna prawnego</div><table>
    ${row('Imię i nazwisko opiekuna', guardianForm.guardian_name)}
    ${row('Telefon opiekuna', guardianForm.guardian_phone)}
    ${row('Typ zabiegu', Array.isArray(guardianForm.procedure_type) ? guardianForm.procedure_type.join(', ') : guardianForm.procedure_type)}
    ${row('Miejsce zabiegu', guardianForm.body_placement)}
    ${row('Liczba zabiegów', guardianForm.num_procedures)}
  </table><div class="decl" style="margin-top:10px">Wyrażam zgodę jako prawny opiekun na wykonanie zabiegu tatuażu/piercingu osobie niepełnoletniej wskazanej powyżej. Oświadczam, że zapoznałem/-am się z możliwymi powikłaniami i ryzykiem związanym z wykonywanym zabiegiem oraz z zasadami pielęgnacji po zabiegu.</div>${guardianForm.guardian_signature ? `<p style="margin-top:8px;font-weight:600;font-size:9pt;color:#444">Podpis opiekuna:</p><div class="sig"><img src="${guardianForm.guardian_signature}" alt="Podpis opiekuna" /></div>` : ''}</div>` : ''}

</div>
${mode === 'print' ? "<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);})</script>" : ''}
</body></html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      if (mode === 'save') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `ankieta_${clientName.replace(/\s+/g, '_')}_${form.id?.slice(-8)}.html`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      }
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