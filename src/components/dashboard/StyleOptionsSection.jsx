import { Check } from 'lucide-react';
import { CORNER_RADIUS_OPTIONS, BORDER_THICKNESS_OPTIONS, IMAGE_BORDER_OPTIONS } from '@/lib/themeConfig';

export default function StyleOptionsSection({ form, set, t }) {
  const label = (text) => (
    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const renderOptionGroup = (fieldKey, options, currentVal) => (
    <div className="flex gap-3 flex-wrap">
      {Object.entries(options).map(([key, opt]) => {
        const active = currentVal === key;
        return (
          <button
            key={key}
            onClick={() => set(fieldKey, key)}
            className="flex items-center gap-2 px-5 py-3 transition-all"
            style={{
              border: `var(--border-width) solid ${active ? 'var(--brand)' : t.border}`,
              borderRadius: 'var(--radius)',
              color: active ? 'var(--brand)' : t.muted,
              background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {active && <Check size={12} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mb-8">
      {label('Styl krawędzi i ramek')}

      <div className="mb-6">
        <p className="mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Promień narożników</p>
        {renderOptionGroup('corner_radius', CORNER_RADIUS_OPTIONS, form.corner_radius)}
      </div>

      <div className="mb-6">
        <p className="mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Grubość ramek</p>
        {renderOptionGroup('border_thickness', BORDER_THICKNESS_OPTIONS, form.border_thickness)}
      </div>

      <div className="mb-6">
        <p className="mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Ramka wokół zdjęć</p>
        {renderOptionGroup('image_border_style', IMAGE_BORDER_OPTIONS, form.image_border_style)}
      </div>

      <div className="flex items-center gap-4 mt-6 p-4" style={{ border: `var(--border-width) solid ${t.border}`, borderRadius: 'var(--radius)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Podgląd:</span>
        <button className="btn-oxblood" style={{ padding: '8px 18px', fontSize: '9px' }}>PRZYCISK</button>
        <div style={{
          padding: '12px 16px',
          border: `var(--border-width) solid ${t.border}`,
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, letterSpacing: '0.1em'
        }}>
          KAFEL
        </div>
        <div style={{
          width: '48px', height: '48px',
          background: `linear-gradient(135deg, rgb(var(--brand-rgb) / 0.3), rgb(var(--brand-rgb) / 0.1))`,
          border: 'var(--media-border-width) solid var(--media-border-color)',
          borderRadius: 'var(--radius)',
        }} />
      </div>
    </div>
  );
}