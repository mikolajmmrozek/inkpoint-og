import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

export default function FilePreviewModal({ attachment, onClose }) {
  const isImage = attachment?.type === 'image';

  return (
    <AnimatePresence>
      {attachment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={onClose}
        >
          <button
            onClick={onClose}
            style={{ position: 'fixed', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FFF', zIndex: 81, opacity: 0.8 }}
          >
            <X size={28} />
          </button>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="max-w-5xl w-full"
          >
            {isImage ? (
              <img
                src={attachment.url}
                alt={attachment.name || 'preview'}
                className="max-w-full max-h-[85vh] object-contain mx-auto"
              />
            ) : (
              <iframe
                src={attachment.url}
                title="PDF Preview"
                className="w-full"
                style={{ height: '85vh', border: 'none', background: '#FFF' }}
              />
            )}
          </motion.div>
          <a
            href={attachment.url}
            download={attachment.name || ''}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'rgb(var(--brand-rgb) /0.9)', color: '#FFF', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', zIndex: 81, textDecoration: 'none' }}
          >
            <Download size={14} /> POBIERZ
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}