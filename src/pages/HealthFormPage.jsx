import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { Check } from 'lucide-react';

const QUESTIONS = [
  { id: 'has_allergies', label: 'Czy masz alergie?', followUp: 'allergies_description', followUpLabel: 'Opisz alergie' },
  { id: 'has_skin_conditions', label: 'Czy masz choroby skóry (łuszczyca, egzema, trądzik)?', followUp: 'skin_conditions_description', followUpLabel: 'Opisz choroby skóry' },
  { id: 'has_blood_disorders', label: 'Czy masz zaburzenia krzepnięcia krwi?', followUp: 'blood_disorders_description', followUpLabel: 'Opisz zaburzenia' },
  { id: 'takes_medication', label: 'Czy przyjmujesz leki (szczególnie rozrzedzające krew)?', followUp: 'medication_description', followUpLabel: 'Jakie leki?' },
  { id: 'is_pregnant', label: 'Czy jesteś w ciąży?', followUp: null },
  { id: 'has_diabetes', label: 'Czy masz cukrzycę?', followUp: null },
  { id: 'has_heart_condition', label: 'Czy masz choroby serca?', followUp: null },
  { id: 'has_epilepsy', label: 'Czy masz epilepsję?', followUp: null },
  { id: 'had_tattoo_before', label: 'Czy miałeś/aś tatuaż wcześniej?', followUp: null },
  { id: 'had_reactions_before', label: 'Czy miałeś/aś reakcje na tatuaż wcześniej?', followUp: 'reactions_description', followUpLabel: 'Opisz reakcje' },
];

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

export default function HealthFormPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('booking') || '';

  const [qIndex, setQIndex] = useState(-1); // -1 = intro, questions.length = done page
  const [form, setForm] = useState({
    booking_id: bookingId,
    client_name: '', client_email: '', date_of_birth: '',
  });
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQ = QUESTIONS[qIndex];

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setAnswer = (key, value) => setAnswers(a => ({ ...a, [key]: value }));

  const handleStart = () => {
    if (form.client_name && form.client_email) setQIndex(0);
  };

  const handleAnswer = (value) => {
    setAnswer(currentQ.id, value);
    if (!value && currentQ.followUp) {
      setAnswer(currentQ.followUp, '');
    }
  };

  const handleNext = () => {
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(q => q + 1);
    } else {
      setQIndex(QUESTIONS.length);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.HealthForm.create({
      ...form,
      ...answers,
      signature_consent: true,
      signed_at: new Date().toISOString(),
    });
    if (bookingId) {
      await base44.entities.Booking.update(bookingId, { health_form_completed: true });
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8" style={{ border: '0.5px solid #8B1A1A' }}>
            <Check size={24} color="#8B1A1A" />
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 700, color: '#F5F0EB' }}>
            Ankieta wysłana
          </h2>
          <p className="mt-6 text-sm" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '15px' }}>
            Dziękujemy za wypełnienie ankiety zdrowotnej. Do zobaczenia na sesji!
          </p>
        </motion.div>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout noFooter>
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-lg">
          {/* Logo / Title */}
          <div className="mb-16 text-center">
            <p className="text-micro text-oxblood mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em' }}>
              INK STUDIO
            </p>
            <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 700, color: '#F5F0EB' }}>
              Ankieta Zdrowotna
            </h1>
            {qIndex >= 0 && (
              <div className="mt-6 relative h-px" style={{ background: '#262626' }}>
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-700"
                  style={{ background: '#8B1A1A', width: `${((qIndex) / QUESTIONS.length) * 100}%` }}
                />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Intro */}
            {qIndex === -1 && (
              <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '15px', lineHeight: 1.8 }}>
                  Przed sesją prosimy o wypełnienie krótkiej ankiety zdrowotnej. Zajmie to ok. 2 minuty.
                </p>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Imię i Nazwisko *</label>
                  <input required style={inputStyle} value={form.client_name} onChange={e => update('client_name', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Email *</label>
                  <input required type="email" style={inputStyle} value={form.client_email} onChange={e => update('client_email', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <div>
                  <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Data urodzenia</label>
                  <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>
                <button onClick={handleStart} disabled={!form.client_name || !form.client_email} className="btn-oxblood w-full" style={{ opacity: form.client_name && form.client_email ? 1 : 0.4 }}>
                  ROZPOCZNIJ ANKIETĘ
                </button>
              </motion.div>
            )}

            {/* Questions */}
            {qIndex >= 0 && qIndex < QUESTIONS.length && (
              <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }} className="space-y-8">
                <div>
                  <p className="text-micro mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8B1A1A', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    PYTANIE {qIndex + 1} / {QUESTIONS.length}
                  </p>
                  <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', fontWeight: 600, color: '#F5F0EB', lineHeight: 1.1 }}>
                    {currentQ.label}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      onClick={() => handleAnswer(val)}
                      className="py-5 transition-all duration-200"
                      style={{
                        border: answers[currentQ.id] === val ? '0.5px solid #8B1A1A' : '0.5px solid #262626',
                        background: answers[currentQ.id] === val ? 'rgba(139,26,26,0.08)' : 'transparent',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                        color: answers[currentQ.id] === val ? '#8B1A1A' : 'rgba(245,240,235,0.5)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {val ? 'TAK' : 'NIE'}
                    </button>
                  ))}
                </div>

                {currentQ.followUp && answers[currentQ.id] === true && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="text-micro block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {currentQ.followUpLabel}
                    </label>
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, resize: 'none' }}
                      value={answers[currentQ.followUp] || ''}
                      onChange={e => setAnswer(currentQ.followUp, e.target.value)}
                      onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'}
                      onBlur={e => e.target.style.borderBottomColor = '#262626'}
                    />
                  </motion.div>
                )}

                <button
                  onClick={handleNext}
                  disabled={answers[currentQ.id] === undefined}
                  className="btn-oxblood w-full"
                  style={{ opacity: answers[currentQ.id] !== undefined ? 1 : 0.4 }}
                >
                  {qIndex < QUESTIONS.length - 1 ? 'NASTĘPNE PYTANIE' : 'ZAKOŃCZ ANKIETĘ'}
                </button>
              </motion.div>
            )}

            {/* Summary + submit */}
            {qIndex === QUESTIONS.length && (
              <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', fontWeight: 600, color: '#F5F0EB' }}>
                  Podsumowanie
                </h3>
                <p style={{ color: 'rgba(245,240,235,0.5)', fontSize: '14px', lineHeight: 1.8 }}>
                  Potwierdzam, że wszystkie podane informacje są prawdziwe i wyrażam zgodę na przetwarzanie danych w celu realizacji usługi tatuażu.
                </p>
                <div className="flex items-start gap-3 py-4" style={{ borderTop: '0.5px solid #262626', borderBottom: '0.5px solid #262626' }}>
                  <p style={{ color: 'rgba(245,240,235,0.4)', fontSize: '12px', lineHeight: 1.7 }}>
                    Świadomy/a ryzyka związanego z tatuowaniem, wyrażam świadomą zgodę na wykonanie zabiegu i potwierdzam prawdziwość wszystkich powyższych odpowiedzi.
                  </p>
                </div>
                <button onClick={handleSubmit} disabled={submitting} className="btn-oxblood w-full animate-pulse-oxblood">
                  {submitting ? 'WYSYŁANIE...' : 'PODPISZ I WYŚLIJ'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}