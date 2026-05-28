import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageLayout from '../components/layout/PageLayout';
import StudioHero from '../components/home/StudioHero';
import HeroSlider from '../components/home/HeroSlider';
import HomeAbout from '../components/home/HomeAbout';
import HomeCTA from '../components/home/HomeCTA';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Home() {
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    const loadPortfolioImages = async () => {
      try {
        const artists = await base44.entities.Artist.filter({ is_active: true });
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
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #FF007F, transparent)' }} />
      </div>

      {/* Artist slider section */}


      <HeroSlider />

      {/* Divider */}
      <div className="px-8 md:px-16 my-0">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, #FF007F, transparent)' }} />
      </div>

      <HomeAbout />

      {/* Divider */}
      <div className="px-8 md:px-16">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, #FF007F, transparent)' }} />
      </div>

      {/* Gallery strip */}
      <section className="pt-10 pb-6 overflow-hidden">
        <div className="px-8 md:px-16 mb-12">
          <div className="flex items-end justify-between">
            <div>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
                NASZE PRACE
              </p>
              <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 400, color: '#F5F0EB', lineHeight: 0.95, letterSpacing: '0.04em' }}>
                Galeria
              </h2>
            </div>
            <Link to="/artists" className="text-micro" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textDecoration: 'none' }}>
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
              style={{ width: i % 3 === 0 ? '280px' : i % 3 === 1 ? '200px' : '240px', height: '360px' }}
            >
              <img
                src={img}
                alt={`Portfolio ${i + 1}`}
                className="w-full h-full object-cover liquid-hover"
                style={{ filter: 'brightness(0.65) contrast(1.15)' }}
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          ))}
        </div>
      </section>

      <div className="px-8 md:px-16">
        <div className="w-full" style={{ height: '1px', background: 'linear-gradient(to right, transparent, #FF007F, transparent)' }} />
      </div>

      <HomeCTA />
    </PageLayout>
  );
}