import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1800&q=90',
    artist: 'Mikołaj',
    specialty: 'Neotradycyjny & Kolor',
    tag: '01 / 03',
  },
  {
    image: 'https://images.unsplash.com/photo-1562962230-16b87a0b2935?w=1800&q=90',
    artist: 'Czarek',
    specialty: 'Ilustracyjny & Indywidualny',
    tag: '02 / 03',
  },
  {
    image: 'https://images.unsplash.com/photo-1554721834-bbbe4c1ab9c5?w=1800&q=90',
    artist: 'Matys',
    specialty: 'Tatuaż',
    tag: '03 / 03',
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);

  const goTo = (index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [current]);

  const slide = slides[current];

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
            src={slide.image}
            alt={slide.artist}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.35) contrast(1.1)' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.4) 60%, rgba(10,10,10,0.7) 100%)' }} />
      {/* Fuchsia bottom gradient */}
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
            <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#FF007F', letterSpacing: '0.2em' }}>
              {slide.tag} — {slide.specialty}
            </p>

            <h1 style={{
              fontFamily: 'Bebas Neue, Barlow Condensed, system-ui',
              fontSize: 'clamp(4rem, 10vw, 9rem)',
              fontWeight: 400,
              lineHeight: 0.9,
              color: '#F5F0EB',
              letterSpacing: '0.04em',
            }}>
              {slide.artist.split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
            </h1>

            <div className="mt-8 h-px w-16" style={{ background: 'linear-gradient(to right, #FF007F, transparent)', height: '1px' }} />

            <p className="mt-6 text-parchment/60 text-base leading-relaxed max-w-sm" style={{ color: 'rgba(245,240,235,0.6)', fontSize: '15px' }}>
              Każdy tatuaż to unikalna historia wyryta na skórze. Trwała, precyzyjna, Twoja.
            </p>

            <div className="mt-10 flex gap-4 flex-wrap">
              <Link to="/booking" className="btn-oxblood">
                Umów Sesję
              </Link>
              <Link to="/artists" className="btn-ghost-parchment">
                Poznaj Artystów
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
          <p className="text-micro" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.2em', writingMode: 'vertical-rl' }}>
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