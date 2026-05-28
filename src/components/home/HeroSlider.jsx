import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const FALLBACK_SLIDES = [
  { name: 'Mikołaj', specialty: 'Neotradycyjny & Kolor', slug: 'mikolaj', photo_url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=900&q=70&auto=format' },
  { name: 'Czarek', specialty: 'Ilustracyjny & Indywidualny', slug: 'czarek', photo_url: 'https://images.unsplash.com/photo-1562962230-16b87a0b2935?w=900&q=70&auto=format' },
  { name: 'Matys', specialty: 'Tatuaż', slug: 'matys', photo_url: 'https://images.unsplash.com/photo-1554721834-bbbe4c1ab9c5?w=900&q=70&auto=format' },
  { name: 'Julia', specialty: 'Piercing', slug: 'julia', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=70&auto=format' },
];

const optimizeUrl = (url) => {
  if (!url) return url;
  if (url.includes('unsplash.com') && !url.includes('auto=format')) {
    const base = url.split('?')[0];
    return `${base}?w=900&q=70&auto=format`;
  }
  return url;
};

export default function HeroSlider() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    base44.entities.Artist.filter({ is_active: true })
      .then(data => { if (data.length > 0) setSlides(data); })
      .catch(() => {});
  }, []);

  const goTo = (index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [slides.length]);

  const slide = slides[current];
  const specialties = Array.isArray(slide?.specialty) ? slide.specialty.join(' & ') : (slide?.specialty || '');

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <img
            src={optimizeUrl(slide?.photo_url || FALLBACK_SLIDES[current % FALLBACK_SLIDES.length]?.photo_url)}
            alt={slide?.name}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.35) contrast(1.1)' }}
            loading={current === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.4) 60%, rgba(10,10,10,0.7) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to top, rgba(255,0,127,0.12) 0%, transparent 100%)' }} />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="max-w-2xl"
          >
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#FF007F', letterSpacing: '0.2em', marginBottom: '24px' }}>
              {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} — {specialties}
            </p>

            <h2 style={{
              fontFamily: 'Bebas Neue, Barlow Condensed, system-ui',
              fontSize: 'clamp(4rem, 10vw, 9rem)',
              fontWeight: 400,
              lineHeight: 0.9,
              color: '#F5F0EB',
              letterSpacing: '0.04em',
            }}>
              {(slide?.name || '').split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
            </h2>

            <div className="mt-8 h-px w-16" style={{ background: 'linear-gradient(to right, #FF007F, transparent)', height: '1px' }} />

            <p className="mt-6 max-w-sm" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '15px', lineHeight: 1.7 }}>
              {slide?.bio ? slide.bio.slice(0, 120) + (slide.bio.length > 120 ? '…' : '') : 'Każdy tatuaż to unikalna historia wyryta na skórze. Trwała, precyzyjna, Twoja.'}
            </p>

            <div className="mt-10 flex gap-4 flex-wrap">
              <Link to={`/artists/${slide?.slug || slide?.id || ''}`} className="btn-oxblood">
                Zobacz Portfolio
              </Link>
              <Link to="/booking" className="btn-ghost-parchment">
                Umów Sesję
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="absolute bottom-10 left-8 md:left-16 flex gap-3 items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-500"
              style={{
                width: i === current ? '40px' : '16px',
                height: '1px',
                background: i === current ? '#FF007F' : 'rgba(245,240,235,0.3)',
              }}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 right-8 md:right-16 flex flex-col items-center gap-3">
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.2em', writingMode: 'vertical-rl' }}>
            SCROLL
          </p>
          <div className="w-px h-12 relative overflow-hidden" style={{ background: 'rgba(245,240,235,0.1)' }}>
            <motion.div
              className="w-full absolute top-0"
              style={{ background: '#FF007F', height: '50%' }}
              animate={{ y: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}