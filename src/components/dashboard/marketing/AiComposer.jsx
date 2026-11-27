import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Settings2, Loader2, Check } from 'lucide-react';
import { TONE_LABELS, LENGTH_LABELS, CTA_LABELS, saveAiPreferences } from '@/lib/marketing';
import { fieldStyle, labelStyle, selectStyle } from '@/lib/marketingUi';

export default function AiComposer({ campaign, preferences, onPreferencesChange, onApply, onGenerated, t, userName }) {
  const [brief, setBrief] = useState('');
  const [mode, setMode] = useState('copy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const setPref = (key, value) => {
    setPrefsSaved(false);
    onPreferencesChange({ ...preferences, [key]: value });
  };

  const persistPrefs = async () => {
    setSavingPrefs(true);
    try {
      const saved = await saveAiPreferences(preferences, userName);
      onPreferencesChange({ ...preferences, ...saved });
      setPrefsSaved(true);
    } catch (err) {
      setError('Nie udało się zapisać preferencji.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const generate = async () => {
    if (!brief.trim()) { setError('Opisz krótko, o czym ma być wiadomość.'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('marketingAi', {
        campaign_id: campaign.id || '',
        campaign_name: campaign.name || '',
        brief,
        mode,
        preferences,
        audience_summary: campaign.audience_summary || '',
        current_blocks: mode === 'layout' ? campaign.blocks : [],
      });
      setResult(response.data.result);
      onGenerated?.(response.data.history_id);
    } catch (err) {
      setError('Nie udało się wygenerować treści. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)' }}>
          <Sparkles size={12} /> ASYSTENT AI
        </span>
        <button type="button" onClick={() => setPrefsOpen(open => !open)} className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Settings2 size={11} /> PREFERENCJE
        </button>
      </div>

      {prefsOpen && (
        <div className="p-3 mb-3 space-y-3" style={{ border: `0.5px solid ${t.border}`, background: t.card, borderRadius: 'var(--radius)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span style={labelStyle(t)}>Ton</span>
              <select value={preferences.tone} onChange={event => setPref('tone', event.target.value)} style={selectStyle(t)}>
                {Object.entries(TONE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <span style={labelStyle(t)}>Długość</span>
              <select value={preferences.length} onChange={event => setPref('length', event.target.value)} style={selectStyle(t)}>
                {Object.entries(LENGTH_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <span style={labelStyle(t)}>Wezwanie</span>
              <select value={preferences.cta_style} onChange={event => setPref('cta_style', event.target.value)} style={selectStyle(t)}>
                {Object.entries(CTA_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={Boolean(preferences.emoji)} onChange={event => setPref('emoji', event.target.checked)} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.text }}>Pozwól na emoji</span>
          </label>

          <div>
            <span style={labelStyle(t)}>Podpis</span>
            <textarea value={preferences.signature || ''} onChange={event => setPref('signature', event.target.value)} rows={2} style={{ ...fieldStyle(t), resize: 'vertical' }} />
          </div>
          <div>
            <span style={labelStyle(t)}>Stałe wytyczne</span>
            <textarea value={preferences.extra_notes || ''} onChange={event => setPref('extra_notes', event.target.value)} rows={2} style={{ ...fieldStyle(t), resize: 'vertical' }} placeholder="Np. zawsze piszemy per Ty, nie używamy słowa okazja" />
          </div>

          <button type="button" onClick={persistPrefs} disabled={savingPrefs} className="btn-oxblood flex items-center gap-1.5" style={{ fontSize: '9px', padding: '9px 16px', opacity: savingPrefs ? 0.6 : 1 }}>
            {savingPrefs ? <Loader2 size={11} className="animate-spin" /> : prefsSaved ? <Check size={11} /> : null}
            {prefsSaved ? 'ZAPISANE' : 'ZAPISZ PREFERENCJE'}
          </button>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1.7, color: t.muted }}>
            Preferencje zapisują się w pamięci asystenta panelu, więc kolejne kampanie trzymają ten sam styl.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div style={{ maxWidth: 200 }}>
          <span style={labelStyle(t)}>Tryb</span>
          <select value={mode} onChange={event => setMode(event.target.value)} style={selectStyle(t)}>
            <option value="copy">Nowa treść</option>
            <option value="layout">Ułóż obecną treść</option>
          </select>
        </div>
        <textarea
          value={brief}
          onChange={event => setBrief(event.target.value)}
          rows={3}
          placeholder="Np. zaproszenie na warsztaty linework 12 grudnia, ciepło, bez rabatów"
          style={{ ...fieldStyle(t), resize: 'vertical' }}
        />
        {error && <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>{error}</p>}
        <button type="button" onClick={generate} disabled={loading} className="btn-oxblood flex items-center gap-2" style={{ fontSize: '9px', padding: '10px 18px', opacity: loading ? 0.6 : 1 }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? 'GENERUJĘ…' : 'WYGENERUJ'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-3" style={{ border: `0.5px solid var(--brand)`, background: 'rgb(var(--brand-rgb) / 0.05)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand)' }}>PROPOZYCJA AI</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: t.text }}>{result.subject}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.muted }}>{result.preheader}</p>
          <p className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>{result.blocks?.length || 0} BLOKÓW</p>
          <button type="button" onClick={() => onApply(result)} className="btn-oxblood mt-3" style={{ fontSize: '9px', padding: '9px 16px' }}>
            WSTAW DO KAMPANII
          </button>
        </div>
      )}
    </div>
  );
}