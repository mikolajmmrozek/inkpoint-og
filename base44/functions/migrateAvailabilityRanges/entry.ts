import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ─────────────────────────────────────────────────────────────────────────
// migrateAvailabilityRanges — jednorazowa migracja dyspozycji na model zakresowy.
//
// Scala SĄSIADUJĄCE, jednorazowe (repeat = none), CAŁODNIOWE wpisy
// (bez godzin) o identycznym odcisku (artysta + typ + notatka) w jeden
// rekord z date + end_date. Zgodnie z regułami:
//  • wpisy z godzinami NIE są scalane — przy wielodniowym zakresie granice
//    godzinowe byłyby niejednoznaczne (pozostają pojedynczymi dniami),
//  • cykle (repeat ≠ none) pozostają bez zmian,
//  • wpisy już zakresowe (end_date) pozostają bez zmian,
//  • operacja jest idempotentna — ponowne uruchomienie nic nie dubluje
//    (istniejący zakres o tej samej parze dat jest pomijany).
// Usunięte rekordy źródłowe można odtworzyć z panelu (kosz / przywracanie).
//
// Payload: { dry_run: true } (domyślnie) — podgląd bez zmian,
//           { dry_run: false } — wykonanie migracji.
// Dostęp: wyłącznie zalogowany administrator.
// ─────────────────────────────────────────────────────────────────────────

function nextDay(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;

    // Wczytaj wszystkie wyjątki (stronicowanie)
    const records = [];
    let cursor = null;
    do {
      const page: any = await base44.entities.ArtistAvailability.filter(
        { type: 'exception' },
        cursor ? { sort: 'date', limit: 500, cursor } : { sort: 'date', limit: 500 }
      );
      records.push(...(page.items || []));
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);

    // Kandydaci: jednorazowe, całodniowe, bez zakresu
    const eligible = records.filter(
      (r) => r.date && (!r.repeat || r.repeat === 'none') && !r.end_date && !r.start_time && !r.end_time
    );
    const skippedHourly = records.filter(
      (r) => r.date && (!r.repeat || r.repeat === 'none') && !r.end_date && (r.start_time || r.end_time)
    ).length;
    const withRange = records.filter((r) => r.end_date);

    // Grupuj po odcisku (artysta + typ + notatka), potem ciągi sąsiadujących dat
    const byKey = new Map();
    for (const r of eligible) {
      const key = `${r.artist_id}|${r.is_available === true}|${r.note || ''}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }

    const runs = [];
    for (const list of byKey.values()) {
      const sorted = list.sort((a, b) => a.date.localeCompare(b.date));
      let run = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        if (nextDay(run[run.length - 1].date) === sorted[i].date) run.push(sorted[i]);
        else {
          if (run.length > 1) runs.push(run);
          run = [sorted[i]];
        }
      }
      if (run.length > 1) runs.push(run);
    }

    // Idempotencja: pomiń zakresy, które już istnieją (np. po przerwanej migracji)
    const planned = runs.filter((run) => {
      const first = run[0];
      const last = run[run.length - 1];
      return !withRange.some(
        (r) =>
          r.artist_id === first.artist_id &&
          r.date === first.date &&
          r.end_date === last.date &&
          (r.is_available === true) === (first.is_available === true) &&
          (r.note || '') === (first.note || '')
      );
    });

    const details = planned.map((run) => ({
      artist_id: run[0].artist_id,
      from: run[0].date,
      to: run[run.length - 1].date,
      merged_records: run.length,
    }));

    let created = 0;
    let deleted = 0;
    const errors = [];

    if (!dryRun) {
      for (const run of planned) {
        const first = run[0];
        const last = run[run.length - 1];
        try {
          await base44.entities.ArtistAvailability.create({
            artist_id: first.artist_id,
            type: 'exception',
            date: first.date,
            end_date: last.date,
            is_available: first.is_available === true,
            note: first.note || undefined,
            repeat: 'none',
          });
          created++;
          const BATCH = 5;
          for (let i = 0; i < run.length; i += BATCH) {
            const results = await Promise.allSettled(
              run.slice(i, i + BATCH).map((r) => base44.entities.ArtistAvailability.delete(r.id))
            );
            for (const res of results) {
              if (res.status === 'fulfilled') deleted++;
              else errors.push(`${first.date}: usuwanie nie powiodło się`);
            }
            if (i + BATCH < run.length) await new Promise((res) => setTimeout(res, 800));
          }
        } catch (e) {
          errors.push(`${first.date}: ${e.message}`);
        }
      }
    }

    return Response.json({
      dry_run: dryRun,
      exception_records: records.length,
      merge_candidates: runs.length,
      planned_merges: planned.length,
      created,
      deleted,
      skipped_hourly_records: skippedHourly,
      errors,
      details,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}