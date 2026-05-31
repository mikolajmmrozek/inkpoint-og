import SignatureCanvas from './SignatureCanvas';

export default function StepGuardian({ guardian, setGuardianField, form, t, inputStyle, showErrors }) {
  return (
    <div className="space-y-6">
      <div className="px-4 py-3 mb-4" style={{ background: 'rgba(255,0,127,0.06)', border: '0.5px solid rgba(255,0,127,0.2)' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.1em', lineHeight: 1.6 }}>{t.guardianInfo}</p>
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: showErrors && !guardian.guardian_name ? '#FF007F' : 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.guardianName} * {showErrors && !guardian.guardian_name && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderBottomColor: showErrors && !guardian.guardian_name ? '#FF007F' : '#262626' }} value={guardian.guardian_name || ''} onChange={e => setGuardianField('guardian_name', e.target.value)} />
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: showErrors && !guardian.guardian_phone ? '#FF007F' : 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.guardianPhone} * {showErrors && !guardian.guardian_phone && '(wymagane)'}</label>
        <input type="tel" style={{ ...inputStyle, borderBottomColor: showErrors && !guardian.guardian_phone ? '#FF007F' : '#262626' }} value={guardian.guardian_phone || ''} onChange={e => setGuardianField('guardian_phone', e.target.value)} />
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>{t.procedureType} *</label>
        <div className="flex gap-3 flex-wrap">
          {['TATUAŻ', 'PIERCING'].map(p => {
            const selected = (guardian.procedure_type || []).includes(p);
            return (
              <button type="button" key={p}
                onClick={() => {
                  const curr = guardian.procedure_type || [];
                  setGuardianField('procedure_type', selected ? curr.filter(x => x !== p) : [...curr, p]);
                }}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', border: `0.5px solid ${selected ? '#FF007F' : showErrors && !guardian.procedure_type?.length ? '#FF007F' : '#262626'}`, color: selected ? '#FF007F' : showErrors && !guardian.procedure_type?.length ? '#FF007F' : 'rgba(245,240,235,0.4)', background: selected ? 'rgba(255,0,127,0.08)' : showErrors && !guardian.procedure_type?.length ? 'rgba(255,0,127,0.08)' : 'transparent', cursor: 'pointer' }}>
                {p === 'TATUAŻ' ? t.tattoo : t.piercing}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: showErrors && !guardian.body_placement ? '#FF007F' : 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t.bodyPlacement} * {showErrors && !guardian.body_placement && '(wymagane)'}</label>
        <input style={{ ...inputStyle, borderBottomColor: showErrors && !guardian.body_placement ? '#FF007F' : '#262626' }} value={guardian.body_placement || form.body_placement || ''} onChange={e => setGuardianField('body_placement', e.target.value)} />
      </div>

      <div>
        <label style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Liczba przekłuć lub tatuaży</label>
        <input type="number" min="1" style={{ ...inputStyle, width: '120px' }} value={guardian.num_procedures || 1} onChange={e => setGuardianField('num_procedures', Number(e.target.value))} />
      </div>

      <div className="py-4 px-4" style={{ border: '0.5px solid #262626', background: 'rgba(38,38,38,0.1)' }}>
        <p style={{ color: 'rgba(245,240,235,0.6)', fontSize: '13px', lineHeight: 1.7, marginBottom: '16px' }}>{t.guardianConsentText}</p>
      </div>

      <SignatureCanvas
        value={guardian.guardian_signature}
        onChange={v => setGuardianField('guardian_signature', v)}
        label={t.guardianSignature}
        clearLabel={t.clearSignature}
        showErrors={showErrors}
      />
    </div>
  );
}