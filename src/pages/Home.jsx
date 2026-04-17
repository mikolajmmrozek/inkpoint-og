import PageLayout from '../components/layout/PageLayout';
import HeroSlider from '../components/home/HeroSlider';
import HomeAbout from '../components/home/HomeAbout';
import HomeCTA from '../components/home/HomeCTA';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const galleryImages = [
  'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80',
  'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80',
  'https://images.unsplash.com/photo-1590246814883-57c511e4a0a4?w=600&q=80',
  'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=600&q=80',
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80',
  'https://images.unsplash.com/photo-1607452941212-2a3fa8fe5c8c?w=600&q=80',
];

export default function Home() {
  return (
    <PageLayout>
      <HeroSlider />

      {/* Divider */}
      <div className="px-8 md:px-16 my-0">
        <div className="h-px w-full" style={{ background: '#262626', height: '0.5px' }} />
      </div>

      <HomeAbout />

      {/* Gallery strip */}
      <section className="py-20 overflow-hidden">
        <div className="px-8 md:px-16 mb-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-micro text-oxblood mb-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em' }}>
                NASZE PRACE
              </p>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 600, color: '#F5F0EB', lineHeight: 1 }}>
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
              />
            </motion.div>
          ))}
        </div>
      </section>

      <div className="px-8 md:px-16">
        <div className="h-px w-full" style={{ background: '#262626', height: '0.5px' }} />
      </div>

      <HomeCTA />
    </PageLayout>
  );
}