import { useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ReferenceImagesUpload({ images = [], onChange, t, max = 10 }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    const remaining = max - images.length;
    if (files.length > remaining) {
      alert(`Możesz przesłać maksymalnie ${remaining} zdjęć`);
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }).then(res => res.file_url))
      );
      onChange([...(images || []), ...uploadedUrls]);
    } catch (err) {
      alert('Błąd przy przesyłaniu zdjęć');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => {
    onChange((images || []).filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* Existing images */}
      {images && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((url, idx) => (
            <div key={idx} style={{ position: 'relative', aspectRatio: '1', border: `0.5px solid ${t.border}`, overflow: 'hidden' }}>
              <img src={url} alt={`Ref ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={12} color="#F5F0EB" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <label
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '14px', border: `0.5px dashed ${t.border}`, cursor: uploading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: uploading ? t.muted : 'var(--brand)', opacity: images.length >= max ? 0.4 : 1,
          pointerEvents: images.length >= max ? 'none' : 'auto',
        }}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        {uploading ? 'PRZESYŁANIE...' : `DODAJ ZDJĘCIA REFERENCYJNE${images.length > 0 ? ` (${images.length}/${max})` : ''}`}
        <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} disabled={uploading || images.length >= max} />
      </label>
    </div>
  );
}