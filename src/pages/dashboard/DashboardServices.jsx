import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, Edit2, Trash2, X, Upload, Loader2, CalendarPlus } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { AnimatePresence } from 'framer-motion';
import BookingModal from '@/components/dashboard/BookingModal';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
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
  is_active: true,
  order: 999,
};

export default function DashboardServices() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };

  const [services, setServices] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | service object
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bookingService, setBookingService] = useState(null); // service to book
  const [deleteConfirm, setDeleteConfirm] = useState(null); // service to delete

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
  const openEdit = (s) => { setForm({ ...EMPTY_FORM, ...s, artist_ids: s.artist_ids || [] }); setEditing(s); };
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
    onFocus: e => e.target.style.borderBottomColor = '#FF007F',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
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
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>OFERTA</p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Usługi</h2>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '10px 20px' }}>
          <Plus size={13} /> NOWA USŁUGA
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Wszystkich usług', value: services.length },
          { label: 'Aktywnych', value: services.filter(s => s.is_active !== false).length },
        ].map(s => (
          <div key={s.label} className="px-5 py-4" style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
            <p style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2rem', fontWeight: 400, color: t.fuchsia, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} />
        </div>
      ) : services.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK USŁUG</p>
          <button onClick={openNew} className="mt-4 btn-oxblood" style={{ padding: '10px 24px' }}>DODAJ PIERWSZĄ USŁUGĘ</button>
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }}>
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Usługa', 'Czas', 'Cena', 'Artyści', ''].map((h, i) => (
              <p key={i}
                className={i === 0 ? 'col-span-4' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-3' : 'col-span-1 text-right'}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >{h}</p>
            ))}
          </div>

          {services.map((s, i) => (
            <div key={s.id} className="grid grid-cols-12 px-4 py-3 items-center"
              style={{ borderBottom: i < services.length - 1 ? `0.5px solid ${t.border}` : 'none', opacity: s.is_active === false ? 0.5 : 1 }}>
              {/* Image + Name */}
              <div className="col-span-4 flex items-center gap-3">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} style={{ width: '36px', height: '36px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', background: 'rgba(255,0,127,0.1)', border: `0.5px solid rgba(255,0,127,0.2)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '14px', color: '#FF007F' }}>{s.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  {s.short_description && <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.short_description}</p>}
                </div>
              </div>
              <div className="col-span-2">
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted }}>
                  {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.text }}>{getPriceDisplay(s)}</p>
              </div>
              <div className="col-span-3">
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '40px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {editing === 'new' ? 'NOWA USŁUGA' : 'EDYTUJ USŁUGĘ'}
                </p>
                <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '1.8rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                  {editing === 'new' ? 'Dodaj usługę' : form.name}
                </h3>
              </div>
              <button onClick={closeModal} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="space-y-6">
              {/* Basic info */}
              <div>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>PODSTAWOWE INFO</p>
                <div className="mb-4">{label('Nazwa *')}<input {...inp('name')} /></div>
                <div className="mb-4">{label('Krótki opis')}<input {...inp('short_description')} /></div>
                <div>{label('Długi opis')}
                  <textarea rows={4} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'vertical' }}
                    value={form.long_description || ''} onChange={e => set('long_description', e.target.value)}
                    onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>
              </div>

              {/* Image */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>ZDJĘCIE</p>
                {form.image_url && (
                  <div className="mb-3">
                    <img src={form.image_url} alt="preview" style={{ width: '120px', height: '80px', objectFit: 'cover', border: `0.5px solid ${t.border}` }} />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer" style={{ border: `0.5px solid ${t.border}`, padding: '8px 14px', display: 'inline-flex', color: t.muted, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploadingImage ? 'WGRYWANIE...' : 'WGRAJ ZDJĘCIE'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>

              {/* Duration & Price */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>CZAS I CENA</p>
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
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: t.fuchsia, marginBottom: '14px', letterSpacing: '0.04em' }}>
                          {totalMin === 0 ? '— brak —' : `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes} min` : ''}`}
                        </p>
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Godziny: {hours}h</span>
                          </div>
                          <input
                            type="range" min={0} max={12} step={1} value={hours}
                            onChange={e => setDuration(Number(e.target.value), minutes)}
                            style={{ width: '100%', accentColor: '#FF007F', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between" style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, marginTop: '2px' }}>
                            {Array.from({length: 13}, (_, i) => <span key={i}>{i}</span>)}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Minuty: {minutes} min</span>
                          </div>
                          <input
                            type="range" min={0} max={45} step={15} value={minutes}
                            onChange={e => setDuration(hours, Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#FF007F', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between" style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: t.muted, marginTop: '2px' }}>
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
                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      {label('Cena od (PLN)')}
                      <input {...inp('price_min', 'number')} />
                      {(form.price_min === 0 || form.price_min === '0') && (
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                      )}
                    </div>
                    <div>
                      {label('Cena do (PLN)')}
                      <input {...inp('price_max', 'number')} />
                      {(form.price_max === 0 || form.price_max === '0') && (
                        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginTop: '4px' }}>BEZPŁATNA</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Artists */}
              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>ARTYŚCI</p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.06em', marginBottom: '12px' }}>Brak zaznaczenia = wszyscy artyści</p>
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
                          border: `0.5px solid ${selected ? '#FF007F' : t.border}`,
                          color: selected ? '#FF007F' : t.muted,
                          background: selected ? 'rgba(255,0,127,0.06)' : 'transparent',
                          fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        {a.photo_url && <img src={a.photo_url} alt={a.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />}
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => set('is_active', !form.is_active)}
                  className="flex items-center gap-2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active ? '#16a34a' : t.muted }}
                >
                  <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active ? '#16a34a' : t.border}`, background: form.is_active ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.is_active && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                  </div>
                  Usługa aktywna
                </button>
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