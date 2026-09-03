import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function ReferenceImagesGallery({ images = [], theme = 'dark', t }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!images || images.length === 0) return null;
  const isOpen = lightboxIndex !== null;
  const border = t?.border || (theme === 'light' ? '#E5E5E5' : '#262626');

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, idx) => (
          <div key={idx} className="relative group">
            <img
              src={url}
              alt={`ref-${idx}`}
              loading="lazy"
              className="w-full h-20 object-cover cursor-pointer"
              style={{ border: `0.5px solid ${border}` }}
              onClick={() => setLightboxIndex(idx)}
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 70,
              padding: '1rem',
              paddingTop: 'max(env(safe-area-inset-top), 1rem)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
            }}
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-4xl"
              style={{ touchAction: 'none' }}
            >
              <img
                src={images[lightboxIndex]}
                alt="preview"
                className="max-w-full max-h-[80vh] object-contain"
                onTouchStart={e => { window._refTouchStartX = e.touches[0].clientX; }}
                onTouchEnd={e => {
                  const diff = window._refTouchStartX - e.changedTouches[0].clientX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) setLightboxIndex(i => (i + 1) % images.length);
                    else setLightboxIndex(i => (i - 1 + images.length) % images.length);
                  }
                }}
              />
            </motion.div>

            {images.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
                  style={{ position: 'fixed', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '12px', zIndex: 71 }}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
                  style={{ position: 'fixed', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: '12px', zIndex: 71 }}
                >
                  <ChevronRight size={28} />
                </button>
                <span style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.5)', zIndex: 71 }}>
                  {lightboxIndex + 1} / {images.length}
                </span>
              </>
            )}

            <button
              onClick={() => setLightboxIndex(null)}
              style={{ position: 'fixed', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#FFF', padding: '8px', zIndex: 72 }}
            >
              <X size={24} />
            </button>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = images[lightboxIndex];
                a.download = `reference-${lightboxIndex}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              style={{ position: 'fixed', bottom: '12px', right: '12px', background: 'rgb(var(--brand-rgb) /0.9)', color: '#FFF', padding: '8px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', zIndex: 71 }}
            >
              <Download size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}