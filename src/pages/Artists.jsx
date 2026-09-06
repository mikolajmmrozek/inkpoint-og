import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { getThumbnailUrl } from '@/lib/thumbnail';

const PLACEHOLDER_ARTISTS = [
  {
    id: '1',
    name: 'Mikołaj',
    slug: 'mikolaj',
    specialty: ['Neotradycyjny', 'Kolor'],
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    bio: 'Specjalista od neotradycyjnego tatuażu z mocnym kolorem. Każdy projekt to indywidualne dzieło pełne ekspresji.',
    years_experience: null,
    instagram: 'https://www.instagram.com/mikolaj.mrozek/',
  },
  {
    id: '2',
    name: 'Czarek',
    slug: 'czarek',
    specialty: ['Ilustracyjny', 'Projekty indywidualne'],
    photo_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80',
    bio: 'Tworzy ilustracyjne tatuaże dopasowane do każdego klienta. Projekty szyte na miarę, z unikalnym charakterem.',
    years_experience: null,
    instagram: 'https://www.instagram.com/czaras_tattoo/',
  },
  {
    id: '3',
    name: 'Matys',
    slug: 'matys',
    specialty: ['Tatuaż'],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    bio: 'Tatuażysta Romans Tattoo. Styl do uzupełnienia — obserwuj Instagram po najnowsze prace.',
    years_experience: null,
    instagram: 'https://www.instagram.com/matysjkk/',
  },
  {
    id: '4',
    name: 'Julia',
    slug: 'julia',
    specialty: ['Piercing'],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    bio: 'Piercer w Romans Tattoo. Profesjonalny piercing w sterylnych warunkach.',
    years_experience: null,
    instagram: 'https://www.instagram.com/julie.ttaapiercing_/',
    isPiercer: true,
  },
];

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Artist.list('-created_date', 50)
      .then(data => {
        if (data.length > 0) {
          const sorted = [...data]
            .filter(a => a.is_visible !== false)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          setArtists(sorted);
        } else {
          setArtists(PLACEHOLDER_ARTISTS);
        }
      })
      .catch(() => setArtists(PLACEHOLDER_ARTISTS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="pt-40 pb-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            NASZ ZESPÓŁ
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 9vw, 8rem)', fontWeight: 400, lineHeight: 0.9, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>
            Artyści
          </h1>
          <div className="mt-6 h-px w-16" style={{ background: 'linear-gradient(to right, var(--brand), transparent)', height: '1px' }} />
        </motion.div>
      </div>

      <div className="px-8 md:px-16">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[3/4] bg-steel animate-pulse" style={{ background: 'hsl(var(--border))' }} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artists.map((artist, i) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
              >
                <Link to={`/artists/${artist.slug || artist.id}`} className="group block">
                  <div className="relative overflow-hidden aspect-[3/4]" style={{ borderRadius: 'var(--radius)' }}>
                    <img
                      src={getThumbnailUrl(artist.photo_url || 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91', 400, 65)}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 media-darken-soft media-border"
                    />
                    <div className="absolute inset-0 transition-all duration-500 group-hover:bg-oxblood/10" style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.5) 40%, hsl(var(--background) / 0.1) 85%)' }} />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {(artist.specialty || []).slice(0, 2).map(s => (
                          <span key={s} className="text-micro" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', border: '0.5px solid var(--brand)', padding: '3px 8px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 1, letterSpacing: '0.05em' }}>
                        {artist.name}
                      </h3>
                      <p className="mt-2 text-sm text-parchment/50 line-clamp-2" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '13px' }}>
                        {artist.bio}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-micro group-hover:text-oxblood transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.15em' }}>
                          PORTFOLIO →
                        </p>
                        {artist.instagram && (
                          <a
                            href={artist.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                          >
                            IG ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}