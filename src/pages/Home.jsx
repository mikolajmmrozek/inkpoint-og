import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageLayout from '../components/layout/PageLayout';
import StudioHero from '../components/home/StudioHero';
import HeroSlider from '../components/home/HeroSlider';
import HomeAbout from '../components/home/HomeAbout';
import HomeCTA from '../components/home/HomeCTA';
import HomeTestimonials from '../components/home/HomeTestimonials';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Lightbox from '../components/ui/Lightbox';

export default function Home() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const loadPortfolioImages = async () => {
      try {
        const artists = await base44.entities.Artist.filter({ is_active: true, is_visible: true });
        const allImages = [];
        
        artists.forEach(artist => {
          if (artist.portfolio_images && Array.isArray(artist.portfolio_images)) {
            artist.portfolio_images.forEach(img => {
              if (img.url) allImages.push(img.url);
            });
          }
        });

        // Randomize and shuffle
        const shuffled = allImages.sort(() => Math.random() - 0.5).slice(0, 12);
        setGalleryImages(shuffled);
      } catch (error) {
        console.error('Error loading portfolio images:', error);
      }
    };

    loadPortfolioImages();
  }, []);

  return (
    <PageLayout>
      <StudioHero />

      {/* Divider */}
      <div className="px-8 md:px-16">
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      </div>

      {/* Artist slider section */}


      <HeroSlider />

      {/* Divider */}
      <div className="px-8 md:px-16 my-0">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      </div>

      <HomeAbout />

      {/* Divider */}
      <div className="px-8 md:px-16">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      </div>

      {/* Gallery strip */}
      <section className="pt-10 pb-6 overflow-hidden">
        <div className="px-8 md:px-16 mb-12">
          <div className="flex items-end justify-between">
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
                NASZE PRACE
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 0.95, letterSpacing: '0.04em' }}>
                Galeria
              </h2>
            </div>
            <Link to="/artists" className="text-micro" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.7)', letterSpacing: '0.15em', textDecoration: 'none' }}>
              WSZYSTKIE PRACE →
            </Link>
          </div>
        </div>

        <div className="flex gap-3 px-8 md:px-16 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
          {galleryImages.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="flex-shrink-0 overflow-hidden"
              style={{ width: i % 3 === 0 ? '280px' : i % 3 === 1 ? '200px' : '240px', height: '360px', borderRadius: 'var(--radius)' }}
            >
              <img
                src={img}
                alt={`Portfolio ${i + 1}`}
                onClick={() => setLightboxIndex(i)}
                className="w-full h-full object-cover liquid-hover cursor-pointer media-border"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          ))}
        </div>
      </section>

      <div className="px-8 md:px-16">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      </div>

      <HomeTestimonials />

      <div className="px-8 md:px-16">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--brand), transparent)' }} />
      </div>

      <HomeCTA />

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={galleryImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNext={(idx) => setLightboxIndex(typeof idx === 'number' ? idx : (i => (i + 1) % galleryImages.length))}
            onPrev={() => setLightboxIndex(i => (i - 1 + galleryImages.length) % galleryImages.length)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}