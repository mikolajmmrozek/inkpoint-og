import SignatureCanvas from './SignatureCanvas';

export default function StepGuardian({ guardian, setGuardianField, form, t, inputStyle, showErrors, textPrimary, textMuted, borderColor, theme }) {
  const labelStyle = (error) => ({
    fontFamily: 'var(--font-mono)', fontSize: '11px',
    color: error ? 'var(--brand)' : textMuted,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    display: 'block', marginBottom: '6px'
  });

  return (
    <div className="space-y-6">
      <div className="px-4 py-3 mb-4" style={{ background: 'rgb(var(--brand-rgb) /0.06)', border: '0.5px solid rgb(var(--brand-rgb) /0.2)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.1em', lineHeight: 1.6 }}>{t.guardianInfo}</p>
      </div>

      <div>
        <label style={labelStyle(showErrors && !guardian.guardian_name)}>{t.guardianName} * {showErrors && !guardian.guardian_name && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderColor: showErrors && !guardian.guardian_name ? 'var(--brand)' : borderColor }} value={guardian.guardian_name || ''} onChange={e => setGuardianField('guardian_name', e.target.value)} />
      </div>

      <div>
        <label style={labelStyle(showErrors && !guardian.guardian_phone)}>{t.guardianPhone} * {showErrors && !guardian.guardian_phone && '(wymagane)'}</label>
        <input type="tel" style={{ ...inputStyle, borderColor: showErrors && !guardian.guardian_phone ? 'var(--brand)' : borderColor }} value={guardian.guardian_phone || ''} onChange={e => setGuardianField('guardian_phone', e.target.value)} />
      </div>

      <div>
        <label style={labelStyle(false)}>{t.procedureType} *</label>
        <div className="flex gap-3 flex-wrap">
          {['TATUAŻ', 'PIERCING'].map(p => {
            const selected = (guardian.procedure_type || []).includes(p);
            return (
              <button type="button" key={p}
                onClick={() => {
                  const curr = guardian.procedure_type || [];
                  setGuardianField('procedure_type', selected ? curr.filter(x => x !== p) : [...curr, p]);
                }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 22px', border: `0.5px solid ${selected ? 'var(--brand)' : showErrors && !guardian.procedure_type?.length ? 'var(--brand)' : borderColor}`, color: selected ? 'var(--brand)' : showErrors && !guardian.procedure_type?.length ? 'var(--brand)' : textMuted, background: selected ? 'rgb(var(--brand-rgb) /0.08)' : showErrors && !guardian.procedure_type?.length ? 'rgb(var(--brand-rgb) /0.08)' : 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                {p === 'TATUAŻ' ? t.tattoo : t.piercing}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle(showErrors && !guardian.body_placement)}>{t.bodyPlacement} * {showErrors && !guardian.body_placement && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderColor: showErrors && !guardian.body_placement ? 'var(--brand)' : borderColor }} value={guardian.body_placement || form.body_placement || ''} onChange={e => setGuardianField('body_placement', e.target.value)} />
      </div>

      <div>
        <label style={labelStyle(false)}>{t.guardianNumProcedures}</label>
        <input
          type="text"
          inputMode="numeric"
          style={{ ...inputStyle, width: '120px' }}
          value={guardian.num_procedures ?? ''}
          onChange={e => {
            const val = e.target.value;
            if (val === '' || val === '0') {
              setGuardianField('num_procedures', val === '' ? '' : 0);
            } else {
              const n = parseInt(val, 10);
              if (!isNaN(n)) setGuardianField('num_procedures', n);
            }
          }}
        />
      </div>

      <div className="py-4 px-4" style={{ border: `0.5px solid ${borderColor}`, background: 'transparent' }}>
        <p style={{ color: textMuted, fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>{t.guardianConsentText}</p>
      </div>

      <SignatureCanvas
        value={guardian.guardian_signature}
        onChange={v => setGuardianField('guardian_signature', v)}
        label={t.guardianSignature}
        clearLabel={t.clearSignature}
        showErrors={showErrors}
        theme={theme}
        textMuted={textMuted}
        borderColor={borderColor}
      />
    </div>
  );
}