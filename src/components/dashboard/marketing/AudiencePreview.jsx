import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { fieldStyle, labelStyle } from '@/lib/marketingUi';

const CATEGORY_LABELS = { tattoo: 'Tatuaż', piercing: 'Piercing', studio: 'Studio' };
const PAGE_SIZE = 100;

const SORTS = [
  { key: 'last_desc', label: 'Ostatnia usługa — najnowsza' },
  { key: 'last_asc', label: 'Ostatnia usługa — najstarsza' },
  { key: 'name', label: 'Nazwa A–Z' },
  { key: 'visits', label: 'Wizyty — najwięcej' },
  { key: 'account', label: 'Konto w aplikacji' },
];

const VIEWS = [
  { key: 'all', label: 'Wszyscy' },
  { key: 'included', label: 'Zaznaczeni' },
  { key: 'excluded', label: 'Wyłączeni' },
];

export default function AudiencePreview({ filters, t, onCount, excluded = [], onExcludedChange, onSample }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('last_desc');
  const [view, setView] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      base44.functions.invoke('marketingAudience', { filters })
        .then(response => {
          if (cancelled) return;
          setData(response.data);
        })
        .catch(() => { if (!cancelled) setError('Nie udało się policzyć segmentu.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [JSON.stringify(filters)]);

  const recipients = data?.recipients || [];
  const excludedSet = useMemo(() => new Set(excluded.map(email => String(email).toLowerCase())), [excluded]);
  const included = recipients.filter(person => !excludedSet.has(person.email));
  const includedCount = included.length;

  useEffect(() => {
    if (data) onCount?.(includedCount);
  }, [data, includedCount]);

  useEffect(() => {
    if (included[0]) onSample?.({ first_name: included[0].first_name, name: included[0].name });
  }, [data, excluded.length]);

  useEffect(() => { setPage(1); }, [search, sort, view, JSON.stringify(filters)]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = recipients;
    if (view === 'included') list = list.filter(person => !excludedSet.has(person.email));
    if (view === 'excluded') list = list.filter(person => excludedSet.has(person.email));
    if (query) {
      list = list.filter(person =>
        `${person.name} ${person.email} ${person.phone || ''}`.toLowerCase().includes(query)
      );
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));
    if (sort === 'last_asc') sorted.sort((a, b) => (a.last_service || '9999').localeCompare(b.last_service || '9999'));
    if (sort === 'last_desc') sorted.sort((a, b) => (b.last_service || '').localeCompare(a.last_service || ''));
    if (sort === 'visits') sorted.sort((a, b) => (b.visits || 0) - (a.visits || 0));
    if (sort === 'account') sorted.sort((a, b) => Number(b.has_account) - Number(a.has_account));
    return sorted;
  }, [recipients, search, sort, view, excludedSet]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setExcluded = (next) => onExcludedChange?.(next);
  const toggle = (email) => {
    const key = String(email).toLowerCase();
    setExcluded(excludedSet.has(key) ? excluded.filter(item => String(item).toLowerCase() !== key) : [...excluded, key]);
  };
  const selectPage = (include) => {
    const emails = pageRows.map(person => person.email);
    if (include) setExcluded(excluded.filter(item => !emails.includes(String(item).toLowerCase())));
    else setExcluded([...new Set([...excluded, ...emails])]);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-px bg-oxblood animate-pulse" /></div>;
  }
  if (error) {
    return <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)' }}>{error}</p>;
  }
  if (!data) return null;

  const stats = data.stats;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Odbiorcy', value: stats.matched },
          { label: 'Ma konto', value: stats.with_account },
          { label: 'Bez konta', value: stats.without_account },
          { label: 'Nigdy nie logowani', value: stats.never_logged_in },
          { label: 'Powracający', value: stats.returning },
          { label: 'Jednorazowi', value: stats.one_time },
          { label: 'Warsztaty', value: stats.workshop },
          { label: 'Sklep', value: stats.shop_order },
        ].map(item => (
          <div key={item.label} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: t.text }}>{item.value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginTop: '4px' }}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span style={labelStyle(t)}>Podgląd odbiorców</span>
        <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>
          <span>
            {includedCount} z {stats.matched} zaznaczonych{excluded.length > 0 ? ` · ${excluded.length} wyłączonych` : ''}
            {data.truncated ? ` · pierwsze ${recipients.length}` : ''}
          </span>
          {excluded.length > 0 && (
            <button type="button" onClick={() => setExcluded([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', textDecoration: 'underline', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
              Przywróć wszystkich
            </button>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <div style={{ position: 'relative' }}>
          <Search size={12} color={t.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Szukaj: imię, e-mail, telefon"
            style={{ ...fieldStyle(t), paddingLeft: 30 }}
          />
        </div>
        <select value={sort} onChange={event => setSort(event.target.value)} style={{ ...fieldStyle(t), cursor: 'pointer' }}>
          {SORTS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <div className="flex gap-1">
          {VIEWS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              className="flex-1"
              style={{
                background: view === option.key ? 'rgb(var(--brand-rgb) /0.12)' : 'transparent',
                border: `0.5px solid ${view === option.key ? 'var(--brand)' : t.border}`,
                borderRadius: 'var(--radius)', padding: '9px 6px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase',
                color: view === option.key ? 'var(--brand)' : t.muted,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => selectPage(true)} style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '5px 9px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>
            <Check size={9} className="inline mr-1" />Zaznacz stronę
          </button>
          <button type="button" onClick={() => selectPage(false)} style={{ background: 'none', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '5px 9px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>
            Wyłącz stronę
          </button>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>
          {rows.length === 0 ? 'brak wyników' : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} z ${rows.length}`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)' }}>
          <Users size={13} color={t.muted} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>Żaden klient nie spełnia tych kryteriów.</p>
        </div>
      ) : (
        <>
          <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: t.card }}>
                  {['', 'Klient', 'Ostatnia usługa', 'Wizyty', 'Kategorie', 'Konto', 'Zgoda'].map((head, index) => (
                    <th key={`${head}-${index}`} className="text-left px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(person => {
                  const isExcluded = excludedSet.has(person.email);
                  return (
                    <tr key={person.email} style={{ opacity: isExcluded ? 0.45 : 1 }}>
                      <td className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggle(person.email)}
                          aria-label={`Włącz lub wyłącz ${person.name}`}
                          style={{ accentColor: 'var(--brand)', width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: t.text }}>{person.name}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted }}>{person.email}</p>
                      </td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>{person.last_service || '—'}</td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.text, borderBottom: `0.5px solid ${t.border}` }}>{person.visits}</td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                        {person.categories.map(key => CATEGORY_LABELS[key] || key).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', color: t.muted, borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                        {person.has_account ? (person.never_logged_in ? 'Konto · brak logowania' : 'Konto') : 'Bez konta'}
                      </td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', color: person.consent === 'granted' ? '#16a34a' : person.consent === 'unsubscribed' ? 'var(--brand)' : '#f59e0b', borderBottom: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                        {person.consent === 'granted' ? 'Tak' : person.consent === 'unsubscribed' ? 'Wypis' : person.consent === 'denied' ? 'Nie' : 'Domyślnie'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Poprzednia strona" style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'default' : 'pointer', color: t.muted, opacity: currentPage === 1 ? 0.3 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: t.muted }}>
                STRONA {currentPage} / {pages}
              </span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pages} aria-label="Następna strona" style={{ background: 'none', border: 'none', cursor: currentPage === pages ? 'default' : 'pointer', color: t.muted, opacity: currentPage === pages ? 0.3 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}