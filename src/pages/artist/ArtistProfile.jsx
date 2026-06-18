import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { compressImage } from '@/utils/compressImage';
import { Upload, Instagram } from 'lucide-react';

export default function ArtistProfile() {
  const { artist: initialArtist, theme } = useOutletContext();
  const [artist, setArtist] = useState(initialArtist);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bio, setBio] = useState(initialArtist?.bio || '');
  const [instagram, setInstagram] = useState(initialArtist?.instagram || '');

  const t = theme === 'light'
    ? { title: '#111111', muted: 'rgba(0,0,0,0.4)', cardBg: '#FFFFFF', cardBorder: '#E5E5E5', text: '#111111', inputBorder: '#CCCCCC' }
    : { title: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', cardBg: 'rgba(255,255,255,0.04)', cardBorder: '#262626', text: '#F5F0EB', inputBorder: '#262626' };

  const inputStyle = {
    background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.inputBorder}`,
    color: t.text, padding: '10px 0', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif',
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !artist?.id) return;
    setUploading(true);
    const compressed = await compressImage(file, 800, 0.75);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    await base44.entities.Artist.update(artist.id, { photo_url: file_url });
    setArtist(a => ({ ...a, photo_url: file_url }));
    setUploading(false);
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !artist?.id) return;
    setUploading(true);
    const current = artist.portfolio_images || [];
    const newImages = [];
    for (const file of files.slice(0, 5)) {
      const compressed = await compressImage(file, 1200, 0.75);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      newImages.push({ url: file_url, caption: '', style: '' });
    }
    const updated = [...current, ...newImages];
    await base44.entities.Artist.update(artist.id, { portfolio_images: updated });
    setArtist(a => ({ ...a, portfolio_images: updated }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!artist?.id) return;
    setSaving(true);
    await base44.entities.Artist.update(artist.id, { bio, instagram });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const removePortfolioImage = async (idx) => {
    const updated = (artist.portfolio_images || []).filter((_, i) => i !== idx);
    await base44.entities.Artist.update(artist.id, { portfolio_images: updated });
    setArtist(a => ({ ...a, portfolio_images: updated }));
  };

  return (
    <div>
      <div className="mb-8">
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>MÓJ PROFIL</p>
        <h1 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '3rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>{artist?.name}</h1>
      </div>

      <div className="space-y-6">
        {/* Photo */}
        <div className="p-6" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>ZDJĘCIE PROFILOWE</p>
          <div className="flex items-center gap-6">
            {artist?.photo_url ? (
              <img src={artist.photo_url} alt={artist.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${t.cardBorder}` }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,0,127,0.1)', border: '0.5px solid rgba(255,0,127,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '24px', color: '#FF007F' }}>
                  {(artist?.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <span className="btn-ghost-parchment" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={12} /> {uploading ? 'WYSYŁAM...' : 'ZMIEŃ ZDJĘCIE'}
              </span>
            </label>
          </div>
        </div>

        {/* Bio & Instagram */}
        <div className="p-6" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>INFORMACJE</p>
          <div className="space-y-4">
            <div>
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>BIO</label>
              <textarea rows={5} value={bio} onChange={e => setBio(e.target.value)} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>INSTAGRAM (USERNAME)</label>
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@nazwa" style={inputStyle} />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-oxblood mt-6" style={{ fontSize: '10px', opacity: saving ? 0.6 : 1 }}>
            {saved ? '✓ ZAPISANO' : saving ? 'ZAPISUJĘ...' : 'ZAPISZ ZMIANY'}
          </button>
        </div>

        {/* Portfolio */}
        <div className="p-6" style={{ border: `0.5px solid ${t.cardBorder}`, background: t.cardBg }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              PORTFOLIO ({(artist?.portfolio_images || []).length} zdjęć)
            </p>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" multiple onChange={handlePortfolioUpload} className="hidden" />
              <span className="btn-ghost-parchment" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={11} /> {uploading ? 'WYSYŁAM...' : 'DODAJ ZDJĘCIA'}
              </span>
            </label>
          </div>
          {(artist?.portfolio_images || []).length === 0 ? (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em' }}>Brak zdjęć w portfolio</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(artist.portfolio_images || []).map((img, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={img.url} alt={img.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  <button
                    onClick={() => removePortfolioImage(i)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FF007F', cursor: 'pointer', width: '22px', height: '22px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}