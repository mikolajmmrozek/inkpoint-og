import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { slugify, formatSessionDate, timeToMinutes } from '@/lib/events';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' };

const emptySession = () => ({ date: '', start_time: '10:00', end_time: '16:00', capacity: 10, leader_ids: [], note: '' });

export default function EventEditorModal({ event, categories, artists, theme, onClose, onSaved }) {
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.5)', field: '#FAFAFA' }
    : { bg: '#0A0A0A', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.5)', field: 'rgba(255,255,255,0.04)' };

  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    slug: event?.slug || '',
    category_id: event?.category_id || '',
    main_image_url: event?.main_image_url || '',
    gallery_images: event?.gallery_images || [],
    video_urls: event?.video_urls || [],
    short_description: event?.short_description || '',
    full_description: event?.full_description || '',
    program: event?.program || '',
    requirements: event?.requirements || '',
    materials: event?.materials || '',
    organizer_info: event?.organizer_info || '',
    leader_ids: event?.leader_ids || [],
    price: event?.price ?? 0,
    location: event?.location || '',
    min_participants: event?.min_participants ?? 0,
    status: event?.status || 'draft',
    order: event?.order ?? 999,
  }));
  const [sessions, setSessions] = useState([]);
  const [removedSessions, setRemovedSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (!event?.id) {
      setSessions([emptySession()]);
      return;
    }
    base44.entities.EventSession.filter({ event_id: event.id }).then(list => {
      setSessions(list.length > 0
        ? list.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(s => ({
          id: s.id,
          date: s.date || '',
          start_time: s.start_time || '10:00',
          end_time: s.end_time || '',
          capacity: s.capacity ?? 10,
          leader_ids: s.leader_ids || [],
          note: s.note || '',
          status: s.status || 'scheduled',
        }))
        : [emptySession()]);
    });
  }, [event?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSession = (index, patch) => setSessions(list => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const leaderIds = useMemo(() => {
    const ids = new Set(form.leader_ids || []);
    sessions.forEach(s => (s.leader_ids || []).forEach(id => ids.add(id)));
    return [...ids];
  }, [form.leader_ids, sessions]);

  // Ostrzeżenie o kolizjach z indywidualnymi sesjami prowadzących.
  useEffect(() => {
    const dates = [...new Set(sessions.map(s => s.date).filter(Boolean))];
    if (leaderIds.length === 0 || dates.length === 0) { setConflicts([]); return; }
    let cancelled = false;
    base44.entities.Booking.filter({ artist_id: { $in: leaderIds }, session_date: { $in: dates } })
      .then(rows => {
        if (cancelled) return;
        const found = [];
        sessions.forEach(s => {
          if (!s.date || !s.start_time) return;
          const start = timeToMinutes(s.start_time);
          const end = s.end_time ? timeToMinutes(s.end_time) : start + 120;
          rows.filter(b => b.session_date === s.date && b.status !== 'cancelled').forEach(b => {
            const bStart = timeToMinutes(b.session_time);
            const bEnd = b.session_end_time ? timeToMinutes(b.session_end_time) : bStart + (b.session_duration || 60);
            const ids = (s.leader_ids?.length ? s.leader_ids : form.leader_ids) || [];
            if (ids.includes(b.artist_id) && start < bEnd && bStart < end) {
              found.push(`${formatSessionDate(s.date, false)} ${s.start_time}: ${b.client_name} (${b.artist_name || 'artysta'})`);
            }
          });
        });
        setConflicts(found);
      })
      .catch(() => setConflicts([]));
    return () => { cancelled = true; };
  }, [sessions, leaderIds.join(',')]);

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      return res.file_url;
    } finally {
      setUploading(false);
    }
  };

  const handleMainUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    set('main_image_url', url);
  };

  const handleGalleryUpload = async (e) => {
    const files = [...(e.target.files || [])];
    if (files.length === 0) return;
    const urls = [];
    for (const file of files) urls.push(await uploadImage(file));
    set('gallery_images', [...(form.gallery_images || []), ...urls]);
  };

  const save = async () => {
    setError('');
    if (!form.title.trim()) { setError('Podaj tytuł wydarzenia.'); return; }
    const validSessions = sessions.filter(s => s.date);
    setSaving(true);
    try {
      const category = categories.find(c => c.id === form.category_id);
      const payload = {
        ...form,
        title: form.title.trim(),
        slug: slugify(form.slug || form.title),
        category_name: category?.name || '',
        leader_names: artists.filter(a => (form.leader_ids || []).includes(a.id)).map(a => a.name),
        price: Number(form.price) || 0,
        min_participants: Number(form.min_participants) || 0,
        order: Number(form.order) || 999,
      };

      let saved;
      if (event?.id) {
        saved = await base44.entities.Event.update(event.id, payload);
      } else {
        saved = await base44.entities.Event.create(payload);
      }

      const keptIds = [];
      for (const s of validSessions) {
        const sessionPayload = {
          event_id: saved.id,
          event_title: saved.title,
          date: s.date,
          start_time: s.start_time || '',
          end_time: s.end_time || '',
          capacity: Number(s.capacity) || 0,
          leader_ids: s.leader_ids?.length ? s.leader_ids : (form.leader_ids || []),
          note: s.note || '',
          status: s.status || 'scheduled',
          min_participants: Number(form.min_participants) || 0,
          location: form.location || '',
        };
        if (s.id) {
          await base44.entities.EventSession.update(s.id, sessionPayload);
          keptIds.push(s.id);
        } else {
          const created = await base44.entities.EventSession.create(sessionPayload);
          keptIds.push(created.id);
        }
      }

      const toRemove = sessions.filter(s => s.id && !keptIds.includes(s.id)).map(s => s.id).concat(removedSessions);
      for (const id of toRemove) {
        await base44.functions.invoke('manageEventCalendar', { action: 'delete_session', session_id: id }).catch(() => {});
        await base44.entities.EventSession.delete(id).catch(() => {});
      }

      if (saved.status === 'published' || validSessions.length > 0) {
        await base44.functions.invoke('manageEventCalendar', { action: 'sync_event', event_id: saved.id }).catch(() => {});
      }

      onSaved();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Nie udało się zapisać wydarzenia.');
    } finally {
      setSaving(false);
    }
  };

  const input = {
    width: '100%', background: t.field, border: `0.5px solid ${t.border}`, color: t.text,
    padding: '9px 10px', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', borderRadius: 'var(--radius)',
  };
  const label = { ...mono, fontSize: '8px', color: t.muted, display: 'block', marginBottom: '4px' };
  const sectionTitle = { ...mono, fontSize: '9px', color: 'var(--brand)', marginBottom: '12px' };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '26px' }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p style={{ ...mono, fontSize: '9px', color: 'var(--brand)' }}>{event?.id ? 'EDYCJA WYDARZENIA' : 'NOWE WYDARZENIE'}</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: t.title, lineHeight: 1.05, marginTop: '4px' }}>
              {form.title || 'Bez tytułu'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}><X size={18} /></button>
        </div>

        {/* Podstawowe */}
        <p style={sectionTitle}>PODSTAWOWE</p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div><label style={label}>Tytuł *</label><input style={input} value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div><label style={label}>Adres URL (slug)</label><input style={input} value={form.slug} placeholder={slugify(form.title)} onChange={e => set('slug', e.target.value)} /></div>
          <div>
            <label style={label}>Kategoria</label>
            <select style={input} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">— brak —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Status</label>
            <select style={input} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Szkic</option>
              <option value="published">Opublikowane</option>
              <option value="hidden">Ukryte</option>
            </select>
          </div>
          <div><label style={label}>Cena za osobę (PLN)</label><input type="number" style={input} value={form.price} onChange={e => set('price', e.target.value)} /></div>
          <div><label style={label}>Miejsce</label><input style={input} value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div><label style={label}>Minimalna liczba uczestników</label><input type="number" style={input} value={form.min_participants} onChange={e => set('min_participants', e.target.value)} /></div>
          <div><label style={label}>Kolejność</label><input type="number" style={input} value={form.order} onChange={e => set('order', e.target.value)} /></div>
        </div>

        <div className="mb-4">
          <label style={label}>Krótki opis (karta oferty)</label>
          <textarea rows={2} style={{ ...input, resize: 'vertical' }} value={form.short_description} onChange={e => set('short_description', e.target.value)} />
        </div>
        <div className="mb-4">
          <label style={label}>Pełny opis</label>
          <textarea rows={4} style={{ ...input, resize: 'vertical' }} value={form.full_description} onChange={e => set('full_description', e.target.value)} />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div><label style={label}>Program</label><textarea rows={3} style={{ ...input, resize: 'vertical' }} value={form.program} onChange={e => set('program', e.target.value)} /></div>
          <div><label style={label}>Wymagania i poziom</label><textarea rows={3} style={{ ...input, resize: 'vertical' }} value={form.requirements} onChange={e => set('requirements', e.target.value)} /></div>
          <div><label style={label}>Materiały od studia</label><textarea rows={3} style={{ ...input, resize: 'vertical' }} value={form.materials} onChange={e => set('materials', e.target.value)} /></div>
          <div><label style={label}>Informacje organizacyjne</label><textarea rows={3} style={{ ...input, resize: 'vertical' }} value={form.organizer_info} onChange={e => set('organizer_info', e.target.value)} /></div>
        </div>

        {/* Prowadzący */}
        <div className="mb-6 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <p style={sectionTitle}>PROWADZĄCY</p>
          <div className="flex flex-wrap gap-2">
            {artists.map(a => {
              const active = (form.leader_ids || []).includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => set('leader_ids', active ? form.leader_ids.filter(id => id !== a.id) : [...(form.leader_ids || []), a.id])}
                  style={{
                    ...mono, fontSize: '9px', padding: '6px 12px', cursor: 'pointer',
                    border: `0.5px solid ${active ? 'var(--brand)' : t.border}`,
                    color: active ? 'var(--brand)' : t.muted,
                    background: active ? 'rgb(var(--brand-rgb) / 0.08)' : 'transparent',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {a.name}
                </button>
              );
            })}
            {artists.length === 0 && <p style={{ ...mono, fontSize: '9px', color: t.muted }}>Brak artystów w bazie.</p>}
          </div>
        </div>

        {/* Media */}
        <div className="mb-6 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <p style={sectionTitle}>ZDJĘCIA I WIDEO</p>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {form.main_image_url && <img src={form.main_image_url} alt="" style={{ width: 90, height: 64, objectFit: 'cover', borderRadius: 'var(--radius)' }} />}
            <label style={{ ...mono, fontSize: '9px', padding: '8px 12px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius)' }}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Zdjęcie główne
              <input type="file" accept="image/*" onChange={handleMainUpload} style={{ display: 'none' }} />
            </label>
            <label style={{ ...mono, fontSize: '9px', padding: '8px 12px', border: `0.5px solid ${t.border}`, color: t.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius)' }}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Galeria
              <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: 'none' }} />
            </label>
          </div>
          {(form.gallery_images || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {form.gallery_images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative">
                  <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                  <button
                    onClick={() => set('gallery_images', form.gallery_images.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label style={label}>Adresy wideo (jeden na linię)</label>
          <textarea
            rows={2}
            style={{ ...input, resize: 'vertical' }}
            value={(form.video_urls || []).join('\n')}
            onChange={e => set('video_urls', e.target.value.split('\n').map(v => v.trim()).filter(Boolean))}
          />
        </div>

        {/* Terminy */}
        <div className="mb-6 pt-5" style={{ borderTop: `0.5px solid ${t.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p style={sectionTitle}>TERMINY I LIMITY MIEJSC</p>
            <button onClick={() => setSessions(list => [...list, emptySession()])} style={{ ...mono, fontSize: '9px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={11} /> Dodaj termin
            </button>
          </div>

          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={s.id || `new-${i}`} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label style={label}>Data *</label><input type="date" style={input} value={s.date} onChange={e => setSession(i, { date: e.target.value })} /></div>
                  <div><label style={label}>Start</label><input style={input} placeholder="10:00" value={s.start_time} onChange={e => setSession(i, { start_time: e.target.value })} /></div>
                  <div><label style={label}>Koniec</label><input style={input} placeholder="16:00" value={s.end_time} onChange={e => setSession(i, { end_time: e.target.value })} /></div>
                  <div><label style={label}>Miejsca</label><input type="number" style={input} value={s.capacity} onChange={e => setSession(i, { capacity: e.target.value })} /></div>
                </div>
                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="flex flex-wrap gap-1.5">
                    {artists.map(a => {
                      const active = (s.leader_ids || []).includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSession(i, { leader_ids: active ? s.leader_ids.filter(id => id !== a.id) : [...(s.leader_ids || []), a.id] })}
                          style={{ ...mono, fontSize: '8px', padding: '4px 8px', border: `0.5px solid ${active ? 'var(--brand)' : t.border}`, color: active ? 'var(--brand)' : t.muted, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--radius)' }}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setSessions(list => list.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {s.id && (
                  <button
                    onClick={() => {
                      setRemovedSessions(prev => [...prev, s.id]);
                      setSessions(list => list.filter((_, idx) => idx !== i));
                    }}
                    style={{ ...mono, fontSize: '8px', color: t.muted, background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px' }}
                  >
                    Usuń ten termin trwale
                  </button>
                )}
              </div>
            ))}
          </div>

          {conflicts.length > 0 && (
            <div className="mt-3 p-3" style={{ border: '0.5px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.07)', borderRadius: 'var(--radius)' }}>
              <p style={{ ...mono, fontSize: '8px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                <AlertTriangle size={11} /> KOLIZJE Z SESJAMI PROWADZĄCYCH
              </p>
              {conflicts.slice(0, 5).map((c, i) => (
                <p key={i} style={{ fontSize: '11px', color: t.muted, lineHeight: 1.6 }}>{c}</p>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mb-4" style={{ ...mono, fontSize: '9px', color: '#ef4444', lineHeight: 1.6 }}>{error}</p>}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} className="animate-spin" />} {saving ? 'ZAPISYWANIE...' : 'ZAPISZ WYDARZENIE'}
          </button>
          <button onClick={onClose} className="btn-ghost-parchment">ANULUJ</button>
        </div>
      </motion.div>
    </div>
  );
}