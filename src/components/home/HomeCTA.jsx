import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function HomeCTA() {
  return (
    <section className="py-32 px-8 md:px-16 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: '#8B1A1A', opacity: 0.04 }} />
      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-micro text-oxblood mb-8" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em' }}>
            ZACZNIJ SWOJĄ HISTORIĘ
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 700,
            lineHeight: 0.95,
            color: '#F5F0EB',
          }}>
            Gotowy na<br />
            <em style={{ fontStyle: 'italic', color: '#8B1A1A' }}>permanentną zmianę?</em>
          </h2>
          <p className="mt-8 text-parchment/60 max-w-xl mx-auto text-base leading-relaxed" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '16px' }}>
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