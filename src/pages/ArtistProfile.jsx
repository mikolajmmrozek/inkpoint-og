import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import Lightbox from '../components/ui/Lightbox';
import { ZoomIn, Instagram } from 'lucide-react';

const MOCK = {
  name: 'Aleksandra Wiśniewska',
  specialty: ['Blackwork', 'Fine Line', 'Dotwork'],
  bio: 'Specjalizuje się w geometrycznych wzorach i delikatnej linii. Każdy projekt to indywidualna podróż przez formę i przestrzeń na skórze. Pracuje w studiu od 2015 roku, zdobywając nagrody na europejskich konwentach tatuażu.',
  photo_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80',
  instagram: '@ola.tattoo',
  years_experience: 9,
  portfolio_images: [
    { url: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=800&q=85', caption: 'Blackwork mandala', style: 'Blackwork' },
    { url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=85', caption: 'Fine line botanical', style: 'Fine Line' },
    { url: 'https://images.unsplash.com/photo-1590246814883-57c511e4a0a4?w=800&q=85', caption: 'Geometric sleeve', style: 'Dotwork' },
    { url: 'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=85', caption: 'Minimalist symbols', style: 'Fine Line' },
    { url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=85', caption: 'Abstract composition', style: 'Blackwork' },
    { url: 'https://images.unsplash.com/photo-1607452941212-2a3fa8fe5c8c?w=800&q=85', caption: 'Floral design', style: 'Fine Line' },
  ],
};

export default function ArtistProfile() {
  const { slug } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.Artist.list();
        const found = all.find(a => a.slug === slug || a.id === slug);
        setArtist(found || MOCK);
      } catch {
        setArtist(MOCK);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return (
    <PageLayout>
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    </PageLayout>
  );

  const portfolioImages = artist?.portfolio_images || MOCK.portfolio_images;

  return (
    <PageLayout>
      <div className="pt-24 min-h-screen">
        {/* Back link */}
        <div className="px-8 md:px-16 pt-12 pb-8">
          <Link to="/artists" className="text-micro text-parchment/30 hover:text-parchment/70 transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.15em' }}>
            ← ARTYŚCI
          </Link>
        </div>

        {/* Split layout */}
        <div className="flex flex-col md:flex-row gap-0" style={{ border: 'none' }}>
          {/* LEFT — Sticky bio */}
          <div className="md:w-96 md:flex-shrink-0 px-8 md:px-16 md:sticky md:top-24 md:self-start pb-16 border-none">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="relative w-full h-auto md:h-96 mb-8 md:overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
                <img
                  src={artist?.photo_url || MOCK.photo_url}
                  alt={artist?.name}
                  className="w-full h-full object-cover"
                  style={artist?.slug === 'matys' ? {} : { filter: 'brightness(0.8) contrast(1.1)' }}
                />
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                {(artist?.specialty || MOCK.specialty).map(s => (
                  <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', border: '0.5px solid var(--brand)', padding: '3px 8px', textTransform: 'uppercase' }}>
                    {s}
                  </span>
                ))}
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 1, marginBottom: '1rem' }}>
                {artist?.name || MOCK.name}
              </h1>

              <div className="h-px w-8 mb-6" style={{ background: 'var(--brand)', height: '0.5px' }} />

              <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgb(var(--foreground-rgb) / 0.6)', fontSize: '14px', lineHeight: 1.8 }}>
                {artist?.bio || MOCK.bio}
              </p>

              {artist?.years_experience && (
                <div className="mb-6">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    DOŚWIADCZENIE
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))' }}>
                    {artist.years_experience} {artist.years_experience === 1 ? 'rok' : [2,3,4].includes(artist.years_experience) ? 'lata' : 'lat'}
                  </p>
                </div>
              )}

              {artist?.instagram && (
                <a
                  href={artist.instagram.startsWith('http') ? artist.instagram : `https://instagram.com/${artist.instagram.replace('@','')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity w-fit"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.1em', fontWeight: 500, cursor: 'pointer' }}
                >
                  <Instagram size={16} />
                  Instagram
                </a>
              )}

              <Link
                to={`/booking?artist_id=${encodeURIComponent(artist?.id || '')}&artist_name=${encodeURIComponent(artist?.name || MOCK.name)}`}
                className="btn-oxblood block text-center animate-pulse-oxblood"
              >
                Umów z Artystą
              </Link>
            </motion.div>
          </div>

          {/* RIGHT — Masonry portfolio */}
          <div className="flex-1 px-8 md:px-16 pb-32">
            <p className="text-micro mb-8" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.15em' }}>
              PORTFOLIO
            </p>
            <div className="masonry-grid">
              {portfolioImages.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.6 }}
                  className="relative overflow-hidden group cursor-pointer" style={{ borderRadius: 'var(--radius)' }}
                  onClick={() => setLightboxIndex(i)}
                >
                  <img
                    src={img.url || img}
                    alt={img.caption || `Portfolio ${i + 1}`}
                    className="w-full object-cover transition-all duration-700 group-hover:scale-105 media-border"
                    style={{ filter: 'brightness(0.75) contrast(1.1)', display: 'block' }}
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ background: 'rgb(var(--brand-rgb) /0.12)' }}>
                    <ZoomIn size={20} color="hsl(var(--foreground))" />
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9), transparent)' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#F5F0EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {img.caption}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox with navigation */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={portfolioImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNext={(idx) => setLightboxIndex(idx !== undefined ? idx : (lightboxIndex + 1) % portfolioImages.length)}
            onPrev={() => setLightboxIndex((lightboxIndex - 1 + portfolioImages.length) % portfolioImages.length)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}