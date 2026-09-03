import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Lightbox({ images, currentIndex, onClose, onNext, onPrev }) {
  const img = images[currentIndex];

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNext, onPrev]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,10,10,0.97)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-6 right-6 z-10"
        style={{ color: 'rgba(245,240,235,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={onClose}
      >
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-6 left-6 z-10" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em' }}>
        {currentIndex + 1} / {images.length}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          className="absolute left-4 md:left-8 z-10 p-3 transition-all hover:opacity-70"
          style={{ color: '#F5F0EB', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center px-16 md:px-24"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={img?.url || img}
            alt={img?.caption || ''}
            className="object-contain"
            style={{ maxHeight: '82vh', maxWidth: '90vw' }}
          />
          {img?.caption && (
            <p className="mt-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {img.caption}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next */}
      {images.length > 1 && (
        <button
          className="absolute right-4 md:right-8 z-10 p-3 transition-all hover:opacity-70"
          style={{ color: '#F5F0EB', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-8 overflow-x-auto">
          {images.map((im, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onNext(i); }}
              className="flex-shrink-0 transition-all"
              style={{ opacity: i === currentIndex ? 1 : 0.35, border: i === currentIndex ? '0.5px solid var(--brand)' : '0.5px solid transparent' }}
            >
              <img src={im?.url || im} alt="" className="w-12 h-12 object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}