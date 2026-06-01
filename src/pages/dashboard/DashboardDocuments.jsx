import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Trash2, X, Settings, Download, Printer, ExternalLink, Copy, Shield, AlertTriangle, Search, Mail, Loader2, Edit3, FileText } from 'lucide-react';
import { format } from 'date-fns';

const INSTRUCTION_TYPES = [
  { key: 'aftercare_tattoo', label: 'Pielęgnacja tatuażu' },
  { key: 'aftercare_piercing', label: 'Pielęgnacja piercingu' },
  { key: 'before_tattoo', label: 'Zalecenia przed tatuażem' },
  { key: 'after_piercing', label: 'Zalecenia po piercingu' },
];

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

const safeFormat = (dateStr, fmt) => {
  try {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, fmt);
  } catch { return dateStr || ''; }
};

export default function DashboardDocuments() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };

  const [tab, setTab] = useState('ankiety');
  const [instructions, setInstructions] = useState([]);
  const [terms, setTerms] = useState(null);
  const [healthForms, setHealthForms] = useState([]);
  const [guardianForms, setGuardianForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingInstr, setEditingInstr] = useState(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [instrForm, setInstrForm] = useState({ type: '', title: '', content: '' });
  const [termsForm, setTermsForm] = useState({ title: '', content: '' });
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Instruction.list(),
      base44.entities.TermsAndConditions.filter({ key: 'default' }),
      base44.entities.HealthForm.list('-form_filled_date', 200),
      base44.entities.GuardianConsentForm.list('-form_filled_date', 100),
      base44.entities.Booking.list('-session_date', 200),
      base44.entities.Client.list('-created_date', 500),
      base44.entities.HealthFormTemplate.filter({ key: 'default' }),
    ]).then(([i, t_list, hf, gf, b, c, tpl]) => {
      setInstructions(i);
      setTerms(t_list[0] || null);
      setHealthForms(hf);
      setGuardianForms(gf);
      setBookings(b);
      setClients(c);
      if (tpl?.length > 0) setTemplate(tpl[0]);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveInstr = async () => {
    if (editingInstr) {
      await base44.entities.Instruction.update(editingInstr.id, instrForm);
    } else {
      await base44.entities.Instruction.create(instrForm);
    }
    setInstructions(await base44.entities.Instruction.list());
    setEditingInstr(null);
    setInstrForm({ type: '', title: '', content: '' });
  };

  const handleDeleteInstr = async (id) => {
    if (!window.confirm('Usunąć dokument?')) return;
    await base44.entities.Instruction.delete(id);
    setInstructions(i => i.filter(x => x.id !== id));
  };

  const handleSaveTerms = async () => {
    if (terms?.id) {
      await base44.entities.TermsAndConditions.update(terms.id, { ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
      setTerms({ ...terms, ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
    } else {
      const created = await base44.entities.TermsAndConditions.create({ key: 'default', ...termsForm, last_updated: new Date().toISOString().split('T')[0] });
      setTerms(created);
    }
    setEditingTerms(false);
  };

  const getClientName = (form) => {
    if (form.client_first_name || form.client_last_name) {
      return `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
    }
    return form.client_name;
  };

  const filteredForms = healthForms.filter(form => {
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    return !q || 
      form.client_name?.toLowerCase().includes(q) ||
      form.client_email?.toLowerCase().includes(q) ||
      form.id?.toLowerCase().includes(q) ||
      form.id?.slice(-8).toLowerCase().includes(q);
  });

  const groupedClients = Object.values(
    filteredForms.reduce((acc, form) => {
      const key = form.client_email || form.client_name || form.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(form);
      return acc;
    }, {})
  ).map(group => group.sort((a, b) => new Date(b.form_filled_date) - new Date(a.form_filled_date)));

  const selectedGuardian = selected
    ? guardianForms.find(g => g.health_form_id === selected.id)
    : null;

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
  body{font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#111;background:#fff}
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
      <div class="row"><span class="lbl">Email</span><span class="val">${form.client_email || '—'}</span></div>
      <div class="row"><span class="lbl">Telefon</span><span class="val">${form.client_phone || '—'}</span></div>
      <div class="row"><span class="lbl">Data urodzenia</span><span class="val">${form.date_of_birth || '—'}</span></div>
      ${form.pesel ? `<div class="row"><span class="lbl">PESEL</span><span class="val">${form.pesel}</span></div>` : ''}
      ${form.id_document ? `<div class="row"><span class="lbl">Dokument</span><span class="val">${form.id_document}</span></div>` : ''}
      <div class="row"><span class="lbl">Adres</span><span class="val">${[form.address_street, form.address_city, form.address_postal_code].filter(Boolean).join(', ') || '—'}</span></div>
      <div class="row"><span class="lbl">Zabieg</span><span class="val">${form.procedure_type || '—'}</span></div>
      <div class="row"><span class="lbl">Miejsce zabiegu</span><span class="val">${form.body_placement || '—'}</span></div>
      <div class="row"><span class="lbl">Data wypełnienia</span><span class="val">${safeFormat(form.form_filled_date, 'dd.MM.yyyy')}</span></div>
    </div>
  </div>

  <div class="sec" style="page-break-before:avoid">
    <div class="sec-title">Wywiad medyczny</div>
    <table style="border-top:.5px solid #eee">${medRows}</table>
  </div>

  ${procQs.length > 0 ? `<div class="sec"><div class="sec-title">Pytania przedzabiegowe</div><table>${procRows}</table></div>` : ''}
  ${consentFields.length > 0 ? `<div class="sec"><div class="sec-title">Zgody</div>${consentItems}</div>` : ''}
  ${form.client_signature ? `<div class="sec"><div class="sec-title">Podpis klienta</div><div class="sig"><img src="${form.client_signature}" alt="Podpis" /></div></div>` : ''}
  ${guardianForm ? `<div class="sec"><div class="sec-title">Zgoda opiekuna prawnego</div><table>
    ${row('Imię i nazwisko opiekuna', guardianForm.guardian_name)}
    ${row('Telefon opiekuna', guardianForm.guardian_phone)}
  </table></div>` : ''}
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

  const mono = { fontFamily: 'JetBrains Mono' };
  const display = { fontFamily: 'Bebas Neue, system-ui', fontWeight: 400 };
  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    padding: '10px 0',
    fontSize: '14px',
    color: t.text,
    outline: 'none',
    fontFamily: 'Inter',
    width: '100%',
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p style={{ ...mono, fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>ZAWARTOŚĆ STUDIA</p>
          <h2 style={{ ...display, fontSize: '2.5rem', color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Dokumenty</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'ankiety', label: 'Ankiety' },
          { key: 'zalecenia', label: 'Zalecenia' },
          { key: 'regulamin', label: 'Regulamin' },
        ].map(t_tab => (
          <button
            key={t_tab.key}
            onClick={() => setTab(t_tab.key)}
            style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${tab === t_tab.key ? t.fuchsia : t.border}`, color: tab === t_tab.key ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}
          >
            {t_tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : (
        <div>
          {/* Ankiety */}
          {tab === 'ankiety' && (
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
              <div className="px-4 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    ANKIETY ZDROWOTNE ({filteredForms.length})
                  </p>
                </div>
                <div className="flex items-center gap-2" style={{ border: `0.5px solid ${t.border}`, padding: '6px 10px' }}>
                  <Search size={12} color={t.muted} />
                  <input
                    type="text"
                    placeholder="Szukaj: imię, email, #ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '11px', width: '100%', fontFamily: 'Inter' }}
                  />
                </div>
              </div>
              {filteredForms.length === 0 ? (
                <div className="py-16 text-center">
                  <p style={{ ...mono, fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ANKIET</p>
                </div>
              ) : (
                <div>
                  {groupedClients.map((group, i) => {
                    const form = group[0];
                    return (
                      <div key={form.client_email || form.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b"
                        style={{ borderBottomColor: i < groupedClients.length - 1 ? t.border : 'transparent', background: selected?.client_email === form.client_email ? 'rgba(255,0,127,0.05)' : 'transparent' }}
                        onClick={() => setSelected(form)}
                      >
                        <FileText size={13} color={t.fuchsia} />
                        <div className="flex-1 min-w-0">
                          <p style={{ color: t.text, fontSize: '13px', fontWeight: 500 }}>{getClientName(form)}</p>
                          <p style={{ ...mono, fontSize: '8px', color: t.muted, marginTop: '2px' }}>{form.client_email}</p>
                          <p style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginTop: '2px' }}>
                            {form.procedure_type && `${form.procedure_type} · `}
                            {form.form_filled_date ? safeFormat(form.form_filled_date, 'dd.MM.yyyy') : ''}
                            {' · '}{form.id?.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Zalecenia */}
          {tab === 'zalecenia' && (
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Zalecenia & Instrukcje</h3>
                <button onClick={() => { setEditingInstr('new'); setInstrForm({ type: '', title: '', content: '' }); }} className="flex items-center gap-2" style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
                  <Plus size={12} /> DODAJ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INSTRUCTION_TYPES.map(type => {
                  const instr = instructions.find(i => i.type === type.key);
                  return (
                    <div key={type.key} style={{ border: `0.5px solid ${t.border}`, padding: '16px', background: 'rgba(255,0,127,0.02)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p style={{ ...display, fontSize: '1.2rem', color: t.title, letterSpacing: '0.04em' }}>{type.label}</p>
                          {instr?.title && <p style={{ ...mono, fontSize: '9px', color: t.fuchsia, marginTop: '4px' }}>{instr.title}</p>}
                        </div>
                        {instr && (
                          <button onClick={() => handleDeleteInstr(instr.id)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6, minHeight: '60px', marginBottom: '12px' }}>
                        {instr?.content ? instr.content.substring(0, 120) + (instr.content.length > 120 ? '...' : '') : 'Brak treści'}
                      </p>
                      <button onClick={() => { setEditingInstr(instr?.id || type.key); setInstrForm(instr || { type: type.key, title: '', content: '' }); }} style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer' }}>
                        {instr ? 'EDYTUJ' : 'UTWÓRZ'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regulamin */}
          {tab === 'regulamin' && (
            <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '24px' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Regulamin Studia</h3>
                <button onClick={() => { setEditingTerms(true); setTermsForm(terms || { title: '', content: '' }); }} style={{ ...mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.fuchsia}`, color: t.fuchsia, background: 'transparent', cursor: 'pointer' }}>
                  EDYTUJ
                </button>
              </div>
              <div style={{ border: `0.5px solid ${t.border}`, padding: '16px', background: 'rgba(255,0,127,0.02)' }}>
                <p style={{ ...display, fontSize: '1.2rem', color: t.title, letterSpacing: '0.04em', marginBottom: '8px' }}>
                  {terms?.title || 'Regulamin'}
                </p>
                <p style={{ color: t.text, fontSize: '12px', lineHeight: 1.6 }}>
                  {terms?.content ? terms.content.substring(0, 200) + (terms.content.length > 200 ? '...' : '') : 'Brak treści'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal edycji instrukcji */}
      {editingInstr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditingInstr(null)}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>
                {editingInstr === 'new' ? 'Nowa instrukcja' : 'Edytuj instrukcję'}
              </h3>
              <button onClick={() => setEditingInstr(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="space-y-6">
              {editingInstr === 'new' && (
                <div>
                  <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Typ *</label>
                  <select
                    value={instrForm.type}
                    onChange={e => setInstrForm({ ...instrForm, type: e.target.value })}
                    style={{ ...inputStyle, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                  >
                    <option value="">Wybierz typ</option>
                    {INSTRUCTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input
                  type="text"
                  value={instrForm.title}
                  onChange={e => setInstrForm({ ...instrForm, title: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść</label>
                <textarea
                  rows={10}
                  value={instrForm.content}
                  onChange={e => setInstrForm({ ...instrForm, content: e.target.value })}
                  style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }}
                />
              </div>

              <div className="flex gap-4 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleSaveInstr} className="btn-oxblood flex-1" style={{ padding: '12px' }}>ZAPISZ</button>
                <button onClick={() => setEditingInstr(null)} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji regulaminu */}
      {editingTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEditingTerms(false)}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ ...display, fontSize: '1.8rem', color: t.title, letterSpacing: '0.04em' }}>Edytuj Regulamin</h3>
              <button onClick={() => setEditingTerms(false)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tytuł</label>
                <input
                  type="text"
                  value={termsForm.title}
                  onChange={e => setTermsForm({ ...termsForm, title: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ ...mono, fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść (HTML lub tekst)</label>
                <textarea
                  rows={15}
                  value={termsForm.content}
                  onChange={e => setTermsForm({ ...termsForm, content: e.target.value })}
                  style={{ ...inputStyle, borderBottom: 'none', border: `0.5px solid ${t.border}`, padding: '12px', resize: 'vertical' }}
                />
              </div>

              <div className="flex gap-4 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
                <button onClick={handleSaveTerms} className="btn-oxblood flex-1" style={{ padding: '12px' }}>ZAPISZ</button>
                <button onClick={() => setEditingTerms(false)} className="btn-ghost-parchment">ANULUJ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{ width: '100%', maxWidth: '680px', margin: '0 16px', background: theme === 'light' ? '#FFFFFF' : '#0A0A0A', border: `0.5px solid ${t.border}` }}>
            <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
              <div className="flex items-center gap-3">
                <button onClick={() => exportPDF(selected, 'save')} disabled={exporting} style={{ color: t.muted, background: 'none', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1 }}><Download size={15} /></button>
                <button onClick={() => exportPDF(selected, 'print')} disabled={exporting} style={{ color: t.muted, background: 'none', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1 }}><Printer size={15} /></button>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
              <p style={{ ...display, fontSize: '1.6rem', color: t.title, letterSpacing: '0.04em', marginBottom: '12px' }}>{getClientName(selected)}</p>
              <p style={{ ...mono, fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginBottom: '16px' }}>{selected.client_email}</p>
              {selected.procedure_type && <p style={{ color: t.text, fontSize: '13px', marginBottom: '8px' }}><strong>Zabieg:</strong> {selected.procedure_type}</p>}
              {selected.body_placement && <p style={{ color: t.text, fontSize: '13px', marginBottom: '8px' }}><strong>Miejsce:</strong> {selected.body_placement}</p>}
              {selected.form_filled_date && <p style={{ color: t.text, fontSize: '13px', marginBottom: '16px' }}><strong>Data:</strong> {safeFormat(selected.form_filled_date, 'dd.MM.yyyy')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}