import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from './Dashboard';
import { Mail, LayoutTemplate, Users, Sparkles, ShieldAlert } from 'lucide-react';
import CampaignList from '@/components/dashboard/marketing/CampaignList';
import CampaignEditor from '@/components/dashboard/marketing/CampaignEditor';
import TemplateLibrary from '@/components/dashboard/marketing/TemplateLibrary';
import SavedSegments from '@/components/dashboard/marketing/SavedSegments';
import AiHistoryPanel from '@/components/dashboard/marketing/AiHistoryPanel';
import { marketingTheme } from '@/lib/marketingUi';
import { STARTER_TEMPLATES, AI_DEFAULT_PREFS, DEFAULT_FILTERS, emptyCampaign, loadAiPreferences } from '@/lib/marketing';

const TABS = [
  { key: 'campaigns', label: 'Kampanie', icon: Mail },
  { key: 'templates', label: 'Szablony', icon: LayoutTemplate },
  { key: 'segments', label: 'Segmenty', icon: Users },
  { key: 'history', label: 'Historia AI', icon: Sparkles },
];

const stripSystemFields = (record) => {
  const payload = { ...record };
  delete payload.id;
  delete payload.created_date;
  delete payload.updated_date;
  delete payload.created_by_id;
  delete payload.audience_summary;
  return payload;
};

export default function DashboardCampaigns() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const t = marketingTheme(theme);
  const seeded = useRef(false);

  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [history, setHistory] = useState([]);
  const [preferences, setPreferences] = useState(AI_DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);

  const loadCampaigns = () => base44.entities.MarketingCampaign.list('-updated_date', 100).then(setCampaigns).catch(() => setCampaigns([]));
  const loadTemplates = () => base44.entities.MarketingTemplate.list('order', 100).then(setTemplates).catch(() => setTemplates([]));
  const loadSegments = () => base44.entities.MarketingSegment.list('-created_date', 100).then(setSegments).catch(() => setSegments([]));
  const loadHistory = () => base44.entities.MarketingAiHistory.list('-created_date', 100).then(setHistory).catch(() => setHistory([]));

  useEffect(() => {
    Promise.all([
      loadCampaigns(),
      loadSegments(),
      loadHistory(),
      loadAiPreferences().then(setPreferences).catch(() => setPreferences(AI_DEFAULT_PREFS)),
      base44.entities.MarketingTemplate.list('order', 100),
    ]).then(async ([, , , , templateList]) => {
      if (templateList.length === 0 && !seeded.current) {
        seeded.current = true;
        await base44.entities.MarketingTemplate.bulkCreate(STARTER_TEMPLATES.map((template, index) => ({ ...template, is_active: true, order: index + 1 })));
        await loadTemplates();
      } else {
        setTemplates(templateList);
      }
    }).finally(() => setLoading(false));
  }, []);

  const startNew = (overrides = {}) => {
    setEditor({ ...emptyCampaign(user?.full_name), ...overrides });
    setTab('campaigns');
  };

  const openCampaign = (campaign) => {
    setEditor({ ...campaign, filters: { ...DEFAULT_FILTERS, ...(campaign.filters || {}) }, blocks: campaign.blocks || [] });
  };

  const saveCampaign = async (form) => {
    const payload = stripSystemFields(form);
    const saved = form.id
      ? await base44.entities.MarketingCampaign.update(form.id, payload)
      : await base44.entities.MarketingCampaign.create(payload);
    await loadCampaigns();
    return { ...saved, filters: { ...DEFAULT_FILTERS, ...(saved.filters || {}) }, blocks: saved.blocks || [] };
  };

  const deleteCampaign = async (form) => {
    if (form.id) await base44.entities.MarketingCampaign.delete(form.id);
    setEditor(null);
    await loadCampaigns();
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Usunąć szablon „${template.name}"?`)) return;
    await base44.entities.MarketingTemplate.delete(template.id);
    await loadTemplates();
  };

  const deleteSegment = async (segment) => {
    if (!window.confirm(`Usunąć segment „${segment.name}"?`)) return;
    await base44.entities.MarketingSegment.delete(segment.id);
    await loadSegments();
  };

  const saveSegment = async ({ name, filters, audience_count }) => {
    await base44.entities.MarketingSegment.create({ name, filters, audience_count, is_active: true });
    await loadSegments();
  };

  const applyHistory = async (entry) => {
    const result = entry.result || {};
    const blocks = Array.isArray(result.blocks) ? result.blocks : [];
    if (editor) {
      setEditor(prev => ({
        ...prev,
        subject: result.subject || prev.subject,
        preheader: result.preheader || prev.preheader,
        blocks: blocks.length ? blocks : prev.blocks,
      }));
      setTab('campaigns');
    } else {
      startNew({
        name: entry.campaign_name || result.subject || 'Kampania z historii',
        subject: result.subject || '',
        preheader: result.preheader || '',
        blocks,
      });
    }
    await base44.entities.MarketingAiHistory.update(entry.id, { applied: true }).catch(() => {});
    loadHistory();
  };

  return (
    <div>
      <div className="mb-6">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '6px' }}>MARKETING</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', letterSpacing: '0.04em', lineHeight: 1, color: t.text }}>Kampanie mailowe</h1>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6" style={{ border: `0.5px solid ${t.border}`, background: t.notice, borderRadius: 'var(--radius)' }}>
        <ShieldAlert size={15} color="#f59e0b" className="shrink-0 mt-0.5" />
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>Wysyłka wstrzymana — tryb podglądu</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', lineHeight: 1.6, color: t.muted }}>
            Budujemy segmenty i treści, ale nic nie wychodzi do klientów. Wysyłka zostanie włączona po ustaleniu zasad zgód marketingowych i rezygnacji.
          </p>
        </div>
      </div>

      {editor ? (
        <CampaignEditor
          campaign={editor}
          templates={templates}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onSave={saveCampaign}
          onBack={() => setEditor(null)}
          onDelete={deleteCampaign}
          onSegmentSaved={saveSegment}
          t={t}
          userName={user?.full_name || user?.email}
        />
      ) : (
        <>
          <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-2 px-4 py-3 whitespace-nowrap"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `1.5px solid ${tab === key ? 'var(--brand)' : 'transparent'}`,
                  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: tab === key ? t.text : t.muted,
                }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {tab === 'campaigns' && (
            <CampaignList campaigns={campaigns} loading={loading} t={t} onCreate={() => startNew()} onOpen={openCampaign} />
          )}

          {tab === 'templates' && (
            <TemplateLibrary
              templates={templates}
              loading={loading}
              t={t}
              onUse={template => startNew({
                name: template.name,
                subject: template.subject || '',
                preheader: template.preheader || '',
                blocks: template.blocks || [],
                layout: template.layout || 'classic',
                template_id: template.id,
                template_name: template.name,
              })}
              onDelete={deleteTemplate}
            />
          )}

          {tab === 'segments' && (
            <SavedSegments
              segments={segments}
              loading={loading}
              t={t}
              onUse={segment => startNew({ name: `Kampania — ${segment.name}`, filters: { ...DEFAULT_FILTERS, ...(segment.filters || {}) }, audience_count: segment.audience_count || 0 })}
              onDelete={deleteSegment}
            />
          )}

          {tab === 'history' && (
            <AiHistoryPanel history={history} loading={loading} t={t} onLoad={applyHistory} />
          )}
        </>
      )}
    </div>
  );
}