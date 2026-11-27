import { useState } from 'react';
import { ArrowLeft, Save, Trash2, Loader2, Bookmark } from 'lucide-react';
import BlockEditor from '@/components/dashboard/marketing/BlockEditor';
import AudienceFilters from '@/components/dashboard/marketing/AudienceFilters';
import AudiencePreview from '@/components/dashboard/marketing/AudiencePreview';
import EmailPreview from '@/components/dashboard/marketing/EmailPreview';
import AiComposer from '@/components/dashboard/marketing/AiComposer';
import { filterSummary } from '@/lib/marketing';
import { fieldStyle, labelStyle, selectStyle } from '@/lib/marketingUi';

const Section = ({ title, hint, children, t }) => (
  <section className="p-5 mb-4" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
    <div className="mb-4">
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brand)' }}>{title}</p>
      {hint && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.muted, marginTop: '4px' }}>{hint}</p>}
    </div>
    {children}
  </section>
);

export default function CampaignEditor({ campaign, templates, preferences, onPreferencesChange, onSave, onBack, onDelete, onSegmentSaved, t, userName }) {
  const [form, setForm] = useState(campaign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const applyTemplate = (templateId) => {
    const template = templates.find(item => item.id === templateId);
    if (!template) return;
    setForm(prev => ({
      ...prev,
      template_id: template.id,
      template_name: template.name,
      subject: template.subject || prev.subject,
      preheader: template.preheader || prev.preheader,
      layout: template.layout || prev.layout,
      blocks: Array.isArray(template.blocks) ? template.blocks.map(block => ({ ...block })) : prev.blocks,
    }));
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Nadaj kampanii nazwę.'); return; }
    setSaving(true);
    setError('');
    try {
      const saved = await onSave(form);
      if (saved) setForm(saved);
    } catch (err) {
      setError('Nie udało się zapisać kampanii.');
    } finally {
      setSaving(false);
    }
  };

  const saveSegment = async () => {
    if (!segmentName.trim()) return;
    setSavingSegment(true);
    try {
      await onSegmentSaved({ name: segmentName.trim(), filters: form.filters, audience_count: form.audience_count || 0 });
      setSegmentName('');
    } finally {
      setSavingSegment(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button type="button" onClick={onBack} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: t.muted }}>
          <ArrowLeft size={12} /> KAMPANIE
        </button>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>USUNĄĆ?</span>
              <button type="button" onClick={() => onDelete(form)} className="btn-oxblood" style={{ fontSize: '9px', padding: '8px 14px' }}>TAK</button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>NIE</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 6 }} aria-label="Usuń kampanię"><Trash2 size={14} /></button>
          )}
          <button type="button" onClick={save} disabled={saving} className="btn-oxblood flex items-center gap-2" style={{ fontSize: '9px', padding: '10px 18px', opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} ZAPISZ SZKIC
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input
          value={form.name}
          onChange={event => setField('name', event.target.value)}
          placeholder="Nazwa kampanii"
          style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '0.03em', color: t.text }}
        />
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <select value={form.status || 'draft'} onChange={event => setField('status', event.target.value)} style={{ ...selectStyle(t), width: 'auto' }}>
            <option value="draft">Szkic</option>
            <option value="ready">Gotowa do wysyłki</option>
            <option value="archived">Archiwum</option>
          </select>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>
            {form.audience_count || 0} ODBIORCÓW · {form.ai_generations || 0} GENERACJI AI
          </span>
        </div>
        {error && <p role="alert" className="mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3">
          <Section title="Treść wiadomości" hint="Zacznij od szablonu albo zbuduj wiadomość z bloków." t={t}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <span style={labelStyle(t)}>Temat</span>
                <input value={form.subject || ''} onChange={event => setField('subject', event.target.value)} style={fieldStyle(t)} placeholder="Temat wiadomości" />
              </div>
              <div>
                <span style={labelStyle(t)}>Zajawka</span>
                <input value={form.preheader || ''} onChange={event => setField('preheader', event.target.value)} style={fieldStyle(t)} placeholder="Krótkie zdanie obok tematu" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <span style={labelStyle(t)}>Szablon</span>
                <select value={form.template_id || ''} onChange={event => applyTemplate(event.target.value)} style={selectStyle(t)}>
                  <option value="">Bez szablonu</option>
                  {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle(t)}>Układ</span>
                <select value={form.layout || 'classic'} onChange={event => setField('layout', event.target.value)} style={selectStyle(t)}>
                  <option value="classic">Klasyczny — pasek marki</option>
                  <option value="editorial">Editorial — duży tytuł</option>
                  <option value="minimal">Minimal — sama treść</option>
                </select>
              </div>
            </div>
            <BlockEditor blocks={form.blocks || []} onChange={blocks => setField('blocks', blocks)} t={t} />
          </Section>

          <Section title="Asystent AI" hint="AI pisze treść lub układa ją w bloki. Każda generacja trafia do historii." t={t}>
            <AiComposer
              campaign={{ ...form, audience_summary: filterSummary(form.filters) }}
              preferences={preferences}
              onPreferencesChange={onPreferencesChange}
              onApply={result => setForm(prev => ({
                ...prev,
                subject: result.subject || prev.subject,
                preheader: result.preheader || prev.preheader,
                blocks: Array.isArray(result.blocks) && result.blocks.length ? result.blocks : prev.blocks,
              }))}
              onGenerated={() => setField('ai_generations', (form.ai_generations || 0) + 1)}
              t={t}
              userName={userName}
            />
          </Section>

          <Section title="Odbiorcy" hint={filterSummary(form.filters)} t={t}>
            <AudienceFilters filters={form.filters || {}} onChange={filters => setField('filters', filters)} t={t} />
            <div className="mt-5 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <AudiencePreview filters={form.filters || {}} t={t} onCount={count => setForm(prev => ({ ...prev, audience_count: count, audience_updated: new Date().toISOString() }))} />
            </div>
            <div className="flex items-end gap-2 mt-4">
              <div className="flex-1">
                <span style={labelStyle(t)}>Zapisz segment</span>
                <input value={segmentName} onChange={event => setSegmentName(event.target.value)} style={fieldStyle(t)} placeholder="Np. Powracający klienci tatuażu" />
              </div>
              <button type="button" onClick={saveSegment} disabled={savingSegment || !segmentName.trim()} className="flex items-center gap-1.5" style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '10px 14px', cursor: segmentName.trim() ? 'pointer' : 'default', opacity: segmentName.trim() ? 1 : 0.5, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text }}>
                {savingSegment ? <Loader2 size={11} className="animate-spin" /> : <Bookmark size={11} />} ZAPISZ
              </button>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-2 lg:sticky lg:top-4">
          <EmailPreview campaign={form} t={t} />
        </div>
      </div>
    </div>
  );
}