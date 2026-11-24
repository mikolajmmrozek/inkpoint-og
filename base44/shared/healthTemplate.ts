import { resolveFileUrls } from './gatekeeperFiles.ts';
import { stableStringify } from './gatekeeperConfirm.ts';

// ─────────────────────────────────────────────────────────────────────────
// Budowanie szablonu ankiety zdrowotnej z papierowego dokumentu (PDF/zdjęcie).
// Odczyt robi model, a mapowanie na sekcje HealthFormTemplate i klucze pól
// liczy serwer — dzięki temu klucze są stabilne, a brakujące w dokumencie
// sekcje pozostają bez zmian.
// ─────────────────────────────────────────────────────────────────────────

const DIACRITICS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

const SCHEMA = {
  type: 'object',
  properties: {
    section_intros: {
      type: 'object',
      properties: {
        medical: { type: 'string' },
        procedure: { type: 'string' },
        declaration: { type: 'string' },
        consents: { type: 'string' },
      },
    },
    medical_fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          required: { type: 'boolean' },
          has_description: { type: 'boolean' },
        },
      },
    },
    procedure_questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          required: { type: 'boolean' },
          has_description: { type: 'boolean' },
        },
      },
    },
    declaration_of_will: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        content: { type: 'string' },
      },
    },
    declaration_fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          placeholder: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
    },
    consent_fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          description: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
    },
  },
};

const PROMPT = `Jesteś asystentem studia tatuażu. Odczytaj załączoną ankietę zdrowotną / formularz przedzabiegowy — to zwykle skan lub zdjęcie papierowego dokumentu (PDF, JPG, PNG). Przepisz z niego DOKŁADNIE treść formularza, po polsku, bez wymyślania i bez uzupełniania brakujących sekcji.

Podziel treść na sekcje:
- medical_fields — pytania o stan zdrowia, choroby, leki, alergie, ciąże, zabiegi itp., na które klient odpowiada TAK/NIE. label = pełne pytanie lub nazwa schorzenia tak, jak w dokumencie. has_description = true, gdy przy odpowiedzi TAK dokument przewiduje miejsce na opis lub szczegóły.
- procedure_questions — pytania przedzabiegowe (np. czy klient jadł, czy pił alkohol, czy przyjmuje leki rozrzedzające krew, czy ma opryszczkę). has_description = true tylko wtedy, gdy dokument ma miejsce na opis.
- declaration_of_will — oświadczenie klienta: content = pełny tekst oświadczenia, akapity oddzielone znakiem nowej linii; label = nagłówek tej sekcji.
- declaration_fields — dodatkowe pola do wypełnienia w oświadczeniu (np. imię i nazwisko, wiek, data); label = nazwa pola, placeholder = podpowiedź, jeśli jest w dokumencie.
- consent_fields — zgody (np. zgoda na zabieg, zgoda na przetwarzanie danych, zgoda wizerunkowa): label = krótki tytuł zgody, description = pełna treść zgody.
- section_intros — wstępy lub instrukcje wyświetlane nad sekcją: medical, procedure, declaration, consents (tylko jeśli taki tekst faktycznie jest w dokumencie).

Zasady:
- required = true tylko wtedy, gdy dokument wyraźnie oznacza pole jako obowiązkowe (gwiazdka, pogrubienie, słowo „wymagane”).
- Jeżeli danej sekcji nie ma w dokumencie, zwróć pustą tablicę [] (dla declaration_of_will — pusty obiekt {}) i NIE wymyślaj żadnych pytań.
- Nie tłumacz, nie skracaj i nie poprawiaj tekstu prawnego — przepisz go wiernie.`;

export async function extractHealthTemplate(base44: any, rawFiles: string[]): Promise<any> {
  const file_urls = await resolveFileUrls(base44, rawFiles, 5);
  if (file_urls.length === 0) {
    throw new Error('Nie udało się odczytać pliku — przekaż identyfikator [Załącznik: ...] z wiadomości');
  }
  return base44.integrations.Core.InvokeLLM({
    prompt: PROMPT,
    file_urls,
    response_json_schema: SCHEMA,
  });
}

export function fieldKeyFrom(label: string, prefix: string): string {
  const slug = String(label || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => DIACRITICS[c] || c)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || prefix;
}

const norm = (s: any) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Klucz pola: pytanie o tym samym brzmieniu, które już jest w szablonie,
// zachowuje swój dotychczasowy klucz — odpowiedzi klientów pozostają powiązane.
function assignKeys(rawList: any[], currentList: any[], prefix: string, build: (key: string, label: string, item: any) => any) {
  const byLabel = new Map<string, string>();
  (currentList || []).forEach((f: any) => {
    if (f?.label && f?.field_key) byLabel.set(norm(f.label), f.field_key);
  });
  const out: any[] = [];
  for (const item of rawList || []) {
    const label = String(item?.label || '').trim();
    if (!label) continue;
    const base = byLabel.get(norm(label)) || fieldKeyFrom(label, prefix);
    let key = base;
    let n = 2;
    while (out.some((o) => o.field_key === key)) key = `${base}_${n++}`;
    out.push(build(key, label, item));
  }
  return out;
}

export function buildHealthTemplatePlan(current: any, extracted: any) {
  const cur = current || {};
  const sections: any = {};
  const labels: Record<string, string[]> = {};
  const skipped: string[] = [];

  const medical = assignKeys(extracted?.medical_fields, cur.medical_fields, 'pytanie', (key, label, item) => ({
    field_key: key, label, required: !!item?.required, has_description: item?.has_description !== false,
  }));
  if (medical.length > 0) { sections.medical_fields = medical; labels.medical_fields = medical.map((f) => f.label); }
  else skipped.push('medical_fields');

  const procedure = assignKeys(extracted?.procedure_questions, cur.procedure_questions, 'pytanie', (key, label, item) => ({
    field_key: key, label, required: !!item?.required, has_description: !!item?.has_description,
  }));
  if (procedure.length > 0) { sections.procedure_questions = procedure; labels.procedure_questions = procedure.map((f) => f.label); }
  else skipped.push('procedure_questions');

  const declarationContent = String(extracted?.declaration_of_will?.content || '').trim();
  if (declarationContent) {
    const declaration = {
      field_key: cur?.declaration_of_will?.field_key || 'declaration_of_will',
      label: String(extracted?.declaration_of_will?.label || cur?.declaration_of_will?.label || 'Oświadczenie woli').trim(),
      content: declarationContent,
      required: true,
    };
    sections.declaration_of_will = declaration;
    labels.declaration_of_will = [declaration.label];
  } else skipped.push('declaration_of_will');

  const declarationFields = assignKeys(extracted?.declaration_fields, cur.declaration_fields, 'pole', (key, label, item) => ({
    field_key: key, label, placeholder: String(item?.placeholder || '').trim(), required: !!item?.required,
  }));
  if (declarationFields.length > 0) { sections.declaration_fields = declarationFields; labels.declaration_fields = declarationFields.map((f) => f.label); }
  else skipped.push('declaration_fields');

  const consents = assignKeys(extracted?.consent_fields, cur.consent_fields, 'zgoda', (key, label, item) => ({
    field_key: key, label, description: String(item?.description || label).trim(), required: item?.required !== false,
  }));
  if (consents.length > 0) { sections.consent_fields = consents; labels.consent_fields = consents.map((f) => f.label); }
  else skipped.push('consent_fields');

  const intros = extracted?.section_intros || {};
  const introChanges: Record<string, string> = {};
  ['medical', 'procedure', 'declaration', 'consents'].forEach((k) => {
    const v = String(intros?.[k] || '').trim();
    if (v) introChanges[k] = v;
  });
  if (Object.keys(introChanges).length > 0) {
    sections.section_intros = { ...(cur.section_intros || {}), ...introChanges };
    labels.section_intros = Object.keys(introChanges);
  } else skipped.push('section_intros');

  return { sections, labels, skipped };
}

export async function planHash(sections: any): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(stableStringify(sections)));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex.slice(0, 32);
}