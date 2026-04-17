import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';

const PLACEHOLDER_ARTISTS = [
  {
    id: '1',
    name: 'Aleksandra Wiśniewska',
    slug: 'aleksandra',
    specialty: ['Blackwork', 'Fine Line', 'Dotwork'],
    photo_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80',
    bio: 'Specjalizuje się w geometrycznych wzorach i delikatnej linii. Każdy projekt to indywidualna podróż przez formę i przestrzeń.',
    years_experience: 9,
  },
  {
    id: '2',
    name: 'Marcin Kowalski',
    slug: 'marcin',
    specialty: ['Realism', 'Portrait', 'Black & Grey'],
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    bio: 'Mistrz realizmu i portretów. Jego prace wyróżniają się niebywałą precyzją i głębią tonalną, zatrzymując chwilę na zawsze.',
    years_experience: 12,
  },
  {
    id: '3',
    name: 'Zuzanna Karpińska',
    slug: 'zuzanna',
    specialty: ['Neo-Traditional', 'Geometric', 'Color'],
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    bio: 'Łączy tradycję z nowoczesnością. Jej prace tętnią kolorem i energią, czerpiąc z ikonografii różnych kultur.',
    years_experience: 7,
  },
];

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Artist.list('-created_date', 20)
      .then(data => setArtists(data.length > 0 ? data : PLACEHOLDER_ARTISTS))
      .catch(() => setArtists(PLACEHOLDER_ARTISTS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="pt-40 pb-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em' }}>
            NASZ ZESPÓŁ
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 700, lineHeight: 0.9, color: '#F5F0EB' }}>
            Artyści
          </h1>
          <div className="mt-6 h-px w-16" style={{ background: '#8B1A1A', height: '0.5px' }} />
        </motion.div>
      </div>

      <div className="px-8 md:px-16">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[3/4] bg-steel animate-pulse" style={{ background: '#262626' }} />
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
                  <div className="relative overflow-hidden aspect-[3/4]">
                    <img
                      src={artist.photo_url || 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80'}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      style={{ filter: 'brightness(0.6) contrast(1.1)' }}
                    />
                    <div className="absolute inset-0 transition-all duration-500 group-hover:bg-oxblood/10" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.1) 60%)' }} />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {(artist.specialty || []).slice(0, 2).map(s => (
                          <span key={s} className="text-micro" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8B1A1A', letterSpacing: '0.15em', border: '0.5px solid #8B1A1A', padding: '3px 8px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.75rem', fontWeight: 600, color: '#F5F0EB', lineHeight: 1 }}>
                        {artist.name}
                      </h3>
                      <p className="mt-2 text-sm text-parchment/50 line-clamp-2" style={{ color: 'rgba(245,240,235,0.5)', fontSize: '13px' }}>
                        {artist.bio}
                      </p>
                      <p className="mt-4 text-micro group-hover:text-oxblood transition-colors" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em' }}>
                        PORTFOLIO →
                      </p>
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