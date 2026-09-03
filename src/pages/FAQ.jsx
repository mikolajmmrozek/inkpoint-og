import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { base44 } from '@/api/base44Client';

const DEFAULT_FAQS = [
  { id: 'd1', question: 'Czy tatuaż boli?', answer: 'Ból jest subiektywny i zależy od miejsca na ciele. Okolice żeber, stopy i wewnętrzna strona ramienia są bardziej wrażliwe. Większość klientów opisuje odczucie jako znośne.' },
  { id: 'd2', question: 'Ile kosztuje tatuaż?', answer: 'Cena zależy od rozmiaru, stylu i czasu pracy. Drobne wzory zaczynają się od 200 zł, większe projekty wyceniamy indywidualnie podczas konsultacji.' },
  { id: 'd3', question: 'Jak przygotować się do sesji?', answer: 'Zjedz posiłek przed wizytą, nawodnij skórę, ubierz się tak, aby miejsce tatuażu było łatwo dostępne. Unikaj alkoholu 24 h przed sesją.' },
  { id: 'd4', question: 'Jak długo goi się tatuaż?', answer: 'Gojenie powierzchniowe trwa ok. 2–3 tygodnie. Pełne wygojenie skóry zajmuje 2–3 miesiące. W tym czasie ważne jest stosowanie się do zaleceń pielęgnacyjnych.' },
  { id: 'd5', question: 'Czy mogę przyjść z własnym projektem?', answer: 'Oczywiście! Możesz przynieść referencje lub gotowy projekt. Nasz artysta omówi z Tobą szczegóły i dostosuje wzór do możliwości wykonania.' },
  { id: 'd6', question: 'Czy wykonujecie tatuaże u osób niepełnoletnich?', answer: 'Osoby poniżej 18 roku życia wymagają pisemnej zgody opiekuna prawnego, który musi być obecny podczas sesji.' },
  { id: 'd7', question: 'Jak dbać o świeży tatuaż?', answer: 'Przez pierwsze dni trzymaj tatuaż czysty, nawilżaj dedykowaną maścią i unikaj słońca, basenu oraz sauny. Szczegółowe instrukcje otrzymasz po sesji.' },
  { id: 'd8', question: 'Czy oferujecie piercing?', answer: 'Tak, wykonujemy profesjonalny piercing różnych części ciała. Używamy wyłącznie sterylnych narzędzi i biżuterii najwyższej jakości.' },
];

function FAQItem({ item, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      style={{ borderBottom: '0.5px solid hsl(var(--border))' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', color: 'hsl(var(--foreground))', letterSpacing: '0.04em', fontWeight: 400 }}>
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ color: 'var(--brand)', flexShrink: 0, marginLeft: '16px' }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ color: 'rgb(var(--foreground-rgb) / 0.6)', fontSize: '15px', lineHeight: 1.8, paddingBottom: '24px', fontFamily: 'var(--font-body)' }}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const { data: faqs = [] } = useQuery({
    queryKey: ['faq'],
    queryFn: () => base44.entities.FAQ.list('order', 100),
  });

  const items = faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <PageLayout>
      <section className="px-8 md:px-16 pt-36 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
              POMOCY
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: 400, lineHeight: 0.9, color: 'hsl(var(--foreground))', letterSpacing: '0.04em', marginBottom: '16px' }}>
              Najczęstsze<br />
              <span style={{ color: 'var(--brand)' }}>Pytania</span>
            </h1>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, var(--brand), transparent)', marginBottom: '48px' }} />
          </motion.div>

          <div>
            {items.map((item, i) => (
              <FAQItem key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}