import { useState } from 'react';
import { X, Upload, Loader2, Check, Hand, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_IMAGES = 10;

export default function SessionDetailModal({ booking, theme, priceLabel, onClose, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(false);
  const [descDraft, setDescDraft] = useState(booking.tattoo_description || '');
  const [placeDraft, setPlaceDraft] = useState(booking.tattoo_placement || '');
  const [saving, setSaving] = useState(false);

  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', fuchsia: 'var(--brand)' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', fuchsia: 'var(--brand)' };

  const images = booking.reference_images || [];
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' };

  // Only allow editing upcoming, non-cancelled sessions.
  const isEditable = booking.status !== 'cancelled' && booking.status !== 'completed';

  const hasDescChanged = descDraft !== (booking.tattoo_description || '');
  const hasPlaceChanged = placeDraft !== (booking.tattoo_placement || '');
  const hasChanges = hasDescChanged || hasPlaceChanged;

  const startEdit = () => {
    setDescDraft(booking.tattoo_description || '');
    setPlaceDraft(booking.tattoo_placement || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDescDraft(booking.tattoo_description || '');
    setPlaceDraft(booking.tattoo_placement || '');
    setEditing(false);
  };

  const saveImages = async (next) => {
    const updated = await base44.entities.Booking.update(booking.id, { reference_images: next, last_editor: 'client' });
    onUpdated(updated);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const patch = { last_editor: 'client' };
      if (hasDescChanged) patch.tattoo_description = descDraft;
      if (hasPlaceChanged) patch.tattoo_placement = placeDraft;
      const updated = await base44.entities.Booking.update(booking.id, patch);
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      setError(`Możesz dodać jeszcze maksymalnie ${remaining} zdjęć`);
      return;
    }
    setError('');
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map(file => base44.integrations.Core.UploadPublicFile({ file }).then(r => r.file_url))
      );
      await saveImages([...images, ...urls]);
    } catch (err) {
      setError('Błąd przy przesyłaniu zdjęć');
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: `0.5px solid ${t.border}`,
    color: t.text,
    padding: '8px 10px',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: t.bg, border: `0.5px solid ${t.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `0.5px solid ${t.border}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase' }}>PODGLĄD SESJI</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: t.title, letterSpacing: '0.04em', marginTop: '4px' }}>
              {booking.session_date || '—'}{booking.session_time ? ` · ${booking.session_time}` : ''}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && !editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 14px',
                  border: `0.5px solid ${t.fuchsia}`,
                  color: t.fuchsia,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={12} /> EDYTUJ
              </button>
            )}
            <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
            {booking.artist_name && (
              <div><p style={labelStyle}>Artysta</p><p style={{ color: t.text }}>{booking.artist_name}</p></div>
            )}
            {booking.service_name && (
              <div><p style={labelStyle}>Usługa</p><p style={{ color: t.text }}>{booking.service_name}</p></div>
            )}

            {/* Miejsce na ciele */}
            <div>
              <div className="flex items-center gap-1.5" style={{ marginBottom: '4px' }}>
                <Hand size={11} color={t.muted} />
                <p style={labelStyle}>Miejsce na ciele</p>
              </div>
              {editing ? (
                <input
                  type="text"
                  value={placeDraft}
                  onChange={e => setPlaceDraft(e.target.value)}
                  placeholder="np. przedramię, lewe ramię..."
                  autoFocus
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: t.text }}>{booking.tattoo_placement || (isEditable ? '— dodaj miejsce' : '—')}</p>
              )}
            </div>

            <div>
              <p style={labelStyle}>Cena orientacyjna</p>
              <p style={{ color: t.text, fontWeight: 600 }}>{priceLabel || 'Ustalana indywidualnie'}</p>
              <p style={{ fontSize: '10px', color: t.muted, marginTop: '2px', lineHeight: 1.4 }}>
                Cena zależy od wielkości i wzoru. Ostateczna kwota ustalana jest w studio.
              </p>
            </div>
          </div>

          {/* Opis projektu */}
          <div>
            <p style={{ ...labelStyle, marginBottom: '4px' }}>Opis projektu</p>
            {editing ? (
              <textarea
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                placeholder="Opisz swój projekt, styl, kolory, wielkość..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
              />
            ) : booking.tattoo_description ? (
              <p style={{ fontSize: '13px', color: t.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{booking.tattoo_description}</p>
            ) : (
              <p style={{ fontSize: '13px', color: t.muted, fontStyle: 'italic' }}>— brak opisu</p>
            )}
          </div>

          <div>
            <p style={{ ...labelStyle, marginBottom: '8px' }}>Zdjęcia referencyjne ({images.length}/{MAX_IMAGES})</p>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {images.map((img, idx) => (
                  <div key={img + idx} className="relative" style={{ aspectRatio: '1', border: `0.5px solid ${t.border}`, overflow: 'hidden' }}>
                    <img src={img} alt={`ref-${idx}`} className="w-full h-full object-cover" style={{ cursor: 'pointer' }} onClick={() => setLightbox(img)} />
                    <button
                      onClick={() => saveImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1"
                      style={{ background: 'rgba(0,0,0,0.8)', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={12} color="#F5F0EB" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isEditable && images.length < MAX_IMAGES && (
              <label className="flex items-center justify-center py-6" style={{ border: `1px dashed ${t.border}`, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
                <input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                <div className="text-center">
                  {uploading
                    ? <Loader2 size={18} className="animate-spin" color="var(--brand)" style={{ margin: '0 auto 6px' }} />
                    : <Upload size={18} color="var(--brand)" style={{ margin: '0 auto 6px' }} />}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'DODAJ ZDJĘCIA'}
                  </span>
                </div>
              </label>
            )}

            {error && (
              <p className="mt-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.08em' }}>✗ {error}</p>
            )}
          </div>
        </div>

        {/* Single save bar for both fields */}
        {editing && (
          <div className="flex items-center gap-3 p-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="btn-oxblood flex items-center gap-2"
              style={{ opacity: (saving || !hasChanges) ? 0.5 : 1, cursor: (saving || !hasChanges) ? 'default' : 'pointer' }}
            >
              {saving ? <><Loader2 size={13} className="animate-spin" /> ZAPISYWANIE...</> : <><Check size={13} /> ZAPISZ ZMIANY</>}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '13px 31px',
                background: 'transparent',
                color: t.text,
                border: `0.5px solid ${t.text}`,
                cursor: 'pointer',
              }}
            >
              ANULUJ
            </button>
            {!hasChanges && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>
                Brak zmian do zapisania
              </span>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={e => { e.stopPropagation(); setLightbox(null); }}
        >
          <button className="absolute top-4 right-4" style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
          <img src={lightbox} alt="podgląd" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}