import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const DEFAULTS = {
  about_heading: 'Sztuka, która',
  about_highlight_word: 'POZOSTAJE',
  about_paragraph_1: 'Romans Tattoo to studio tatuażu i piercingu w Wolsztynie, gdzie precyzja spotyka pasję. Nasi artyści łączą doświadczenie z nieustannym dążeniem do perfekcji, tworząc dzieła dopasowane do każdego klienta.',
  about_paragraph_2: 'Każda sesja zaczyna się od rozmowy. Słuchamy, projektujemy, tworzymy.',
  about_image_url: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=85',
  about_stats_number: '4+',
  about_stats_text: 'W WOLSZTYNIE',
};

export default function HomeAbout() {
  const [data, setData] = useState(DEFAULTS);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'about' })
      .then(res => {
        if (res.length > 0) {
          setData({ ...DEFAULTS, ...res[0] });
        }
      })
      .catch(() => {});
  }, []);

  const headingLines = data.about_heading.split('\n');

  return (
    <section className="py-16 px-8 md:px-16">
      <div className="max-w-screen-xl mx-auto grid md:grid-cols-2 gap-16 md:gap-32 items-center">
        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-micro text-oxblood mb-8" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            O STUDIU
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 0.95,
            color: 'hsl(var(--foreground))',
            letterSpacing: '0.04em',
          }}>
            {headingLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {data.about_highlight_word && (
              <div style={{ color: 'var(--brand)' }}>{data.about_highlight_word}</div>
            )}
            <div>na zawsze</div>
          </h2>
          <div className="mt-8 h-px w-12" style={{ background: 'linear-gradient(to right, var(--brand), transparent)', height: '1px' }} />
          <p className="mt-8 text-parchment/60 leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.85)', fontSize: '16px', lineHeight: 1.8 }}>
            {data.about_paragraph_1}
          </p>
          <p className="mt-4 text-parchment/60 leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.85)', fontSize: '16px', lineHeight: 1.8 }}>
            {data.about_paragraph_2}
          </p>
          <div className="mt-10">
            <Link to="/faq" className="btn-ghost-parchment">
              Najczęstsze Pytania
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
          <div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
            <img
              src={data.about_image_url}
              alt="Tattoo process"
              className="w-full h-full object-cover liquid-hover"
              style={{ filter: 'brightness(0.7) contrast(1.1)' }}
            />
          </div>
          {/* Fuchsia gradient overlay on image */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgb(var(--brand-rgb) /0.15) 0%, transparent 40%)' }} />
          {/* Decorative offset box */}
          <div className="absolute -bottom-6 -left-6 w-24 h-24" style={{ border: '0.5px solid var(--brand)', zIndex: -1 }} />
          {/* Stats badge */}
          <div className="absolute top-8 -right-4 bg-obsidian p-6" style={{ background: 'hsl(var(--background))', border: '0.5px solid hsl(var(--border))' }}>
            <p className="font-display text-4xl font-700" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--brand)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>{data.about_stats_number}</p>
            <p className="text-micro mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.7)', letterSpacing: '0.15em' }}>{data.about_stats_text}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}