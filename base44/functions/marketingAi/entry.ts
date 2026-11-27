import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ALLOWED = ['heading', 'text', 'button', 'image', 'divider', 'spacer'];

const TONES = {
  warm: 'ciepły, ludzki, bez korporacyjnego tonu',
  professional: 'rzeczowy i profesjonalny, ale nie sztywny',
  bold: 'wyrazisty, pewny siebie, mocne pierwsze zdanie',
  playful: 'swobodny, lekki, z przymrużeniem oka',
};

const LENGTHS = {
  short: 'bardzo krótka: 2-3 krótkie akapity, maksymalnie 6 bloków',
  medium: 'średnia: 4-5 akapitów, maksymalnie 9 bloków',
  long: 'rozbudowana: 6-8 akapitów, maksymalnie 12 bloków',
};

const CTAS = {
  booking: 'zachęć do rezerwacji terminu',
  shop: 'zachęć do zajrzenia do sklepu',
  workshop: 'zachęć do zapisu na warsztaty',
  contact: 'zachęć do kontaktu ze studiem',
  none: 'bez przycisku akcji',
};

const cleanBlocks = (blocks) => {
  const list = Array.isArray(blocks) ? blocks : [];
  return list
    .filter((block) => block && ALLOWED.includes(block.type))
    .map((block) => ({
      type: block.type,
      ...(block.text ? { text: String(block.text).slice(0, 600) } : {}),
      ...(block.url ? { url: String(block.url).slice(0, 300) } : {}),
      ...(block.image_url ? { image_url: String(block.image_url).slice(0, 500) } : {}),
      ...(block.align === 'center' ? { align: 'center' } : {}),
    }))
    .slice(0, 14);
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
    if (!brief) return Response.json({ error: 'Opisz, o czym ma być wiadomość.' }, { status: 400 });

    const mode = body.mode === 'layout' ? 'layout' : 'copy';
    const prefs = body.preferences || {};
    const tone = TONES[prefs.tone] || TONES.warm;
    const length = LENGTHS[prefs.length] || LENGTHS.short;
    const cta = CTAS[prefs.cta_style] || CTAS.booking;
    const audience = typeof body.audience_summary === 'string' ? body.audience_summary.slice(0, 400) : '';
    const currentBlocks = Array.isArray(body.current_blocks) ? body.current_blocks.slice(0, 14) : [];

    const prompt = [
      'Jesteś copywriterem studia tatuażu i piercingu Romans Tattoo w Wolsztynie (Polska).',
      'Piszesz maila marketingowego do klientów studia. Pisz po polsku, naturalnie, konkretnie, bez przesadnej sprzedażowości i bez obietnic medycznych.',
      '',
      `Ton: ${tone}.`,
      `Długość: ${length}.`,
      `Emoji: ${prefs.emoji ? 'możesz użyć maksymalnie dwóch, dyskretnie' : 'nie używaj emoji ani emotikon'}.`,
      `Wezwanie do działania: ${cta}.`,
      prefs.signature ? `Na końcu wiadomości dodaj podpis jako osobny akapit: ${String(prefs.signature).slice(0, 200)}.` : '',
      prefs.extra_notes ? `Stałe wytyczne studia: ${String(prefs.extra_notes).slice(0, 400)}.` : '',
      audience ? `Grupa odbiorców: ${audience}.` : '',
      '',
      mode === 'layout'
        ? `Ułóż istniejącą treść w czytelne bloki wiadomości. Nie zmieniaj sensu, możesz skrócić i uporządkować. Istniejąca treść:\n${JSON.stringify(currentBlocks)}`
        : 'Napisz nową wiadomość od zera.',
      '',
      `Polecenie od studia: ${brief.slice(0, 1200)}`,
      '',
      'Zasady budowy:',
      '- "subject": temat do 60 znaków, bez emoji, bez słowa "newsletter".',
      '- "preheader": jedno zdanie do 90 znaków, dopełnia temat.',
      '- "blocks": lista bloków w kolejności wyświetlania. Dozwolone typy: heading, text, button, image, divider, spacer.',
      '- Zawsze zaczynaj od jednego bloku "heading" (krótki, mocny tytuł) i dodaj 1-3 bloki "text".',
      '- Jeśli wezwanie do działania nie jest wyłączone, dodaj dokładnie jeden blok "button" z tekstem akcji (2-4 słowa) i url: {{app_url}}/booking, {{app_url}}/sklep, {{app_url}}/wydarzenia lub {{app_url}}/contact — zależnie od celu.',
      '- Nie dodawaj bloków "image" bez konkretnego adresu zdjęcia; zamiast tego użyj "divider" lub "spacer".',
      '- W treści możesz użyć {{first_name}} jako osobistego zwrotu, maksymalnie raz.',
      '- Nie wymyślaj cen, dat, rabatów ani numerów telefonów, których nie ma w poleceniu.',
    ].filter(Boolean).join('\n');

    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        preheader: { type: 'string' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              text: { type: 'string' },
              url: { type: 'string' },
              image_url: { type: 'string' },
              align: { type: 'string' },
            },
            required: ['type'],
          },
        },
      },
      required: ['subject', 'preheader', 'blocks'],
    };

    const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    const result = {
      subject: String(raw?.subject || '').slice(0, 160),
      preheader: String(raw?.preheader || '').slice(0, 200),
      blocks: cleanBlocks(raw?.blocks),
    };
    if (result.blocks.length === 0) {
      return Response.json({ error: 'AI nie zwróciło treści. Spróbuj ponownie.' }, { status: 502 });
    }

    const history = await base44.asServiceRole.entities.MarketingAiHistory.create({
      campaign_id: body.campaign_id || '',
      campaign_name: body.campaign_name || '',
      action: mode,
      brief,
      tone: prefs.tone || 'warm',
      preferences_used: [
        `Ton: ${prefs.tone || 'warm'}`,
        `Długość: ${prefs.length || 'short'}`,
        `Emoji: ${prefs.emoji ? 'tak' : 'nie'}`,
        `CTA: ${prefs.cta_style || 'booking'}`,
      ].join(' · '),
      result,
      applied: false,
      author_name: user.full_name || user.email || '',
    });

    return Response.json({ result, history_id: history?.id || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}