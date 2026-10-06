import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Edit2, Trash2, X, Upload, Loader2, CalendarPlus, ChevronUp, ChevronDown, Search } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { AnimatePresence } from 'framer-motion';
import BookingModal from '@/components/dashboard/BookingModal';
import StatsTile from '@/components/dashboard/StatsTile';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const EMPTY_FORM = {
  name: '',
  short_description: '',
  long_description: '',
  image_url: '',
  duration_minutes: '',
  price_type: 'fixed',
  price_fixed: '',
  price_min: '',
  price_max: '',
  artist_ids: [],
  hidden_from_clients: [],
  members_only: false,
  min_advance_booking: { unit: 'minutes', value: 0 },
  is_active: true,
  order: 999,
};

export default function DashboardServices() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A' };

  const [services, setServices] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | service object
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bookingService, setBookingService] = useState(null); // service to book
  const [deleteConfirm, setDeleteConfirm] = useState(null); // service to delete
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [sortKey, setSortKey] = useState('order');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const load = async () => {
    const [svc, art] = await Promise.all([
      base44.entities.Service.list('order', 100),
      base44.entities.Artist.filter({ is_active: true }),
    ]);
    setServices(svc);
    setArtists(art);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...EMPTY_FORM }); setEditing('new'); };
  const openEdit = (s) => { 
    const minAdvanceBooking = s.min_advance_booking && typeof s.min_advance_booking === 'object' 
      ? { ...EMPTY_FORM.min_advance_booking, ...s.min_advance_booking }
      : { ...EMPTY_FORM.min_advance_booking };
    setForm({ ...EMPTY_FORM, ...s, artist_ids: s.artist_ids || [], hidden_from_clients: s.hidden_from_clients || [], min_advance_booking: minAdvanceBooking });
    setEditing(s); 
  };
  const closeModal = () => setEditing(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleArtist = (id) => {
    setForm(f => ({
      ...f,
      artist_ids: f.artist_ids.includes(id)
        ? f.artist_ids.filter(x => x !== id)
        : [...f.artist_ids, id],
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploadingImage(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      price_fixed: form.price_fixed ? Number(form.price_fixed) : undefined,
      price_min: form.price_min ? Number(form.price_min) : undefined,
      price_max: form.price_max ? Number(form.price_max) : undefined,
      order: form.order ? Number(form.order) : 999,
    };
    if (editing === 'new') {
      await base44.entities.Service.create(data);
    } else {
      await base44.entities.Service.update(editing.id, data);
    }
    setSaving(false);
    closeModal();
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Service.delete(id);
    setServices(s => s.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const inp = (field, type = 'text') => ({
    type,
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] ?? '',
    onChange: e => set(field, e.target.value),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );

  const getPriceDisplay = (s) => {
    if (s.price_type === 'range') {
      if (s.price_min === 0 || s.price_max === 0) return 'BEZPŁATNA';
      if (s.price_min && s.price_max) return `${s.price_min} — ${s.price_max} PLN`;
      if (s.price_min) return `od ${s.price_min} PLN`;
    }
    if (s.price_fixed === 0) return 'BEZPŁATNA';
    if (s.price_fixed) return `${s.price_fixed} PLN`;
    return '—';
  };

  const getArtistNames = (artistIds) => {
    if (!artistIds || artistIds.length === 0) return 'Wszyscy';
    return artistIds.map(id => artists.find(a => a.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div>
      {/* Stats + new service button */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        {[
          { label: 'Wszystkich usług', value: services.length },
          { label: 'Aktywnych', value: services.filter(s => s.is_active !== false).length },
        ].map(s => (
          <StatsTile key={s.label} label={s.label} value={s.value} t={t} />
        ))}
        <div className="ml-auto">
          <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
            <Plus size={13} /> NOWA USŁUGA
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Category filter */}
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>KATEGORIA</p>
          <div className="flex flex-wrap gap-2">
            {['', 'tattoo', 'piercing', 'studio'].map(cat => {
              const active = filterCategory === cat;
              return (
                <button
                  key={cat || 'all'}
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                    color: active ? 'var(--brand)' : t.muted,
                    background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '7px 14px', cursor: 'pointer',
                  }}
                >
                  {cat === '' ? 'WSZYSTKIE' : cat.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Artist filter */}
        {artists.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ARTYSTA</p>
            <div className="flex flex-wrap gap-2">
              {[null, ...artists].map(a => {
                const active = filterArtist === (a?.id || '');
                return (
                  <button
                    key={a?.id || 'all'}
                    onClick={() => setFilterArtist(a?.id || '')}
                    className="flex items-center gap-2"
                    style={{
                      border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                      color: active ? 'var(--brand)' : t.muted,
                      background: active ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent',
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '7px 14px', cursor: 'pointer',
                    }}
                  >
                    {a?.photo_url && <img src={a.photo_url} alt={a.name} style={{ width: '18px', height: '18px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />}
                    {a ? a.name.toUpperCase() : 'WSZYSCY'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search — directly above list */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.muted, pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Szukaj usługi..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '10px 36px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }}
          onFocus={e => e.target.style.borderColor = 'var(--brand)'}
          onBlur={e => e.target.style.borderColor = t.border}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : services.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK USŁUG</p>
          <button onClick={openNew} className="mt-4 btn-oxblood" style={{ padding: '10px 24px' }}>DODAJ PIERWSZĄ USŁUGĘ</button>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {[
              { label: 'Usługa', key: 'name', span: 'col-span-4' },
              { label: 'Czas', key: 'duration_minutes', span: 'col-span-2' },
              { label: 'Cena', key: 'price_fixed', span: 'col-span-2' },
              { label: 'Artyści', key: 'artist_name', span: 'col-span-3' },
              { label: '', key: null, span: 'col-span-1' },
            ].map(({ label, key, span }) => (
              <button
                key={label || '_actions'}
                onClick={() => key && handleSort(key)}
                className={`${span} flex items-center gap-1`}
                style={{ background: 'none', border: 'none', cursor: key ? 'pointer' : 'default', padding: 0, fontFamily: 'var(--font-mono)', fontSize: '8px', color: sortKey === key ? 'var(--brand)' : t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                {label}
                {key && sortKey === key && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                {key && sortKey !== key && <ChevronUp size={10} style={{ opacity: 0.25 }} />}
              </button>
            ))}
          </div>

          {services.filter(s => {
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const matchName = s.name?.toLowerCase().includes(q);
              const matchDesc = s.short_description?.toLowerCase().includes(q);
              if (!matchName && !matchDesc) return false;
            }
            if (filterCategory && s.category !== filterCategory) return false;
            if (filterArtist && s.artist_ids?.length > 0 && !s.artist_ids.includes(filterArtist)) return false;
            return true;
          }).sort((a, b) => {
            let av = a[sortKey], bv = b[sortKey];
            if (sortKey === 'price_fixed') {
              av = a.price_type === 'fixed' ? (a.price_fixed ?? 0) : (a.price_min ?? 0);
              bv = b.price_type === 'fixed' ? (b.price_fixed ?? 0) : (b.price_min ?? 0);
            }
            if (sortKey === 'artist_name') {
              av = getArtistNames(a.artist_ids);
              bv = getArtistNames(b.artist_ids);
            }
            if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
            if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
          }).map((s, i) => (
            <div key={s.id} className="grid grid-cols-12 px-4 py-3 items-center"
              style={{ borderBottom: i < services.length - 1 ? `0.5px solid ${t.border}` : 'none', opacity: s.is_active === false ? 0.5 : 1 }}>
              {/* Image + Name */}
              <div className="col-span-4 flex items-center gap-3">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} style={{ width: '36px', height: '36px', objectFit: 'cover', flexShrink: 0, borderRadius: 'var(--radius)' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', background: 'rgb(var(--brand-rgb) /0.1)', border: `0.5px solid rgb(var(--brand-rgb) /0.2)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--brand)' }}>{s.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {s.category && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '1px 6px', border: '0.5px solid rgb(var(--brand-rgb) /0.4)', color: 'var(--brand)' }}>
                        {s.category}
                      </span>
                    )}
                    {s.short_description && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.short_description}</p>}
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted }}>
                  {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.text }}>{getPriceDisplay(s)}</p>
              </div>
              <div className="col-span-3">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getArtistNames(s.artist_ids)}
                </p>
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button onClick={() => setBookingService(s)} title="Nowa sesja" style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}><CalendarPlus size={13} /></button>
                <button onClick={() => openEdit(s)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={13} /></button>
                <button onClick={() => setDeleteConfirm(s)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń usługę"
        message={`Czy na pewno chcesz usunąć usługę "${deleteConfirm?.name}"?`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingService && (
          <BookingModal
            booking={{
              _prefill: true,
              service_id: bookingService.id,
              service_name: bookingService.name,
              ...(bookingService.artist_ids?.length === 1 ? {
                artist_id: bookingService.artist_ids[0],
                artist_name: artists.find(a => a.id === bookingService.artist_ids[0])?.name || '',
              } : {}),
            }}
            onClose={() => setBookingService(null)}
            onSaved={() => setBookingService(null)}
            t={theme === 'light'
              ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)' }
              : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)' }
            }
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={closeModal}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '40px', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {editing === 'new' ? 'NOWA USŁUGA' : 'EDYTUJ USŁUGĘ'}
                </p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                  {editing === 'new' ? 'Dodaj usługę' : form.name}
                </h3>
              </div>
              <button onClick={closeModal} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="space-y-6">
              {/* Basic info */}
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>PODSTAWOWE INFO</p>
                <div className="mb-4">{label('Nazwa *')}<input {...inp('name')} /></div>
                <div className="mb-4">
                  {label('Kategoria')}
                  <select
                    value={form.category || ''}
                    onChange={e => set('category', e.target.value || undefined)}
                    style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                  >
                    <option value="">— brak kategorii —</option>
                    <option value="tattoo">Tattoo</option>
                    <option value="piercing">Piercing</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>
                <div className="mb-4">{label('Krótki opis')}<input {...inp('short_description')} /></div>
                <div>{label('Długi opis')}
                  <textarea rows={4} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'vertical' }}
                    value={form.long_description || ''} onChange={e => set('long_description', e.target.value)}
                    onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>
              </div>

              {/* Image */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>ZDJĘCIE</p>
                {form.image_url && (
                  <div className="mb-3">
                    <img src={form.image_url} alt="preview" style={{ width: '120px', height: '80px', objectFit: 'cover', border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }} />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer" style={{ border: `0.5px solid ${t.border}`, padding: '8px 14px', display: 'inline-flex', color: t.muted, fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploadingImage ? 'WGRYWANIE...' : 'WGRAJ ZDJĘCIE'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>

              {/* Duration & Price */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>CZAS I CENA</p>
                {/* Duration sliders */}
                <div className="mb-6">
                  {label('Czas wykonania')}
                  {(() => {
                    const totalMin = Number(form.duration_minutes) || 0;
                    const hours = Math.floor(totalMin / 60);
                    const minutes = totalMin % 60;
                    const setDuration = (h, m) => set('duration_minutes', h * 60 + m);
                    return (
                      <div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: t.fuchsia, marginBottom: '14px', letterSpacing: '0.04em' }}>
                          {totalMin === 0 ? '— brak —' : `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes} min` : ''}`}
                        </p>
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Godziny: {hours}h</span>
                          </div>
                          <input
                            type="range" min={0} max={12} step={1} value={hours}
                            onChange={e => setDuration(Number(e.target.value), minutes)}
                            style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted, marginTop: '2px' }}>
                            {Array.from({length: 13}, (_, i) => <span key={i}>{i}</span>)}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Minuty: {minutes} min</span>
                          </div>
                          <input
                            type="range" min={0} max={45} step={15} value={minutes}
                            onChange={e => setDuration(hours, Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted, marginTop: '2px' }}>
                            {[0, 15, 30, 45].map(m => <span key={m}>{m}</span>)}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="mb-4">
                  {label('Typ ceny')}
                  <select
                    value={form.price_type || 'fixed'}
                    onChange={e => set('price_type', e.target.value)}
                    style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                  >
                    <option value="fixed">Stała kwota</option>
                    <option value="range">Zakres (od — do)</option>
                  </select>
                </div>
                {form.price_type === 'fixed' ? (
                  <div>
                    {label('Cena (PLN)')}
                    <input {...inp('price_fixed', 'number')} />
                    {(form.price_fixed === 0 || form.price_fixed === '0') && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      {label('Cena od (PLN)')}
                      <input {...inp('price_min', 'number')} />
                      {(form.price_min === 0 || form.price_min === '0') && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                      )}
                    </div>
                    <div>
                      {label('Cena do (PLN)')}
                      <input {...inp('price_max', 'number')} />
                      {(form.price_max === 0 || form.price_max === '0') && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Artists */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>ARTYŚCI</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginBottom: '12px' }}>Brak zaznaczenia = wszyscy artyści</p>
                <div className="flex flex-wrap gap-2">
                  {artists.map(a => {
                    const selected = form.artist_ids?.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleArtist(a.id)}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{
                          border: `0.5px solid ${selected ? 'var(--brand)' : t.border}`,
                          color: selected ? 'var(--brand)' : t.muted,
                          background: selected ? 'rgb(var(--brand-rgb) /0.06)' : 'transparent',
                          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        {a.photo_url && <img src={a.photo_url} alt={a.name} style={{ width: '20px', height: '20px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />}
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-artist client visibility */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>UKRYJ DLA KLIENTÓW</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginBottom: '12px' }}>Zaznacz artystów, dla których ta usługa ma być niewidoczna w rezerwacji online. Admin i sam artysta nadal mogą ją zapisywać.</p>
                <div className="flex flex-wrap gap-2">
                  {(form.artist_ids?.length > 0 ? artists.filter(a => form.artist_ids.includes(a.id)) : artists).map(a => {
                    const hidden = form.hidden_from_clients?.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          const current = form.hidden_from_clients || [];
                          set('hidden_from_clients', hidden ? current.filter(id => id !== a.id) : [...current, a.id]);
                        }}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{
                          border: `0.5px solid ${hidden ? t.muted : t.border}`,
                          color: hidden ? '#f97316' : t.muted,
                          background: hidden ? 'rgba(249,115,22,0.08)' : 'transparent',
                          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        {a.photo_url && <img src={a.photo_url} alt={a.name} style={{ width: '20px', height: '20px', borderRadius: 'var(--radius)', objectFit: 'cover' }} />}
                        {a.name}
                        {hidden && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#f97316', letterSpacing: '0.1em' }}>UKRYTA</span>}
                      </button>
                    );
                  })}
                  {(form.artist_ids?.length > 0 ? artists.filter(a => form.artist_ids.includes(a.id)) : artists).length === 0 && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>Najpierw dodaj artystów powyżej.</p>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px', space: 'y-4' }}>
                <div className="space-y-4">
                  {/* Active toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set('is_active', !form.is_active)}
                      className="flex items-center gap-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active ? '#16a34a' : t.muted }}
                    >
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active ? '#16a34a' : t.border}`, background: form.is_active ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.is_active && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                      </div>
                      Usługa aktywna
                    </button>
                  </div>

                  {/* Members only toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set('members_only', !form.members_only)}
                      className="flex items-center gap-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.members_only ? '#16a34a' : t.muted }}
                    >
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.members_only ? '#16a34a' : t.border}`, background: form.members_only ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.members_only && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                      </div>
                      Tylko dla zalogowanych
                    </button>
                  </div>

                  {/* Min advance booking */}
                  <div style={{ paddingTop: '12px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Minimalne wyprzedzenie rezerwacji</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        {label('Jednostka')}
                        <select
                          value={form.min_advance_booking?.unit || 'minutes'}
                          onChange={e => set('min_advance_booking', { ...(form.min_advance_booking || {}), unit: e.target.value })}
                          style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}
                        >
                          <option value="minutes">Minuty</option>
                          <option value="hours">Godziny</option>
                          <option value="days">Dni</option>
                        </select>
                      </div>
                      <div>
                        {label('Wartość')}
                        <input
                          type="number"
                          min={0}
                          max={form.min_advance_booking?.unit === 'days' ? 30 : form.min_advance_booking?.unit === 'hours' ? 999 : 999}
                          step={form.min_advance_booking?.unit === 'minutes' ? 15 : 1}
                          value={form.min_advance_booking?.value || 0}
                          onChange={e => set('min_advance_booking', { ...(form.min_advance_booking || {}), value: Number(e.target.value) })}
                          style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }}
                          onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                          onBlur={e => e.target.style.borderBottomColor = t.border}
                        />
                      </div>
                    </div>
                    {(() => {
                      const unit = form.min_advance_booking?.unit || 'minutes';
                      const val = form.min_advance_booking?.value || 0;
                      let display = val === 0 ? 'Bez wymogów' : unit === 'minutes' ? `Za ${val} minut` : unit === 'hours' ? `Za ${val} h` : `Za ${val} dni`;
                      return <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', marginTop: '8px', letterSpacing: '0.05em' }}>{display}</p>;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn-oxblood flex-1" style={{ opacity: !form.name ? 0.5 : 1 }}>
                {saving ? 'ZAPISYWANIE...' : editing === 'new' ? 'DODAJ USŁUGĘ' : 'ZAPISZ ZMIANY'}
              </button>
              <button onClick={closeModal} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}