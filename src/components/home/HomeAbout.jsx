import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function HomeAbout() {
  return (
    <section className="py-32 px-8 md:px-16">
      <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-16 md:gap-32 items-center">
        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-micro text-oxblood mb-8" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em' }}>
            O STUDIU
          </p>
          <h2 style={{
            fontFamily: 'Bebas Neue, Barlow Condensed, system-ui',
            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 0.95,
            color: '#F5F0EB',
            letterSpacing: '0.04em',
          }}>
            Sztuka, która<br />
            <span style={{ color: '#FF007F' }}>POZOSTAJE</span><br />
            na zawsze
          </h2>
          <div className="mt-8 h-px w-12" style={{ background: 'linear-gradient(to right, #FF007F, transparent)', height: '1px' }} />
          <p className="mt-8 text-parchment/60 leading-relaxed" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '16px', lineHeight: 1.8 }}>
            Romans Tattoo to studio tatuażu i piercingu w Wolsztynie, gdzie precyzja spotyka pasję. Nasi artyści łączą doświadczenie z nieustannym dążeniem do perfekcji, tworząc dzieła dopasowane do każdego klienta.
          </p>
          <p className="mt-4 text-parchment/60 leading-relaxed" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '16px', lineHeight: 1.8 }}>
            Każda sesja zaczyna się od rozmowy. Słuchamy, projektujemy, tworzymy.
          </p>
          <div className="mt-10">
            <Link to="/artists" className="btn-ghost-parchment">
              Poznaj Zespół
            </Link>
          </div>
        </motion.div>

        {/* Image side */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative"
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=85"
              alt="Tattoo process"
              className="w-full h-full object-cover liquid-hover"
              style={{ filter: 'brightness(0.7) contrast(1.1)' }}
            />
          </div>
          {/* Fuchsia gradient overlay on image */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(255,0,127,0.15) 0%, transparent 40%)' }} />
          {/* Decorative offset box */}
          <div className="absolute -bottom-6 -left-6 w-24 h-24" style={{ border: '0.5px solid #FF007F', zIndex: -1 }} />
          {/* Stats badge */}
          <div className="absolute top-8 -right-4 bg-obsidian p-6" style={{ background: '#0A0A0A', border: '0.5px solid #262626' }}>
            <p className="font-display text-4xl font-700" style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, color: '#FF007F', fontSize: '2.5rem', letterSpacing: '0.05em' }}>4+</p>
            <p className="text-micro mt-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#C4196B', letterSpacing: '0.15em' }}>W WOLSZTYNIE</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}