import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function HomeCTA() {
  return (
    <section className="py-16 px-8 md:px-16 relative overflow-hidden">
      {/* Fuchsia gradient background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgb(var(--brand-rgb) /0.08) 0%, hsl(var(--background) / 0) 50%, rgb(var(--brand-rgb) /0.05) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-micro text-oxblood mb-8" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            ZACZNIJ SWOJĄ HISTORIĘ
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            fontWeight: 400,
            lineHeight: 0.9,
            color: 'hsl(var(--foreground))',
            letterSpacing: '0.04em',
          }}>
            Gotowy na<br />
            <span style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PERMANENTNĄ ZMIANĘ?</span>
          </h2>
          <p className="mt-8 text-parchment/60 max-w-xl mx-auto text-base leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.85)', fontSize: '16px' }}>
            Umów się na bezpłatną konsultację. Porozmawiamy o Twoim pomyśle, dobierzemy artystę i ustalimy termin.
          </p>
          <div className="mt-12 flex gap-4 justify-center flex-wrap">
            <Link to="/booking" className="btn-oxblood animate-pulse-oxblood">
              Umów Sesję
            </Link>
            <Link to="/contact" className="btn-ghost-parchment">
              Zapytaj o wycenę
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}