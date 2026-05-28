import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function StepProcedure({ form, setField, t, inputStyle }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const template = await base44.entities.HealthFormTemplate.filter({ key: 'default' }).then(r => r[0]);
        if (template?.procedure_questions) {
          setQuestions(template.procedure_questions);
        }
      } catch (e) {
        console.error('Failed to load procedure questions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ color: 'rgba(245,240,235,0.5)' }}>Ładowanie...</div>;

  return (
    <div className="space-y-4">
      {questions.map(q => (
        <div key={q.field_key}>
          <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            {q.label}
          </label>
          <textarea
            placeholder="Twoja odpowiedź..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            value={form[q.field_key] || ''}
            onChange={e => setField(q.field_key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}