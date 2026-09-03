import { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Star, Mail, Eye, EyeOff, Trash2, X, Check, Plus, GripVertical, Copy, ExternalLink } from 'lucide-react';
import StatsTile from '@/components/dashboard/StatsTile';

function StarDisplay({ value, size = 12 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= value ? 'var(--brand)' : 'rgba(245,240,235,0.15)' }}>★</span>
      ))}
    </span>
  );
}

const DEFAULT_QUESTIONS = [
  { id: 'rating_overall', label: 'Jak oceniasz ogólnie całą wizytę?', type: 'stars', required: true, enabled: true },
  { id: 'rating_artist', label: 'Jak oceniasz pracę artysty?', type: 'stars', required: true, enabled: true },
  { id: 'short_review', label: 'Napisz krótką opinię (będzie widoczna publicznie)', type: 'textarea', required: true, enabled: true },
  { id: 'extra_studio', label: 'Jak oceniasz atmosferę i obsługę studia?', type: 'stars', required: false, enabled: true },
  { id: 'extra_cleanliness', label: 'Jak oceniasz czystość i sterylność?', type: 'stars', required: false, enabled: true },
  { id: 'extra_value', label: 'Jak oceniasz stosunek jakości do ceny?', type: 'stars', required: false, enabled: true },
  { id: 'extra_comment', label: 'Chcesz dodać coś więcej? (opcjonalne)', type: 'textarea', required: false, enabled: true },
];

const DEFAULT_CONFIG = {
  key: 'default',
  intro_text: 'Twoja opinia jest dla nas bardzo ważna. Zajmie to tylko chwilę.',
  thank_you_text: 'Dziękujemy! Twoja opinia wkrótce się pojawi.',
  email_subject: 'Jak minęła Twoja sesja? Podziel się opinią!',
  email_body: 'Cześć {client_name},\n\nDziękujemy za wizytę w naszym studio!\nChcielibyśmy poznać Twoją opinię. Zajmie to tylko chwilę:\n\n{link}\n\nZ pozdrowieniami,\nZespół Romans Tattoo',
  questions: DEFAULT_QUESTIONS,
};

export default function DashboardFeedback() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.6)', fuchsia: 'var(--brand)', pageBg: '#F8F8F8' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.65)', fuchsia: 'var(--brand)', pageBg: '#0A0A0A' };

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'config'
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  const surveyUrl = `${window.location.origin}/feedback`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [configForm, setConfigForm] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.Feedback.list('-created_date', 100),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['feedbackBookings'],
    queryFn: () => base44.entities.Booking.list('-session_date', 200),
  });

  const { data: configData = [] } = useQuery({
    queryKey: ['feedbackConfig'],
    queryFn: () => base44.entities.FeedbackSurveyConfig.filter({ key: 'default' }),
  });

  useEffect(() => {
    if (configForm !== null) return;
    if (configData.length > 0) setConfigForm({ ...DEFAULT_CONFIG, ...configData[0] });
    else setConfigForm({ ...DEFAULT_CONFIG });
  }, [configData]);

  const config = configData.length > 0 ? { ...DEFAULT_CONFIG, ...configData[0] } : DEFAULT_CONFIG;

  const togglePublish = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Feedback.update(id, { is_published: val }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });

  const deleteFeedback = useMutation({
    mutationFn: (id) => base44.entities.Feedback.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_date) - new Date(a.created_date);
      case 'oldest': return new Date(a.created_date) - new Date(b.created_date);
      case 'highest': return (b.rating_overall || 0) - (a.rating_overall || 0);
      case 'lowest': return (a.rating_overall || 0) - (b.rating_overall || 0);
      default: return 0;
    }
  });

  const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—';

  const ratings = feedbacks.map(f => f.rating_overall).filter(Boolean);
  const artistRatings = feedbacks.map(f => f.rating_artist).filter(Boolean);
  const studioRatings = feedbacks.map(f => f.rating_studio).filter(Boolean);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    if (configData.length > 0) {
      await base44.entities.FeedbackSurveyConfig.update(configData[0].id, configForm);
    } else {
      await base44.entities.FeedbackSurveyConfig.create(configForm);
    }
    queryClient.invalidateQueries({ queryKey: ['feedbackConfig'] });
    setSavingConfig(false);
  };

  const inputStyle = {
    background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
    border: 'none',
    borderBottom: `0.5px solid ${theme === 'light' ? '#CCCCCC' : '#595959'}`,
    color: t.text,
    padding: '8px 0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  };

  const cf = configForm || DEFAULT_CONFIG;

  return (
    <div>
      {/* Stats + survey button */}
      <div className="flex gap-4 mb-2 flex-wrap items-center">
        {[
          { label: 'Łączna liczba', value: feedbacks.length },
          { label: 'Śr. ocena ogólna', value: avg(ratings) + (ratings.length ? ' ★' : '') },
          { label: 'Śr. ocena artysty', value: avg(artistRatings) + (artistRatings.length ? ' ★' : '') },
          { label: 'Opublikowane', value: feedbacks.filter(f => f.is_published).length },
        ].map(stat => (
          <StatsTile key={stat.label} label={stat.label} value={stat.value} t={t} />
        ))}
        <div className="ml-auto flex flex-col items-end gap-2">
          <a
            href={surveyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-oxblood flex items-center gap-2"
            style={{ padding: '8px 16px', textDecoration: 'none' }}
          >
            <ExternalLink size={13} /> WYSTAW OPINIĘ
          </a>
          <button
            onClick={handleCopyLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: `0.5px solid ${t.border}`, color: copied ? '#16a34a' : t.muted, background: 'transparent', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'SKOPIOWANO!' : 'KOPIUJ LINK'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        {[{ id: 'reviews', label: 'Opinie' }, { id: 'config', label: 'Konfiguracja ankiety' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? t.fuchsia : t.muted,
              borderBottom: activeTab === tab.id ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: '-0.5px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {/* Sort controls */}
          <div className="flex items-center gap-1 px-4 py-2 flex-wrap" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '6px' }}>SORTUJ:</span>
            {[{ key: 'newest', label: 'Najnowsze' }, { key: 'oldest', label: 'Najstarsze' }, { key: 'highest', label: 'Najwyższa ocena' }, { key: 'lowest', label: 'Najniższa ocena' }].map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', border: `0.5px solid ${sortBy === opt.key ? t.fuchsia : t.border}`, color: sortBy === opt.key ? t.fuchsia : t.muted, background: 'transparent', cursor: 'pointer' }}>
                {opt.label}
              </button>
            ))}
          </div>
          {sortedFeedbacks.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK OPINII</p>
            </div>
          ) : sortedFeedbacks.map((fb, i) => (
            <div key={fb.id} style={{ borderBottom: i < sortedFeedbacks.length - 1 ? `0.5px solid ${t.border}` : 'none', padding: '20px' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{fb.client_name}</p>
                    {fb.artist_name && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.08em' }}>{fb.artist_name}</p>}
                    <StarDisplay value={fb.rating_overall} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{new Date(fb.created_date).toLocaleDateString('pl-PL')}</span>
                  </div>
                  {(() => {
                    const fbBooking = bookings.find(b => b.id === fb.booking_id);
                    if (!fbBooking) return null;
                    return (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.06em', marginBottom: '6px' }}>
                        {fbBooking.session_date}{fbBooking.service_name ? ` · ${fbBooking.service_name}` : ''}{fbBooking.tattoo_placement ? ` · ${fbBooking.tattoo_placement}` : ''}
                      </p>
                    );
                  })()}
                  {fb.short_review && (
                    <p style={{ color: t.text, fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>"{fb.short_review}"</p>
                  )}
                  {fb.full_review && (
                    <p style={{ color: t.muted, fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>{fb.full_review}</p>
                  )}
                  <div className="flex gap-4 flex-wrap mt-2">
                    {fb.rating_artist > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Artysta: {fb.rating_artist}★</span>}
                    {fb.rating_studio > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Studio: {fb.rating_studio}★</span>}
                    {fb.rating_cleanliness > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Czystość: {fb.rating_cleanliness}★</span>}
                    {fb.rating_value > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Cena/Jakość: {fb.rating_value}★</span>}
                  </div>
                  {fb.tattoo_photo_url && (
                    <img src={fb.tattoo_photo_url} alt="" className="mt-3 w-20 h-20 object-cover" style={{ filter: 'brightness(0.8)', borderRadius: 'var(--radius)' }} />
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish.mutate({ id: fb.id, val: !fb.is_published })}
                    title={fb.is_published ? 'Ukryj' : 'Opublikuj'}
                    style={{ background: 'none', border: `0.5px solid ${t.border}`, cursor: 'pointer', padding: '6px', color: fb.is_published ? '#16a34a' : t.muted }}
                  >
                    {fb.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  {fb.client_email && (
                    <a
                      href={`mailto:${fb.client_email}?subject=Twoja opinia w Romans Tattoo`}
                      title="Napisz email"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.border}`, padding: '6px', color: t.muted, textDecoration: 'none' }}
                    >
                      <Mail size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteFeedback.mutate(fb.id)}
                    title="Usuń"
                    style={{ background: 'none', border: `0.5px solid ${t.border}`, cursor: 'pointer', padding: '6px', color: 'var(--brand)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config tab */}
      {activeTab === 'config' && configForm && (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, padding: '32px', borderRadius: 'var(--radius)' }}>
          <div className="space-y-6">
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tekst wprowadzający</label>
              <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={cf.intro_text || ''} onChange={e => setConfigForm(f => ({ ...f, intro_text: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Wiadomość po wysłaniu opinii</label>
              <input style={inputStyle} value={cf.thank_you_text || ''} onChange={e => setConfigForm(f => ({ ...f, thank_you_text: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Temat maila zapraszającego</label>
              <input style={inputStyle} value={cf.email_subject || ''} onChange={e => setConfigForm(f => ({ ...f, email_subject: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Treść maila (użyj {'{client_name}'} i {'{link}'})</label>
              <textarea rows={5} style={{ ...inputStyle, resize: 'none' }} value={cf.email_body || ''} onChange={e => setConfigForm(f => ({ ...f, email_body: e.target.value }))} />
            </div>

            {/* Questions editor */}
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.fuchsia, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Pytania w ankiecie</p>
              <div className="space-y-2 mb-4">
                {(cf.questions || DEFAULT_QUESTIONS).map((q, idx) => (
                  <div key={q.id} style={{ border: `0.5px solid ${t.border}`, padding: '12px 16px', background: t.bg }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          style={{ ...inputStyle, fontSize: '13px' }}
                          value={q.label}
                          onChange={e => setConfigForm(f => ({ ...f, questions: f.questions.map((x, i) => i === idx ? { ...x, label: e.target.value } : x) }))}
                        />
                        <div className="flex gap-3 flex-wrap">
                          <select
                            value={q.type}
                            onChange={e => setConfigForm(f => ({ ...f, questions: f.questions.map((x, i) => i === idx ? { ...x, type: e.target.value } : x) }))}
                            style={{ background: 'transparent', border: `0.5px solid ${t.border}`, color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', padding: '4px 8px', cursor: 'pointer' }}
                          >
                            <option value="stars">⭐ Gwiazdki</option>
                            <option value="textarea">📝 Tekst (duży)</option>
                            <option value="text">✏️ Tekst (mały)</option>
                          </select>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div onClick={() => setConfigForm(f => ({ ...f, questions: f.questions.map((x, i) => i === idx ? { ...x, required: !x.required } : x) }))} style={{ width: '14px', height: '14px', border: `0.5px solid ${q.required ? t.fuchsia : t.border}`, background: q.required ? 'rgb(var(--brand-rgb) /0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              {q.required && <Check size={9} color="var(--brand)" />}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, textTransform: 'uppercase' }}>Wymagane</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div onClick={() => setConfigForm(f => ({ ...f, questions: f.questions.map((x, i) => i === idx ? { ...x, enabled: !x.enabled } : x) }))} style={{ width: '14px', height: '14px', border: `0.5px solid ${q.enabled ? '#16a34a' : t.border}`, background: q.enabled ? 'rgba(22,163,74,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              {q.enabled && <Check size={9} color="#16a34a" />}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, textTransform: 'uppercase' }}>Widoczne</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfigForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fuchsia, flexShrink: 0, padding: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Add question */}
              <div className="flex gap-2">
                {['stars', 'textarea', 'text'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setConfigForm(f => ({ ...f, questions: [...(f.questions || []), { id: `custom_${Date.now()}`, label: type === 'stars' ? 'Nowa ocena gwiazdkowa' : 'Nowe pytanie tekstowe', type, required: false, enabled: true }] }))}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', border: `0.5px solid ${t.border}`, color: t.muted, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={10} /> {type === 'stars' ? 'Gwiazdki' : type === 'textarea' ? 'Tekst długi' : 'Tekst krótki'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSaveConfig} disabled={savingConfig} className="btn-oxblood mt-4">
              {savingConfig ? 'ZAPISYWANIE...' : 'ZAPISZ KONFIGURACJĘ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}