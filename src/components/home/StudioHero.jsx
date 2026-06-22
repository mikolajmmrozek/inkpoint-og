import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const DEFAULTS = {
  hero_tagline: 'ROMANS\nTATTOO',
  hero_subtext: 'Studio tatuażu i piercingu w Wolsztynie.\nSztuka trwała — precyzyjna — Twoja.',
  hero_video_url: '',
};

export default function StudioHero() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: 'hero' })
      .then(data => { if (data.length > 0) setSettings({ ...DEFAULTS, ...data[0] }); })
      .catch(() => {});
  }, []);

  const lines = (settings.hero_tagline || DEFAULTS.hero_tagline).split('\n');
  const sublines = (settings.hero_subtext || DEFAULTS.hero_subtext).split('\n');

  return (
    <section className="relative w-full flex items-start" style={{ minHeight: '100dvh' }}>
      {/* Video background */}
      {settings.hero_video_url ? (
        <video
          src={settings.hero_video_url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.45) contrast(1.1) saturate(0.85)' }}
        />
      ) : (
        /* Fallback: animated gradient */
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(255,0,127,0.08) 0%, #0A0A0A 60%)' }} />
      )}

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.35) 60%, rgba(10,10,10,0.55) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(to top, #0A0A0A, transparent)' }} />
      <div className="absolute top-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, #0A0A0A, transparent)' }} />

      {/* Decorative fuchsia lines */}
      <div className="absolute left-0 top-1/2 w-px h-40 -translate-y-1/2" style={{ background: 'linear-gradient(to bottom, transparent, #FF007F, transparent)' }} />
      <div className="absolute right-0 top-1/2 w-px h-40 -translate-y-1/2" style={{ background: 'linear-gradient(to bottom, transparent, #FF007F, transparent)' }} />

      {/* Content */}
      <div className="relative z-10 w-full px-8 md:px-16 lg:px-24 flex flex-col items-start justify-center pt-24 pb-40">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl"
        >
          {/* Pre-label */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#FF007F', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '24px' }}
          >
            ◆ &nbsp; WOLSZTYN, POLSKA &nbsp; ◆
          </motion.p>

          {/* Main headline */}
          <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontWeight: 400, lineHeight: 0.88, letterSpacing: '0.02em', color: '#F5F0EB' }}>
            {lines.map((line, i) => (
              <motion.span
                key={i}
                className="block"
                style={{ fontSize: 'clamp(5rem, 14vw, 13rem)' }}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              >
                {i === 1 ? (
                  <>
                    <span style={{ color: '#F5F0EB' }}>{line.slice(0, -3)}</span>
                    <span style={{ color: '#FF007F' }}>{line.slice(-3)}</span>
                  </>
                ) : line}
              </motion.span>
            ))}
          </h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '80px', height: '1px', background: 'linear-gradient(to right, #FF007F, transparent)', margin: '28px 0', transformOrigin: 'left' }}
          />

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="space-y-1 mb-12"
          >
            {sublines.map((line, i) => (
              <p key={i} style={{ color: 'rgba(245,240,235,0.85)', fontSize: '16px', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
                {line}
              </p>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex gap-4 flex-wrap pb-2"
          >
            <Link to="/booking" className="btn-oxblood animate-pulse-oxblood">
              Umów Sesję
            </Link>
            <Link to="/artists" className="btn-ghost-parchment">
              Poznaj Artystów
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 right-8 md:right-16 flex flex-col items-center gap-3"
        >
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.6)', letterSpacing: '0.2em', writingMode: 'vertical-rl' }}>
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
        </motion.div>
      </div>
    </section>
  );
}