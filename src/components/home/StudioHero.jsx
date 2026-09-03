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
          className="absolute inset-0 w-full h-full object-cover media-darken-video"
        />
      ) : (
        /* Fallback: animated gradient */
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgb(var(--brand-rgb) /0.08) 0%, hsl(var(--background)) 60%)' }} />
      )}

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(var(--background) / 0.75) 0%, hsl(var(--background) / 0.35) 60%, hsl(var(--background) / 0.55) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />
      <div className="absolute top-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)' }} />

      {/* Decorative fuchsia lines */}
      <div className="absolute left-0 top-1/2 w-px h-40 -translate-y-1/2" style={{ background: 'linear-gradient(to bottom, transparent, var(--brand), transparent)' }} />
      <div className="absolute right-0 top-1/2 w-px h-40 -translate-y-1/2" style={{ background: 'linear-gradient(to bottom, transparent, var(--brand), transparent)' }} />

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
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '24px' }}
          >
            ◆ &nbsp; WOLSZTYN, POLSKA &nbsp; ◆
          </motion.p>

          {/* Main headline */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, lineHeight: 0.88, letterSpacing: '0.02em', color: 'hsl(var(--foreground))' }}>
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
                    <span style={{ color: 'hsl(var(--foreground))' }}>{line.slice(0, -3)}</span>
                    <span style={{ color: 'var(--brand)' }}>{line.slice(-3)}</span>
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
            style={{ width: '80px', height: '1px', background: 'linear-gradient(to right, var(--brand), transparent)', margin: '28px 0', transformOrigin: 'left' }}
          />

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="space-y-1 mb-12"
          >
            {sublines.map((line, i) => (
              <p key={i} style={{ color: 'rgb(var(--foreground-rgb) / 0.85)', fontSize: '16px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
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
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.6)', letterSpacing: '0.2em', writingMode: 'vertical-rl' }}>
            SCROLL
          </p>
          <div className="w-px h-12 relative overflow-hidden" style={{ background: 'rgb(var(--foreground-rgb) / 0.1)' }}>
            <motion.div
              className="w-full absolute top-0"
              style={{ background: 'var(--brand)', height: '50%' }}
              animate={{ y: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}