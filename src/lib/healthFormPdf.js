import { format } from 'date-fns';

export const safeFormat = (dateStr, fmt) => {
  try {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, fmt);
  } catch { return dateStr || ''; }
};

export const BOOL_FIELDS = [
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

// Build the full printable HTML document for a health form — same layout as the admin
// dashboard uses for print/save. Shared so the client panel and email link render
// the identical document.
export function buildHealthFormHtml(form, template, guardianForm, mode = 'print') {
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

  return `<!DOCTYPE html>
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
</body></html>`;
}

// Open or save the health form as a PDF document. mode = 'open' opens a preview in a
// new tab (the user can print or save as PDF from the browser); 'save' downloads the
// HTML document directly.
export function openHealthFormPdf(form, template, guardianForm, mode = 'open') {
  const clientName = form.client_name || `${form.client_first_name || ''} ${form.client_last_name || ''}`.trim();
  const html = buildHealthFormHtml(form, template, guardianForm, mode);
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
}