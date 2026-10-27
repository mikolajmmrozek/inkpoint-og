import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveFileUrls } from '../../shared/gatekeeperFiles.ts';

// ─────────────────────────────────────────────────────────────────────────
// gatekeeperFileRead — narzędzie Gatekeepera do odczytu treści plików:
// zdjęcia/obrazy (JPG, PNG, WEBP, GIF), PDF, pliki tekstowe (txt, csv, md),
// arkusze (XLS, XLSX) i HTML. Wywołane przez agenta na prośbę administratora;
// każde wywołanie weryfikuje po stronie serwera rolę admin.
// ─────────────────────────────────────────────────────────────────────────

const MAX_FILES = 10;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — narzędzie dostępne wyłącznie dla administratorów' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body.file_urls)
      ? body.file_urls
      : body.file_url
        ? [body.file_url]
        : [];
    // Załączniki z prywatnego magazynu (file_uri) są podpisywane na serwerze —
    // pliki nie mają publicznych adresów.
    const file_urls = await resolveFileUrls(base44, raw, MAX_FILES);
    const question = String(body.question || '').trim();

    if (file_urls.length === 0) {
      return Response.json({ error: 'Podaj file_url lub file_urls (adresy lub identyfikatory plików do odczytania)' }, { status: 400 });
    }
    if (file_urls.length > MAX_FILES) {
      return Response.json({ error: `Maksymalnie ${MAX_FILES} plików na jedno wywołanie` }, { status: 400 });
    }

    const prompt = question
      ? `Przeanalizuj załączone pliki i odpowiedz na pytanie administratora studia tattoo. Odpowiedz po polsku, zwięźle i konkretnie. Nie wymyślaj rzeczy, których nie widać w plikach. Pytanie administratora: ${question}`
      : `Opisz zawartość załączonych plików. Odpowiedz po polsku, zwięźle i konkretnie: dla zdjęć opisz co widać, dla dokumentów (PDF/HTML/tekst) streść treść, dla arkuszy i danych (XLS/XLSX/CSV) opisz strukturę i zawartość. Nie wymyślaj rzeczy, których nie widać w plikach.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls,
    });

    const analysis = typeof result === 'string'
      ? result
      : result?.response || result?.text || result?.content || JSON.stringify(result);

    return Response.json({ file_urls, question: question || null, analysis });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Błąd odczytu pliku' }, { status: 500 });
  }
}