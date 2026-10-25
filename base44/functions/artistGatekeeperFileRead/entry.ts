import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ─────────────────────────────────────────────────────────────────────────
// artistGatekeeperFileRead — narzędzie Gatekeepera artysty do odczytu treści
// załączonych plików: zdjęcia/obrazy (JPG, PNG, WEBP, GIF), PDF, pliki
// tekstowe (txt, csv, md), arkusze (XLS, XLSX) i HTML. Wywoływane przez
// agenta na prośbę artysty; serwer weryfikuje rolę artist.
// ─────────────────────────────────────────────────────────────────────────

const MAX_FILES = 10;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'artist') {
      return Response.json({ error: 'Forbidden — narzędzie dostępne wyłącznie dla artystów' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body.file_urls)
      ? body.file_urls
      : body.file_url
        ? [body.file_url]
        : [];
    const file_urls = [...new Set(raw.map(String))]
      .filter((u: string) => /^https?:\/\//i.test(u));
    const question = String(body.question || '').trim();

    if (file_urls.length === 0) {
      return Response.json({ error: 'Podaj file_url lub file_urls (adresy https plików do odczytania)' }, { status: 400 });
    }
    if (file_urls.length > MAX_FILES) {
      return Response.json({ error: `Maksymalnie ${MAX_FILES} plików na jedno wywołanie` }, { status: 400 });
    }

    const prompt = question
      ? `Przeanalizuj załączone pliki i odpowiedz na pytanie artysty studia tattoo. Odpowiedz po polsku, zwięźle i konkretnie. Wyciągnij dokładne dane widoczne w pliku (np. z screena rozmowy: daty, kwoty, nazwy, treść wiadomości) i podaj je w czytelnej formie. Nie wymyślaj rzeczy, których nie widać w plikach. Pytanie artysty: ${question}`
      : `Opisz zawartość załączonych plików. Odpowiedz po polsku, zwięźle i konkretnie: dla zdjęć opisz co widać (przy screenach rozmów wypisz treść widocznych wiadomości, daty, kwoty), dla dokumentów (PDF/HTML/tekst) streść treść, dla arkuszy i danych (XLS/XLSX/CSV) opisz strukturę i zawartość. Nie wymyślaj rzeczy, których nie widać w plikach.`;

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