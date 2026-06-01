import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, X, ExternalLink, Copy, Shield, AlertTriangle, Search, Download, Mail, Trash2, Settings, Loader2, Edit3 } from 'lucide-react';
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
  const [localTemplate, setLocalTemplate] = useState(null);
  
  useEffect(() => {
    base44.entities.HealthFormTemplate.filter({ key: 'default' }).then(r => {
      if (r?.length > 0) setLocalTemplate(r[0]);
    });
  }, [selected?.id]);
  
  const allMedical = (Array.isArray(localTemplate?.medical_fields) ? localTemplate.medical_fields : BOOL_FIELDS);
  const allProcedure = (Array.isArray(localTemplate?.procedure_questions) ? localTemplate.procedure_questions : []);

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
            const consentFields = localTemplate?.consent_fields || [];
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

      {/* ID ankiety */}
      <div className="px-5 py-3" style={{ borderTop: `0.5px solid ${t.border}`, background: 'rgba(255,0,127,0.02)' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>ID ANKIETY</p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.08em', wordBreak: 'break-all' }}>{selected.id}</p>
      </div>
    </div>
  );
}