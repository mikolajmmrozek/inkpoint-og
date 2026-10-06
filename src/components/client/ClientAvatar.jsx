import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { compressImage } from '@/utils/compressImage';

/**
 * Circular avatar with upload + optional "pull from Google" action.
 * Props:
 *  - client: the Client record (has avatar_url, auth_provider)
 *  - user: the Base44 User (may have photo_url from OAuth provider)
 *  - onSave: async (avatarUrl) => {} — persists the URL to the Client record
 *  - t: theme tokens { bg, border, title, text, muted, fuchsia }
 *  - size: px diameter (default 96)
 */
export default function ClientAvatar({ client, user, onSave, t, size = 96 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pulling, setPulling] = useState(false);

  const avatarUrl = client?.avatar_url || user?.photo_url || user?.picture || '';
  const initials = (client?.name || user?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.85 });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      await onSave(file_url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Pull avatar from the OAuth provider (Google) if available on the user object.
  const handlePullFromProvider = async () => {
    const providerPhoto = user?.photo_url || user?.picture;
    if (!providerPhoto) return;
    setPulling(true);
    try {
      await onSave(providerPhoto);
    } finally {
      setPulling(false);
    }
  };

  const showProviderButton = !avatarUrl && client?.auth_provider === 'google' && (user?.photo_url || user?.picture);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative group cursor-pointer"
        style={{ width: size, height: size, flexShrink: 0 }}
        onClick={() => fileRef.current?.click()}
        title="Zmień zdjęcie profilowe"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-full h-full rounded-full object-cover"
            style={{ border: `0.5px solid ${t.border}` }}
          />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{
              border: `0.5px solid ${t.border}`,
              background: 'rgb(var(--brand-rgb) /0.06)',
              fontFamily: 'var(--font-display)',
              fontSize: size * 0.32,
              color: 'var(--brand)',
              letterSpacing: '0.04em',
            }}
          >
            {initials}
          </div>
        )}
        {/* Camera overlay on hover */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity"
          style={{
            background: 'rgba(0,0,0,0.5)',
            opacity: uploading ? 1 : 0,
          }}
        >
          {uploading ? <Loader2 size={size * 0.22} className="animate-spin" style={{ color: '#fff' }} /> : <Camera size={size * 0.22} style={{ color: '#fff' }} />}
        </div>
        {!uploading && (
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <Camera size={size * 0.22} style={{ color: '#fff' }} />
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      {showProviderButton && (
        <button
          onClick={handlePullFromProvider}
          disabled={pulling}
          className="flex items-center gap-1.5"
          style={{
            background: 'none',
            border: `0.5px solid ${t.border}`,
            color: t.muted,
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '6px 12px',
            cursor: pulling ? 'default' : 'pointer',
            opacity: pulling ? 0.6 : 1,
          }}
        >
          {pulling ? <Loader2 size={10} className="animate-spin" /> : null}
          Pobierz z Google
        </button>
      )}
    </div>
  );
}