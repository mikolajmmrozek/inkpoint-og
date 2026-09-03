import { useState } from 'react';
import { LANGUAGES } from '@/lib/healthFormTranslations';
import { prewarmTranslations } from '@/hooks/useTranslatedText';

export default function LangDropdown({ lang, setLang, template, theme }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang);

  const isDark = theme === 'dark' || !theme;
  const dropBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const borderColor = isDark ? '#262626' : '#E5E5E5';
  const textColor = isDark ? 'rgba(245,240,235,0.75)' : 'rgba(0,0,0,0.75)';
  const innerBorder = isDark ? '#1a1a1a' : '#F0F0F0';

  const handleSelect = async (code) => {
    setOpen(false);
    setLang(code);
    if (code !== 'pl' && template) {
      prewarmTranslations(template, code);
    }
  };

  return (
    <div className="flex justify-center pb-8" style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
            padding: '6px 14px', border: `0.5px solid ${open ? 'var(--brand)' : borderColor}`,
            color: open ? 'var(--brand)' : textColor, background: 'transparent',
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
              background: dropBg, border: `0.5px solid ${borderColor}`, zIndex: 50,
              minWidth: '160px', marginBottom: '4px'
            }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code)}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
                    padding: '8px 14px', border: 'none', borderBottom: `0.5px solid ${innerBorder}`,
                    color: lang === l.code ? 'var(--brand)' : textColor,
                    background: lang === l.code ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
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