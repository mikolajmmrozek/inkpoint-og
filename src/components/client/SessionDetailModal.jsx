import { useState } from 'react';
import { X, Upload, Loader2, Edit2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_IMAGES = 10;

export default function SessionDetailModal({ booking, theme, priceLabel, onClose, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingPlace, setEditingPlace] = useState(false);
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

  const saveImages = async (next) => {
    const updated = await base44.entities.Booking.update(booking.id, { reference_images: next });
    onUpdated(updated);
  };

  const saveDesc = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Booking.update(booking.id, { tattoo_description: descDraft });
      onUpdated(updated);
      setEditingDesc(false);
    } catch (e) {
      setError('Błąd zapisu opisu');
    } finally {
      setSaving(false);
    }
  };

  const savePlace = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Booking.update(booking.id, { tattoo_placement: placeDraft });
      onUpdated(updated);
      setEditingPlace(false);
    } catch (e) {
      setError('Błąd zapisu miejsca');
    } finally {
      setSaving(false);
    }
  };

  const startEditDesc = () => { setDescDraft(booking.tattoo_description || ''); setEditingDesc(true); };
  const startEditPlace = () => { setPlaceDraft(booking.tattoo_placement || ''); setEditingPlace(true); };

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
    border: `0.5px solid ${t.fuchsia}`,
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
          <button onClick={onClose} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
            {booking.artist_name && (
              <div><p style={labelStyle}>Artysta</p><p style={{ color: t.text }}>{booking.artist_name}</p></div>
            )}
            {booking.service_name && (
              <div><p style={labelStyle}>Usługa</p><p style={{ color: t.text }}>{booking.service_name}</p></div>
            )}

            {/* Miejsce — editable */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <p style={labelStyle}>Miejsce</p>
                {isEditable && !editingPlace && (
                  <button onClick={startEditPlace} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0, display: 'flex' }}>
                    <Edit2 size={11} />
                  </button>
                )}
              </div>
              {editingPlace ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={placeDraft}
                    onChange={e => setPlaceDraft(e.target.value)}
                    placeholder="np. przedramię, lewe ramię..."
                    autoFocus
                    style={inputStyle}
                  />
                  <div className="flex gap-2">
                    <button onClick={savePlace} disabled={saving} style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Zapisz
                    </button>
                    <button onClick={() => setEditingPlace(false)} disabled={saving} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.muted, padding: '6px 14px', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      Anuluj
                    </button>
                  </div>
                </div>
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

          {/* Opis projektu — editable */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
              <p style={labelStyle}>Opis projektu</p>
              {isEditable && !editingDesc && (
                <button onClick={startEditDesc} title="Edytuj" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 0, display: 'flex' }}>
                  <Edit2 size={11} />
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  placeholder="Opisz swój projekt, styl, kolory, wielkość..."
                  autoFocus
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                />
                <div className="flex gap-2">
                  <button onClick={saveDesc} disabled={saving} style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Zapisz
                  </button>
                  <button onClick={() => setEditingDesc(false)} disabled={saving} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.muted, padding: '6px 14px', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Anuluj
                  </button>
                </div>
              </div>
            ) : (
              booking.tattoo_description ? (
                <p style={{ fontSize: '13px', color: t.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{booking.tattoo_description}</p>
              ) : isEditable ? (
                <button onClick={startEditDesc} style={{ fontSize: '12px', color: t.muted, background: 'none', border: `0.5px dashed ${t.border}`, padding: '12px', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
                  + Dodaj opis projektu
                </button>
              ) : null
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