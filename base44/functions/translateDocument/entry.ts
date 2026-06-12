import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LANG_NAMES = {
  pl: 'Polish', en: 'English', de: 'German', fr: 'French',
  es: 'Spanish', it: 'Italian', uk: 'Ukrainian', ru: 'Russian',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_type, entity_id, target_lang } = await req.json();

    if (!entity_type || !entity_id || !target_lang) {
      return Response.json({ error: 'Missing required params: entity_type, entity_id, target_lang' }, { status: 400 });
    }

    if (target_lang === 'pl') {
      // Return original — no translation needed
      let doc;
      if (entity_type === 'terms') {
        const arr = await base44.entities.TermsAndConditions.filter({ id: entity_id });
        doc = arr[0];
      } else {
        const arr = await base44.entities.Instruction.filter({ id: entity_id });
        doc = arr[0];
      }
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });
      return Response.json({ title: doc.title, content: doc.content, cached: true });
    }

    // Load document
    let doc;
    if (entity_type === 'terms') {
      const arr = await base44.entities.TermsAndConditions.filter({ id: entity_id });
      doc = arr[0];
    } else {
      const arr = await base44.entities.Instruction.filter({ id: entity_id });
      doc = arr[0];
    }

    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

    // Check cache
    const existing = doc.translations?.[target_lang];
    if (existing?.title && existing?.content) {
      return Response.json({ title: existing.title, content: existing.content, cached: true });
    }

    // Translate via LLM
    const langName = LANG_NAMES[target_lang] || target_lang;
    const prompt = `Translate the following studio document to ${langName}.
Preserve all HTML formatting tags exactly as they are. Only translate the text content between tags.
Return a JSON object with two fields: "title" (translated title string) and "content" (translated content string with original HTML preserved).

Title: ${doc.title || ''}

Content:
${doc.content || ''}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
    });

    const translated = { title: result.title || doc.title, content: result.content || doc.content };

    // Save to cache
    const updatedTranslations = { ...(doc.translations || {}), [target_lang]: translated };
    if (entity_type === 'terms') {
      await base44.asServiceRole.entities.TermsAndConditions.update(doc.id, { translations: updatedTranslations });
    } else {
      await base44.asServiceRole.entities.Instruction.update(doc.id, { translations: updatedTranslations });
    }

    return Response.json({ ...translated, cached: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});