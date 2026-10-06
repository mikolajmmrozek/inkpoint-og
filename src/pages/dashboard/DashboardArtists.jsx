import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, X, History, Eye, EyeOff, Clock } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from './Dashboard';
import { compressImage } from '@/utils/compressImage';
import { format } from 'date-fns';
import ArtistScheduleEditor from '@/components/dashboard/ArtistScheduleEditor';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  color: '#F5F0EB',
  padding: '12px 0',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

export default function DashboardArtists() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A' };
  const [artists, setArtists] = useState([]);
  const [allServices, setAllServices] = useState([]); // master list of services
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [newCommission, setNewCommission] = useState({ cut_percent: 60, effective_from: format(new Date(), 'yyyy-MM-dd'), note: '' });
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // artist to delete
  const [commissionDeleteConfirm, setCommissionDeleteConfirm] = useState(null); // commission entry to delete
  // Per-service overrides for the artist being edited:
  // { [serviceId]: { performs: boolean, bookable_online: boolean } }
  const [serviceOverrides, setServiceOverrides] = useState({});
  const [savingServices, setSavingServices] = useState(false);

  const load = async () => {
    const data = await base44.entities.Artist.list('-created_date', 50);
    const sorted = [...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setArtists(sorted);
    setLoading(false);
  };

  const loadServices = async () => {
    const data = await base44.entities.Service.list('-created_date', 200);
    const active = data.filter(s => s.is_active !== false);
    setAllServices(active);
  };

  // Load service list once on mount — it's reused across every artist edit.
  useEffect(() => { loadServices(); }, []);

  const handleDragEnd = async ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const next = [...artists];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setArtists(next);
    await base44.entities.Artist.bulkUpdate(next.map((a, idx) => ({ id: a.id, order: idx })));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: '', slug: '', bio: '', specialty: [], years_experience: '', instagram: '', is_active: true, portfolio_images: [] });
    setEditing('new');
    setActiveTab('profile');
    setCommissionHistory([]);
    setShowAddCommission(false);
    setNewCommission({ cut_percent: 60, effective_from: format(new Date(), 'yyyy-MM-dd'), note: '' });
    setServiceOverrides({}); // new artist performs nothing yet
  };

  // Toggle one of the two per-service flags for the artist being edited.
  const toggleServiceFlag = (serviceId, flag) => {
    setServiceOverrides(prev => {
      const current = prev[serviceId] || { performs: false, bookable_online: false };
      const next = { ...current, [flag]: !current[flag] };
      // Turning "performs" off also disables bookable_online (can't book what you don't perform).
      if (flag === 'performs' && !next.performs) next.bookable_online = false;
      // Turning "performs" on defaults bookable_online to true.
      if (flag === 'performs' && next.performs) next.bookable_online = true;
      return { ...prev, [serviceId]: next };
    });
  };

  // Bulk-save all per-service changes: update each touched Service record's
  // artist_ids and hidden_from_clients arrays in one pass.
  const handleSaveServices = async () => {
    if (editing === 'new' || !editing?.id) return;
    setSavingServices(true);
    try {
      const artistId = editing.id;
      const updates = [];
      allServices.forEach(s => {
        const o = serviceOverrides[s.id];
        if (!o) return;
        const currentPerforms = (s.artist_ids || []).includes(artistId);
        const currentHidden = (s.hidden_from_clients || []).includes(artistId);
        // Desired state
        const wantPerforms = o.performs;
        const wantHidden = o.performs && !o.bookable_online; // only hide if performs but not bookable
        if (currentPerforms === wantPerforms && currentHidden === wantHidden) return; // no change
        const artistIds = wantPerforms
          ? Array.from(new Set([...(s.artist_ids || []), artistId]))
          : (s.artist_ids || []).filter(id => id !== artistId);
        const hiddenFromClients = wantHidden
          ? Array.from(new Set([...(s.hidden_from_clients || []), artistId]))
          : (s.hidden_from_clients || []).filter(id => id !== artistId);
        updates.push({ id: s.id, artist_ids: artistIds, hidden_from_clients: hiddenFromClients });
      });
      if (updates.length > 0) {
        await base44.entities.Service.bulkUpdate(updates);
      }
    } finally {
      setSavingServices(false);
    }
  };

  const openEdit = async (a) => {
    setForm({ ...a });
    setEditing(a);
    setActiveTab('profile');
    setShowAddCommission(false);
    setNewCommission({ cut_percent: a.artist_cut_percent ?? 60, effective_from: format(new Date(), 'yyyy-MM-dd'), note: '' });
    const history = await base44.entities.ArtistCommissionHistory.filter({ artist_id: a.id }, '-effective_from', 50);
    setCommissionHistory(history);
    // Compute per-service state from the live service records.
    const svcs = allServices.length > 0 ? allServices : await base44.entities.Service.list('-created_date', 200);
    const overrides = {};
    svcs.forEach(s => {
      const performs = (s.artist_ids || []).includes(a.id);
      const hidden = (s.hidden_from_clients || []).includes(a.id);
      // bookable_online defaults true when the artist performs the service and isn't hidden.
      overrides[s.id] = { performs, bookable_online: performs && !hidden };
    });
    setServiceOverrides(overrides);
  };

  const handleSave = async () => {
    const specialtyArr = typeof form.specialty === 'string' ? form.specialty.split(',').map(s => s.trim()).filter(Boolean) : (form.specialty || []);
    // Strip built-in fields to avoid payload issues; explicitly preserve portfolio_images
    const { id: _formId, created_date, updated_date, created_by_id, ...editableFields } = form;
    const data = { ...editableFields, specialty: specialtyArr, portfolio_images: form.portfolio_images || [] };
    if (editing === 'new') {
      const created = await base44.entities.Artist.create(data);
      // Zapisz wpis w historii przy tworzeniu
      await base44.entities.ArtistCommissionHistory.create({
        artist_id: created.id,
        artist_name: created.name,
        cut_percent: data.artist_cut_percent ?? 60,
        effective_from: format(new Date(), 'yyyy-MM-dd'),
        note: 'Stawka początkowa',
      });
    } else {
      await base44.entities.Artist.update(editing.id, data);
    }
    setEditing(null);
    load();
  };

  const handleAddCommission = async () => {
    const entry = await base44.entities.ArtistCommissionHistory.create({
      artist_id: editing.id,
      artist_name: editing.name,
      cut_percent: newCommission.cut_percent,
      effective_from: newCommission.effective_from,
      note: newCommission.note || '',
    });
    // Zaktualizuj też bieżący procent w profilu artysty
    await base44.entities.Artist.update(editing.id, { artist_cut_percent: newCommission.cut_percent });
    setForm(f => ({ ...f, artist_cut_percent: newCommission.cut_percent }));
    setCommissionHistory(h => [entry, ...h]);
    setShowAddCommission(false);
    setNewCommission({ cut_percent: newCommission.cut_percent, effective_from: format(new Date(), 'yyyy-MM-dd'), note: '' });
  };

  const deleteCommissionEntry = async (id) => {
    await base44.entities.ArtistCommissionHistory.delete(id);
    setCommissionHistory(h => h.filter(x => x.id !== id));
    setCommissionDeleteConfirm(null);
  };

  const deleteArtist = async (id) => {
    await base44.entities.Artist.delete(id);
    setArtists(a => a.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = await Promise.all(
      files.map(async (f) => {
        const compressed = await compressImage(f, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
        return base44.integrations.Core.UploadFile({ file: compressed }).then(r => ({ url: r.file_url, caption: '', style: '' }));
      })
    );
    setForm(f => ({ ...f, portfolio_images: [...(f.portfolio_images || []), ...urls] }));
    setUploading(false);
  };

  const removePortfolioImage = (idx) => {
    setForm(f => ({ ...f, portfolio_images: (f.portfolio_images || []).filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
          <Plus size={13} /> NOWY ARTYSTA
        </button>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '40px', borderRadius: 'var(--radius)' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                  {editing === 'new' ? 'Nowy Artysta' : 'Edytuj Artystę'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {/* Tabs */}
              <div className="flex mb-6" style={{ borderBottom: `0.5px solid ${t.border}` }}>
                {[['profile', 'Profil'], ...(editing !== 'new' ? [['schedule', 'Grafik'], ['services', 'Usługi']] : [])].map(([key, lbl]) => (
                  <button key={key} onClick={() => setActiveTab(key)} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: `1.5px solid ${activeTab === key ? 'var(--brand)' : 'transparent'}`, color: activeTab === key ? 'var(--brand)' : t.muted, cursor: 'pointer', marginBottom: '-0.5px' }}>{lbl}</button>
                ))}
              </div>

              {/* Schedule tab */}
              {activeTab === 'schedule' && editing !== 'new' && (
                <ArtistScheduleEditor artistId={editing.id} t={{ border: t.border, text: t.text, muted: t.muted, cardBg: 'transparent' }} />
              )}

              {/* Services tab */}
              {activeTab === 'services' && editing !== 'new' && (
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', lineHeight: 1.6, marginBottom: '18px' }}>
                    Zaznacz, które usługi wykonuje ten artysta, i czy klient może je u niego zarezerwować online. Odznacz kilka naraz — zmiany zapiszesz jednym kliknięciem poniżej.
                  </p>
                  {allServices.length === 0 ? (
                    <div className="py-10 text-center">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK USŁUG W STUDIU</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allServices.map(s => {
                        const o = serviceOverrides[s.id] || { performs: false, bookable_online: false };
                        return (
                          <div key={s.id} style={{ border: `0.5px solid ${o.performs ? 'var(--brand)' : t.border}`, background: o.performs ? 'rgb(var(--brand-rgb) /0.04)' : 'transparent', padding: '12px 14px' }}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>
                                  {s.category === 'tattoo' ? 'TATUAŻ' : s.category === 'piercing' ? 'PIERCING' : 'STUDIO'}
                                  {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-5 flex-shrink-0">
                                {/* Checkbox 1: performs */}
                                <button
                                  type="button"
                                  onClick={() => toggleServiceFlag(s.id, 'performs')}
                                  className="flex items-center gap-2"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: o.performs ? '#16a34a' : t.muted }}
                                >
                                  <div style={{ width: '14px', height: '14px', border: `0.5px solid ${o.performs ? '#16a34a' : t.border}`, background: o.performs ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {o.performs && <span style={{ color: '#fff', fontSize: '9px' }}>✓</span>}
                                  </div>
                                  Wykonuje
                                </button>
                                {/* Checkbox 2: bookable online (disabled if not performs) */}
                                <button
                                  type="button"
                                  onClick={() => o.performs && toggleServiceFlag(s.id, 'bookable_online')}
                                  disabled={!o.performs}
                                  className="flex items-center gap-2"
                                  style={{ background: 'none', border: 'none', cursor: o.performs ? 'pointer' : 'default', opacity: o.performs ? 1 : 0.3, fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: o.bookable_online ? '#16a34a' : t.muted }}
                                >
                                  <div style={{ width: '14px', height: '14px', border: `0.5px solid ${o.bookable_online ? '#16a34a' : t.border}`, background: o.bookable_online ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {o.bookable_online && <span style={{ color: '#fff', fontSize: '9px' }}>✓</span>}
                                  </div>
                                  Rezerwacja online
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-4" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px', marginTop: '20px' }}>
                    <button onClick={handleSaveServices} disabled={savingServices} className="btn-oxblood flex-1" style={{ opacity: savingServices ? 0.5 : 1 }}>
                      {savingServices ? 'ZAPISYWANIE...' : 'ZAPISZ USŁUGI'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{
                        backgroundColor: 'transparent',
                        color: t.muted,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        padding: '14px 32px',
                        border: `0.5px solid ${t.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >ANULUJ</button>
                  </div>
                </div>
              )}

              <div className="space-y-6" style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Imię i Nazwisko *</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Slug (URL)</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bio</label>
                  <textarea rows={4} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Specjalizacje (przecinki)</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={Array.isArray(form.specialty) ? form.specialty.join(', ') : (form.specialty || '')} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lata doświadczenia</label>
                    <input type="number" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.years_experience || ''} onChange={e => setForm(f => ({ ...f, years_experience: Number(e.target.value) }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                </div>

                {/* Revenue split */}
                <div style={{ border: `0.5px solid ${t.border}`, padding: '16px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Podział przychodu</label>
                    {editing !== 'new' && (
                      <button
                        onClick={() => setShowAddCommission(v => !v)}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: showAddCommission ? 'var(--brand)' : t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${showAddCommission ? 'var(--brand)' : t.border}`, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        + ZMIEŃ STAWKĘ
                      </button>
                    )}
                  </div>

                  {/* Bieżąca stawka (tylko do odczytu jeśli jest historia) */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Artysta % (bieżące)</label>
                      <input
                        type="number" min="0" max="100"
                        style={{ ...inputStyle, color: '#16a34a', borderBottomColor: t.border }}
                        value={form.artist_cut_percent ?? 60}
                        onChange={e => setForm(f => ({ ...f, artist_cut_percent: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        onFocus={e => e.target.style.borderBottomColor = '#16a34a'}
                        onBlur={e => e.target.style.borderBottomColor = t.border}
                        readOnly={editing !== 'new' && commissionHistory.length > 0}
                      />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: t.muted }}>+</div>
                    <div className="flex-1">
                      <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Studio %</label>
                      <input type="number" readOnly style={{ ...inputStyle, color: 'var(--brand)', borderBottomColor: t.border, cursor: 'default' }} value={100 - (form.artist_cut_percent ?? 60)} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>= 100%</div>
                  </div>

                  {/* Formularz nowej zmiany */}
                  {showAddCommission && (
                    <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '14px', marginTop: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Nowa stawka od daty:</p>
                      <div className="flex gap-4 items-end mb-3">
                        <div className="flex-1">
                          <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nowy % artysty</label>
                          <input
                            type="number" min="0" max="100"
                            style={{ ...inputStyle, color: '#16a34a', borderBottomColor: t.border }}
                            value={newCommission.cut_percent}
                            onChange={e => setNewCommission(c => ({ ...c, cut_percent: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                            onFocus={e => e.target.style.borderBottomColor = '#16a34a'}
                            onBlur={e => e.target.style.borderBottomColor = t.border}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Obowiązuje od</label>
                          <input
                            type="date"
                            style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }}
                            value={newCommission.effective_from}
                            onChange={e => setNewCommission(c => ({ ...c, effective_from: e.target.value }))}
                            onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                            onBlur={e => e.target.style.borderBottomColor = t.border}
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notatka (opcjonalna)</label>
                        <input
                          type="text"
                          placeholder="np. podwyżka, zmiana umowy..."
                          style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }}
                          value={newCommission.note}
                          onChange={e => setNewCommission(c => ({ ...c, note: e.target.value }))}
                          onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                          onBlur={e => e.target.style.borderBottomColor = t.border}
                        />
                      </div>
                      <button onClick={handleAddCommission} className="btn-oxblood" style={{ fontSize: '9px', padding: '8px 18px' }}>
                        ZAPISZ ZMIANĘ STAWKI
                      </button>
                    </div>
                  )}

                  {/* Historia stawek */}
                  {commissionHistory.length > 1 && (
                    <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '12px', marginTop: '14px' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <History size={10} color={t.muted} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Historia stawek</p>
                      </div>
                      <div className="space-y-2">
                        {commissionHistory.map((entry, i) => (
                          <div key={entry.id} className="flex items-center justify-between" style={{ padding: '8px 10px', background: i === 0 ? 'rgba(22,163,74,0.06)' : 'transparent', border: `0.5px solid ${i === 0 ? 'rgba(22,163,74,0.3)' : t.border}` }}>
                            <div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: i === 0 ? '#16a34a' : t.text, fontWeight: i === 0 ? 600 : 400 }}>
                                {entry.cut_percent}% artysta / {100 - entry.cut_percent}% studio
                              </span>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.06em' }}>od {entry.effective_from}</span>
                                {entry.note && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted }}>· {entry.note}</span>}
                                {i === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#16a34a', letterSpacing: '0.1em', border: '0.5px solid rgba(22,163,74,0.4)', padding: '1px 5px' }}>BIEŻĄCA</span>}
                              </div>
                            </div>
                            {i > 0 && (
                              <button onClick={() => setCommissionDeleteConfirm(entry)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Instagram</label>
                  <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zdjęcie profilowe</label>
                  {form.photo_url && <img src={form.photo_url} alt="" className="w-24 h-24 object-cover mb-3" style={{ filter: 'brightness(0.7)', borderRadius: 'var(--radius)' }} />}
                  <label style={{ display: 'inline-block', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '8px 16px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.text, transition: 'all 0.2s ease' }} className="hover:opacity-70">
                    {uploading ? 'PRZESYŁANIE...' : 'WYBIERZ ZDJĘCIE'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {/* Portfolio upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Portfolio ({(form.portfolio_images || []).length} zdjęć)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(form.portfolio_images || []).map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img.url} alt="" className="w-16 h-16 object-cover" style={{ filter: 'brightness(0.7)', borderRadius: 'var(--radius)' }} />
                        <button onClick={() => removePortfolioImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#8B1A1A' }}>
                          <X size={8} color="#F5F0EB" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label style={{ display: 'inline-block', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '8px 16px', background: 'transparent', border: `0.5px solid ${t.border}`, color: t.text, transition: 'all 0.2s ease' }} className="hover:opacity-70">
                    {uploading ? 'PRZESYŁANIE...' : 'DODAJ DO PORTFOLIO'}
                    <input type="file" accept="image/*" multiple onChange={handlePortfolioUpload} className="hidden" />
                  </label>
                </div>

                {/* Visibility toggles */}
                <div className="flex flex-col gap-4 pt-4" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <div className="flex flex-wrap items-center gap-6">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_visible: f.is_visible === false ? true : false }))}
                      className="flex items-center gap-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_visible === false ? t.muted : '#16a34a' }}
                    >
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_visible === false ? t.border : '#16a34a'}`, background: form.is_visible === false ? 'transparent' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.is_visible !== false && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                      </div>
                      Widoczny na stronie artystów
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, bookable_online: f.bookable_online === false ? true : false }))}
                      className="flex items-center gap-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.bookable_online === false ? t.muted : '#16a34a' }}
                    >
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.bookable_online === false ? t.border : '#16a34a'}`, background: form.bookable_online === false ? 'transparent' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.bookable_online !== false && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}
                      </div>
                      Dostępny w rezerwacji online
                    </button>
                  </div>
                  {form.bookable_online === false && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.08em', lineHeight: 1.5 }}>
                      Klient nie zobaczy tego artysty w formularzu rezerwacji. Admin i sam artysta nadal mogą go zapisywać w panelu.
                    </p>
                  )}
                </div>

                <div className="flex gap-4" style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '16px' }}>
                  <button onClick={handleSave} className="btn-oxblood flex-1">ZAPISZ</button>
                  <button
                    onClick={() => setEditing(null)}
                    style={{
                      backgroundColor: 'transparent',
                      color: t.muted,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      padding: '14px 32px',
                      border: `0.5px solid ${t.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >ANULUJ</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń artystę"
        message={`Czy na pewno chcesz usunąć artystę "${deleteConfirm?.name}"?`}
        onConfirm={() => deleteArtist(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />
      <ConfirmDeleteDialog
        open={!!commissionDeleteConfirm}
        title="Usuń wpis historii prowizji"
        message={`Usunąć wpis ${commissionDeleteConfirm?.cut_percent}% od ${commissionDeleteConfirm?.effective_from}?`}
        onConfirm={() => deleteCommissionEntry(commissionDeleteConfirm.id)}
        onCancel={() => setCommissionDeleteConfirm(null)}
        theme={theme}
      />

      {/* Artists list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="artists">
            {(provided) => (
              <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }} ref={provided.innerRef} {...provided.droppableProps}>
                {artists.length === 0 ? (
                  <div className="py-20 text-center">
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK ARTYSTÓW</p>
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
                          {a.photo_url ? (
                            <img src={a.photo_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', flexShrink: 0, borderRadius: 'var(--radius)' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', flexShrink: 0, background: 'rgb(var(--brand-rgb) /0.1)', border: '0.5px solid rgb(var(--brand-rgb) /0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--brand)', letterSpacing: '0.05em' }}>
                                {a.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>{a.name}</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                              {(a.specialty || []).join(', ')} · {a.years_experience} {a.years_experience === 1 ? 'rok' : [2,3,4].includes(a.years_experience) ? 'lata' : 'lat'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {a.is_visible === false && (
                            <span title="Ukryty na stronie">
                              <EyeOff size={13} style={{ color: t.muted }} />
                            </span>
                          )}
                          <button onClick={() => openEdit(a)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(a)} style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer' }}>
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