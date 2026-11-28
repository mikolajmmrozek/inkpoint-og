import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { fieldStyle, labelStyle } from '@/lib/marketingUi';

// Grafika w mailu musi być publiczna — odbiorcy otwierają ją bez logowania.
export default function ImageUpload({ value, onChange, t, label = 'Grafika', hint }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (err) {
      setError('Nie udało się wgrać grafiki.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span style={labelStyle(t)}>{label}</span>
      <div className="flex items-start gap-2">
        <input
          value={value || ''}
          onChange={event => onChange(event.target.value)}
          placeholder="Adres grafiki (https://…) albo wgraj plik"
          style={fieldStyle(t)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1 shrink-0"
          style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '10px 12px', cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />} Wgraj
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label="Usuń grafikę" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 6 }}>
            <X size={12} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={event => upload(event.target.files?.[0])} />
      {hint && <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: t.muted, marginTop: '4px' }}>{hint}</p>}
      {error && <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', marginTop: '4px' }}>{error}</p>}
      {value && (
        <img src={value} alt="" style={{ marginTop: '8px', maxHeight: '110px', borderRadius: 'var(--radius)', border: `0.5px solid ${t.border}`, objectFit: 'cover' }} />
      )}
    </div>
  );
}