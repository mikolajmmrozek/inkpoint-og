import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function StepProcedure({ form, setField, t, inputStyle }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const template = await base44.entities.HealthFormTemplate.filter({ key: 'default' }).then(r => r[0]);
        if (template?.procedure_questions) setQuestions(template.procedure_questions);
      } catch (e) {
        console.error('Failed to load procedure questions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ color: 'rgba(245,240,235,0.5)' }}>Ładowanie...</div>;

  if (questions.length === 0) {
    return <p style={{ color: 'rgba(245,240,235,0.4)', fontSize: '14px' }}>Brak pytań przedzabiegowych.</p>;
  }

  return (
    <div>
      {questions.map(q => (
        <div key={q.field_key} className="py-3" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
          <div className="flex items-center justify-between gap-4">
            <p style={{ color: 'rgba(245,240,235,0.8)', fontSize: '14px', lineHeight: 1.4 }}>{q.label}{q.required && ' *'}</p>
            <div className="flex gap-2 flex-shrink-0">
              {[true, false].map(v => (
                <button type="button" key={String(v)} onClick={() => setField(q.field_key, v)}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', border: `0.5px solid ${form[q.field_key] === v ? (v ? '#FF007F' : '#16a34a') : '#262626'}`, color: form[q.field_key] === v ? (v ? '#FF007F' : '#16a34a') : 'rgba(245,240,235,0.3)', background: 'transparent', cursor: 'pointer' }}>
                  {v ? t.yes : t.no}
                </button>
              ))}
            </div>
          </div>
          {form[q.field_key] === true && q.has_description && (
            <input
              type="text"
              placeholder={t.describeIfYes}
              style={{ ...inputStyle, marginTop: '8px', fontSize: '13px' }}
              value={form[`${q.field_key}_desc`] || ''}
              onChange={e => setField(`${q.field_key}_desc`, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}