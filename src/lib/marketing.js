import { base44 } from '@/api/base44Client';

export const DEFAULT_FILTERS = {
  service_categories: [],
  workshop: 'any',
  shop_order: 'any',
  recency: 'any',
  visits: 'any',
  adult: 'any',
  account: 'any',
};

export const SERVICE_CATEGORIES = [
  { key: 'tattoo', label: 'Tatuaż' },
  { key: 'piercing', label: 'Piercing' },
  { key: 'studio', label: 'Studio' },
];

export const FILTER_ROWS = [
  {
    key: 'workshop', label: 'Warsztaty i oferty',
    options: [{ key: 'any', label: 'Dowolnie' }, { key: 'yes', label: 'Zapisani' }, { key: 'no', label: 'Bez zapisu' }],
  },
  {
    key: 'shop_order', label: 'Zamówienie w sklepie',
    options: [{ key: 'any', label: 'Dowolnie' }, { key: 'yes', label: 'Kupowali' }, { key: 'no', label: 'Bez zakupu' }],
  },
  {
    key: 'recency', label: 'Ostatnia usługa',
    options: [
      { key: 'any', label: 'Dowolnie' }, { key: 'month', label: 'Miesiąc' }, { key: 'quarter', label: 'Kwartał' },
      { key: 'half_year', label: 'Pół roku' }, { key: 'year', label: 'Rok' }, { key: 'older', label: 'Dawniej' },
    ],
  },
  {
    key: 'visits', label: 'Częstotliwość',
    options: [{ key: 'any', label: 'Dowolnie' }, { key: 'one_time', label: 'Raz' }, { key: 'returning', label: 'Powracający' }],
  },
  {
    key: 'adult', label: 'Wiek',
    options: [{ key: 'any', label: 'Dowolnie' }, { key: 'adult', label: 'Pełnoletni' }, { key: 'minor', label: 'Niepełnoletni' }],
  },
  {
    key: 'account', label: 'Konto w aplikacji',
    options: [
      { key: 'any', label: 'Dowolnie' }, { key: 'with', label: 'Ma konto' },
      { key: 'without', label: 'Bez konta' }, { key: 'never_login', label: 'Nigdy się nie zalogował' },
    ],
  },
];

export const RECENCY_LABELS = {
  month: 'ostatni miesiąc', quarter: 'ostatni kwartał', half_year: 'ostatnie pół roku', year: 'ostatni rok', older: 'dawniej niż rok',
};

export const BLOCK_TYPES = [
  { key: 'heading', label: 'Nagłówek' },
  { key: 'text', label: 'Akapit' },
  { key: 'button', label: 'Przycisk' },
  { key: 'image', label: 'Zdjęcie' },
  { key: 'divider', label: 'Linia' },
  { key: 'spacer', label: 'Odstęp' },
];

export const newBlock = (type) => {
  if (type === 'heading') return { type, text: 'Nowy nagłówek', align: 'left' };
  if (type === 'text') return { type, text: 'Treść akapitu.', align: 'left' };
  if (type === 'button') return { type, text: 'Zarezerwuj termin', url: '{{app_url}}/booking', align: 'left' };
  if (type === 'image') return { type, image_url: '', text: 'Zdjęcie', align: 'center' };
  return { type };
};

export const emptyCampaign = (userName) => ({
  name: '',
  subject: '',
  preheader: '',
  blocks: [
    { type: 'heading', text: 'Cześć {{first_name}}', align: 'left' },
    { type: 'text', text: 'Napisz tutaj, co chcemy przekazać klientowi.', align: 'left' },
    { type: 'button', text: 'Zarezerwuj termin', url: '{{app_url}}/booking', align: 'left' },
  ],
  layout: 'classic',
  hero_image_url: '',
  font_scheme: 'original',
  heading_size: 34,
  body_size: 15,
  excluded_emails: [],
  filters: { ...DEFAULT_FILTERS },
  status: 'draft',
  notes: '',
  ai_generations: 0,
  author_name: userName || '',
});

export const STARTER_TEMPLATES = [
  {
    name: 'Nowy termin warsztatów', category: 'workshop', layout: 'classic', order: 1,
    description: 'Zaproszenie na warsztaty z konkretną datą i przyciskiem zapisu.',
    subject: 'Nowy termin warsztatów w Romans Tattoo',
    preheader: 'Zapisy właśnie ruszyły — liczba miejsc ograniczona.',
    blocks: [
      { type: 'heading', text: 'Nowy termin warsztatów', align: 'left' },
      { type: 'text', text: 'Cześć {{first_name}}, otwieramy zapisy na kolejną edycję warsztatów. Pracujemy w małej grupie, więc każde miejsce ma znaczenie.', align: 'left' },
      { type: 'divider' },
      { type: 'text', text: 'Termin: [data]\nMiejsce: studio Romans Tattoo, Wolsztyn', align: 'left' },
      { type: 'button', text: 'Zapisz się', url: '{{app_url}}/wydarzenia', align: 'left' },
    ],
  },
  {
    name: 'Powracający klienci', category: 'reactivation', layout: 'editorial', order: 2,
    description: 'Ciepłe zaproszenie do kolejnej sesji dla osób, które już nas odwiedziły.',
    subject: '{{first_name}}, czas na kolejny projekt?',
    preheader: 'Twoje miejsce w studio czeka.',
    blocks: [
      { type: 'heading', text: 'Wracasz?', align: 'left' },
      { type: 'text', text: 'Cześć {{first_name}}, minęło trochę czasu od Twojej ostatniej wizyty. Jeśli myślisz o nowym projekcie, chętnie go zaplanujemy.', align: 'left' },
      { type: 'text', text: 'Napisz do nas albo od razu wybierz termin w kalendarzu.', align: 'left' },
      { type: 'button', text: 'Zarezerwuj termin', url: '{{app_url}}/booking', align: 'left' },
    ],
  },
  {
    name: 'Nowości w sklepie', category: 'shop', layout: 'classic', order: 3,
    description: 'Krótka zapowiedź nowej kolekcji z przyciskiem do sklepu.',
    subject: 'Nowa kolekcja jest już w sklepie',
    preheader: 'Kolczyki i ubrania prosto ze studia.',
    blocks: [
      { type: 'heading', text: 'Nowości w sklepie', align: 'left' },
      { type: 'text', text: 'Cześć {{first_name}}, wrzuciliśmy nową kolekcję. Zajrzyj, zanim zniknie.', align: 'left' },
      { type: 'button', text: 'Zobacz kolekcję', url: '{{app_url}}/sklep', align: 'left' },
    ],
  },
  {
    name: 'Newsletter studia', category: 'newsletter', layout: 'minimal', order: 4,
    description: 'Spokojna wiadomość o tym, co dzieje się w studiu.',
    subject: 'Co słychać w Romans Tattoo',
    preheader: 'Krótkie podsumowanie ostatnich tygodni.',
    blocks: [
      { type: 'heading', text: 'Co słychać w studiu', align: 'left' },
      { type: 'text', text: 'Cześć {{first_name}},', align: 'left' },
      { type: 'text', text: 'Opowiedz tutaj o ostatnich projektach, nowych gościach i planach na najbliższe tygodnie.', align: 'left' },
      { type: 'divider' },
      { type: 'button', text: 'Odwiedź studio', url: '{{app_url}}/contact', align: 'left' },
    ],
  },
];

export const AI_DEFAULT_PREFS = {
  key: 'default',
  tone: 'warm',
  length: 'short',
  emoji: false,
  cta_style: 'booking',
  signature: 'Do zobaczenia w studiu,\nRomans Tattoo',
  extra_notes: '',
};

export const TONE_LABELS = { warm: 'Ciepły', professional: 'Profesjonalny', bold: 'Wyrazisty', playful: 'Swobodny' };
export const LENGTH_LABELS = { short: 'Krótka', medium: 'Średnia', long: 'Długa' };
export const CTA_LABELS = { booking: 'Rezerwacja', shop: 'Sklep', workshop: 'Warsztaty', contact: 'Kontakt', none: 'Bez przycisku' };

export const filterSummary = (filters = {}) => {
  const parts = [];
  if (filters.service_categories?.length) {
    parts.push(filters.service_categories.map(key => SERVICE_CATEGORIES.find(item => item.key === key)?.label).filter(Boolean).join(' / '));
  }
  FILTER_ROWS.forEach(row => {
    if (!filters[row.key] || filters[row.key] === 'any') return;
    parts.push(`${row.label}: ${row.options.find(option => option.key === filters[row.key])?.label}`);
  });
  return parts.length ? parts.join(' · ') : 'Wszyscy klienci z adresem e-mail';
};

export const loadAiPreferences = async () => {
  const { items } = await base44.entities.MarketingAiPreference.filter({ key: 'default' }, { limit: 1 });
  return { ...AI_DEFAULT_PREFS, ...(items[0] || {}) };
};

const preferenceMemory = (prefs) => [
  `Ton: ${TONE_LABELS[prefs.tone] || prefs.tone}`,
  `Długość: ${LENGTH_LABELS[prefs.length] || prefs.length}`,
  `Emoji: ${prefs.emoji ? 'tak' : 'nie'}`,
  `Wezwanie: ${CTA_LABELS[prefs.cta_style] || prefs.cta_style}`,
  prefs.extra_notes ? `Wytyczne: ${prefs.extra_notes}` : '',
].filter(Boolean).join('. ').slice(0, 600);

// Preferencje trafiają do wspólnej pamięci Gatekeepera admina (skill pamięci), więc
// asystent panelu zna stały styl komunikacji marketingowej studia.
export const saveAiPreferences = async (prefs, userName) => {
  const payload = {
    key: 'default',
    tone: prefs.tone,
    length: prefs.length,
    emoji: Boolean(prefs.emoji),
    cta_style: prefs.cta_style,
    signature: prefs.signature || '',
    extra_notes: prefs.extra_notes || '',
    updated_by_name: userName || '',
  };
  const { items } = await base44.entities.MarketingAiPreference.filter({ key: 'default' }, { limit: 1 });
  const record = items[0]
    ? await base44.entities.MarketingAiPreference.update(items[0].id, payload)
    : await base44.entities.MarketingAiPreference.create(payload);
  await base44.functions.invoke('gatekeeperMemory', {
    action: 'save',
    agent_name: 'Gatekeeper',
    memory_key: 'marketing_preferences',
    category: 'preference',
    content: preferenceMemory(payload),
  }).catch(() => {});
  return record;
};