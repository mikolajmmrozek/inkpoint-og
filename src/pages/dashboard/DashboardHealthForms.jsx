import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';

export default function DashboardHealthForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.HealthForm.list('-created_date', 100)
      .then(setForms)
      .finally(() => setLoading(false));
  }, []);

  const BOOL_FIELDS = [
    ['has_allergies', 'Alergie', 'allergies_description'],
    ['has_skin_conditions', 'Choroby skóry', 'skin_conditions_description'],
    ['has_blood_disorders', 'Zaburzenia krzepnięcia', 'blood_disorders_description'],
    ['takes_medication', 'Przyjmuje leki', 'medication_description'],
    ['is_pregnant', 'Ciąża', null],
    ['has_diabetes', 'Cukrzyca', null],
    ['has_heart_condition', 'Choroby serca', null],
    ['has_epilepsy', 'Epilepsja', null],
    ['had_tattoo_before', 'Miał tatuaż wcześniej', null],
    ['had_reactions_before', 'Reakcje na tatuaż', 'reactions_description'],
  ];

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>DANE MEDYCZNE</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>Ankiety Zdrowotne</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* List */}
        <div style={{ border: '0.5px solid #262626' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
            </div>
          ) : forms.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>BRAK ANKIET</p>
            </div>
          ) : forms.map((form, i) => (
            <div
              key={form.id}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderBottom: i < forms.length - 1 ? '0.5px solid #262626' : 'none', background: selected?.id === form.id ? 'rgba(139,26,26,0.05)' : 'transparent' }}
              onClick={() => setSelected(form)}
            >
              <FileText size={14} color="#8B1A1A" />
              <div className="flex-1 min-w-0">
                <p style={{ color: '#F5F0EB', fontSize: '14px', fontWeight: 500 }}>{form.client_name}</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.08em', marginTop: '2px' }}>
                  {form.client_email} · {form.created_date ? format(new Date(form.created_date), 'dd.MM.yyyy') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div style={{ border: '0.5px solid #262626', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-start mb-6 pb-6" style={{ borderBottom: '0.5px solid #262626' }}>
              <div>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.75rem', fontWeight: 600, color: '#F5F0EB' }}>{selected.client_name}</h3>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.35)', letterSpacing: '0.08em', marginTop: '4px' }}>{selected.client_email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: 'rgba(245,240,235,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {BOOL_FIELDS.map(([field, label, descField]) => (
                <div key={field}>
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
                    <span style={{
                      fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: selected[field] ? '#8B1A1A' : 'rgba(245,240,235,0.25)',
                    }}>
                      {selected[field] === true ? 'TAK' : selected[field] === false ? 'NIE' : '—'}
                    </span>
                  </div>
                  {descField && selected[field] && selected[descField] && (
                    <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '12px', padding: '4px 0 8px 0', fontStyle: 'italic' }}>
                      {selected[descField]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {selected.signed_at && (
              <p className="mt-6 pt-4" style={{ borderTop: '0.5px solid #262626', fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.25)', letterSpacing: '0.08em' }}>
                PODPISANO: {format(new Date(selected.signed_at), 'dd.MM.yyyy HH:mm')}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ border: '0.5px solid #1a1a1a' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.1)', letterSpacing: '0.1em' }}>WYBIERZ ANKIETĘ</p>
          </div>
        )}
      </div>
    </div>
  );
}