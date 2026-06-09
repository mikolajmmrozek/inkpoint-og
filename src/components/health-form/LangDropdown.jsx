import { useState } from 'react';
import { LANGUAGES } from '@/lib/healthFormTranslations';
import { prewarmTranslations } from '@/hooks/useTranslatedText';

export default function LangDropdown({ lang, setLang, template }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang);

  const handleSelect = async (code) => {
    setOpen(false);
    setLang(code);
    if (code !== 'pl' && template) {
      prewarmTranslations(template, code); // fire-and-forget, cache fills in background
    }
  };

  return (
    <div className="flex justify-center pb-8" style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em',
            padding: '6px 14px', border: `0.5px solid ${open ? '#FF007F' : '#262626'}`,
            color: open ? '#FF007F' : 'rgba(245,240,235,0.4)', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {current?.flag} {current?.code.toUpperCase()} ▾
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <div style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              background: '#0A0A0A', border: '0.5px solid #262626', zIndex: 50,
              minWidth: '160px', marginBottom: '4px'
            }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code)}
                  style={{
                    fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em',
                    padding: '8px 14px', border: 'none', borderBottom: '0.5px solid #1a1a1a',
                    color: lang === l.code ? '#FF007F' : 'rgba(245,240,235,0.6)',
                    background: lang === l.code ? 'rgba(255,0,127,0.06)' : 'transparent',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}