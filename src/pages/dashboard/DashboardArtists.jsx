import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from './Dashboard';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

export default function DashboardArtists() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: '#FF007F', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: '#FF007F', modalBg: '#0A0A0A' };
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const data = await base44.entities.Artist.list('-created_date', 50);
    const sorted = [...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setArtists(sorted);
    setLoading(false);
  };

  const handleDragEnd = async ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const next = [...artists];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setArtists(next);
    await Promise.all(next.map((a, idx) => base44.entities.Artist.update(a.id, { order: idx })));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: '', slug: '', bio: '', specialty: [], years_experience: '', instagram: '', is_active: true, portfolio_images: [] });
    setEditing('new');
  };

  const openEdit = (a) => { setForm({ ...a }); setEditing(a); };

  const handleSave = async () => {
    const specialtyArr = typeof form.specialty === 'string' ? form.specialty.split(',').map(s => s.trim()).filter(Boolean) : (form.specialty || []);
    const data = { ...form, specialty: specialtyArr };
    if (editing === 'new') {
      await base44.entities.Artist.create(data);
    } else {
      await base44.entities.Artist.update(editing.id, data);
    }
    setEditing(null);
    load();
  };

  const deleteArtist = async (id) => {
    await base44.entities.Artist.delete(id);
    setArtists(a => a.filter(x => x.id !== id));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => ({ url: r.file_url, caption: '', style: '' }))));
    setForm(f => ({ ...f, portfolio_images: [...(f.portfolio_images || []), ...urls] }));
    setUploading(false);
  };

  const removePortfolioImage = (idx) => {
    setForm(f => ({ ...f, portfolio_images: f.portfolio_images.filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.fuchsia, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>ZARZĄDZANIE</p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2.5rem', fontWeight: 400, color: t.title, lineHeight: 1, letterSpacing: '0.04em' }}>Artyści</h2>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 btn-oxblood">
          <Plus size={14} /> DODAJ ARTYSTĘ
        </button>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '40px' }}>
              <div className="flex justify-between items-center mb-8">
                <h3 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: '2rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                  {editing === 'new' ? 'Nowy Artysta' : 'Edytuj Artystę'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Imię i Nazwisko *</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Slug (URL)</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bio</label>
                  <textarea rows={4} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Specjalizacje (przecinki)</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={Array.isArray(form.specialty) ? form.specialty.join(', ') : (form.specialty || '')} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lata doświadczenia</label>
                    <input type="number" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.years_experience || ''} onChange={e => setForm(f => ({ ...f, years_experience: Number(e.target.value) }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                </div>

                {/* Revenue split */}
                <div style={{ border: `0.5px solid ${t.border}`, padding: '16px' }}>
                  <label className="block mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#FF007F', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Podział przychodu</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Artysta %</label>
                      <input
                        type="number" min="0" max="100"
                        style={{ ...inputStyle, color: '#16a34a', borderBottomColor: t.border }}
                        value={form.artist_cut_percent ?? 60}
                        onChange={e => setForm(f => ({ ...f, artist_cut_percent: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        onFocus={e => e.target.style.borderBottomColor = '#16a34a'}
                        onBlur={e => e.target.style.borderBottomColor = t.border}
                      />
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: t.muted }}>+</div>
                    <div className="flex-1">
                      <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Studio %</label>
                      <input
                        type="number" readOnly
                        style={{ ...inputStyle, color: '#FF007F', borderBottomColor: t.border, cursor: 'default' }}
                        value={100 - (form.artist_cut_percent ?? 60)}
                      />
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.muted }}>= 100%</div>
                  </div>
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Instagram</label>
                  <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#FF007F'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zdjęcie profilowe</label>
                  {form.photo_url && <img src={form.photo_url} alt="" className="w-24 h-24 object-cover mb-3" style={{ filter: 'brightness(0.7)' }} />}
                  <label className="btn-ghost-parchment inline-block cursor-pointer" style={{ fontSize: '10px', padding: '8px 16px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'WYBIERZ ZDJĘCIE'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {/* Portfolio upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Portfolio ({(form.portfolio_images || []).length} zdjęć)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(form.portfolio_images || []).map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img.url} alt="" className="w-16 h-16 object-cover" style={{ filter: 'brightness(0.7)' }} />
                        <button onClick={() => removePortfolioImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#8B1A1A' }}>
                          <X size={8} color="#F5F0EB" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="btn-ghost-parchment inline-block cursor-pointer" style={{ fontSize: '10px', padding: '8px 16px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'DODAJ DO PORTFOLIO'}
                    <input type="file" accept="image/*" multiple onChange={handlePortfolioUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex gap-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <button onClick={handleSave} className="btn-oxblood flex-1">ZAPISZ</button>
                  <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artists list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="artists">
            {(provided) => (
              <div style={{ border: `0.5px solid ${t.border}`, background: t.bg }} ref={provided.innerRef} {...provided.droppableProps}>
                {artists.length === 0 ? (
                  <div className="py-20 text-center">
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ARTYSTÓW</p>
                  </div>
                ) : artists.map((a, i) => (
                  <Draggable key={a.id} draggableId={a.id} index={i}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                        className="flex items-center justify-between p-4 transition-colors select-none cursor-grab active:cursor-grabbing"
                        style={{ ...p.draggableProps.style, borderBottom: i < artists.length - 1 ? `0.5px solid ${t.border}` : 'none', background: t.bg }}
                      >
                        <div className="flex items-center gap-4">
                          <GripVertical size={14} style={{ color: t.muted, flexShrink: 0 }} />
                          {a.photo_url && <img src={a.photo_url} alt="" className="w-10 h-10 object-cover" />}
                          <div>
                            <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{a.name}</p>
                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                              {(a.specialty || []).join(', ')} · {a.years_experience} {a.years_experience === 1 ? 'rok' : [2,3,4].includes(a.years_experience) ? 'lata' : 'lat'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(a)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => deleteArtist(a.id)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}