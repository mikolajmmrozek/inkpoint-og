import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import { motion, AnimatePresence } from 'framer-motion';
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
  fontFamily: 'var(--font-body)',
};

export default function DashboardBlog() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF', inputBorder: '#D0D0D0' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A', inputBorder: '#262626' };
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | post object
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // post to delete

  const load = async () => {
    const data = await base44.entities.BlogPost.list('-created_date', 50);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', excerpt: '', content: '', author_name: '', tags: [], is_published: false, cover_image_url: '', video_url: '', images: [] });
    setEditing('new');
  };

  const openEdit = (post) => {
    setForm({ ...post });
    setEditing(post);
  };

  const handleSave = async () => {
    const tagArr = typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : (form.tags || []);
    const data = { ...form, tags: tagArr };
    if (editing === 'new') {
      await base44.entities.BlogPost.create(data);
    } else {
      await base44.entities.BlogPost.update(editing.id, data);
    }
    setEditing(null);
    load();
  };

  const togglePublish = async (post) => {
    await base44.entities.BlogPost.update(post.id, { is_published: !post.is_published });
    setPosts(p => p.map(x => x.id === post.id ? { ...x, is_published: !x.is_published } : x));
  };

  const deletePost = async (id) => {
    await base44.entities.BlogPost.delete(id);
    setPosts(p => p.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, cover_image_url: file_url }));
    setUploading(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, video_url: file_url }));
    setUploading(false);
  };

  const handlePostImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => ({ url: r.file_url, caption: '' }))));
    setForm(f => ({ ...f, images: [...(f.images || []), ...uploaded] }));
    setUploading(false);
  };

  const removePostImage = (idx) => {
    setForm(f => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
          <Plus size={13} /> NOWY POST
        </button>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl max-h-screen overflow-y-auto"
              style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '40px', borderRadius: 'var(--radius)' }}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>
                  {editing === 'new' ? 'Nowy Post' : 'Edytuj Post'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tytuł *</label>
                  <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Skrót</label>
                  <textarea rows={2} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'none' }} value={form.excerpt || ''} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Treść</label>
                  <textarea rows={10} placeholder="Napisz treść posta..." style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, resize: 'vertical', lineHeight: 1.8 }} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Autor</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={form.author_name || ''} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tagi (przecinki)</label>
                    <input style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                  </div>
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Data publikacji</label>
                  <input type="date" style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }} value={form.published_at || ''} onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'} onBlur={e => e.target.style.borderBottomColor = t.border} />
                </div>

                {/* Cover image upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zdjęcie tytułowe</label>
                  {form.cover_image_url && (
                    <img src={form.cover_image_url} alt="Cover" className="w-32 h-20 object-cover mb-3" style={{ borderRadius: 'var(--radius)' }} />
                  )}
                  <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'WYBIERZ PLIK'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Post images */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Zdjęcia w poście ({(form.images || []).length})
                  </label>
                  {(form.images || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(form.images || []).map((img, i) => (
                        <div key={i} className="relative">
                          <img src={img.url} alt="" className="w-16 h-16 object-cover" style={{ borderRadius: 'var(--radius)' }} />
                          <button onClick={() => removePostImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--brand)', border: 'none', cursor: 'pointer' }}>
                            <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>×</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'DODAJ ZDJĘCIA'}
                    <input type="file" accept="image/*" multiple onChange={handlePostImagesUpload} className="hidden" />
                  </label>
                </div>

                {/* Video upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Wideo (opcjonalne)</label>
                  {form.video_url && (
                    <video src={form.video_url} controls className="w-full max-h-40 mb-3" style={{ background: '#000' }} />
                  )}
                  <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                    {uploading ? 'PRZESYŁANIE...' : form.video_url ? 'ZMIEŃ WIDEO' : 'DODAJ WIDEO'}
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={{ border: `0.5px solid ${form.is_published ? '#16a34a' : t.border}`, color: form.is_published ? '#16a34a' : t.muted, background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {form.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {form.is_published ? 'OPUBLIKOWANY' : 'SZKIC'}
                  </button>
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

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń post"
        message={`Czy na pewno chcesz usunąć post "${deleteConfirm?.title}"?`}
        onConfirm={() => deletePost(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {/* Posts list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
        </div>
      ) : (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>
                BRAK POSTÓW
              </p>
            </div>
          ) : posts.map((post, i) => (
           <div key={post.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 transition-colors" style={{ borderBottom: i < posts.length - 1 ? `0.5px solid ${t.border}` : 'none' }}>
             {/* Mobile: title first */}
             <div className="flex items-center gap-3 mb-3 md:mb-0 md:gap-6 min-w-0 flex-1">
               {post.cover_image_url && (
                 <img src={post.cover_image_url} alt="" className="w-10 h-10 md:w-12 md:h-12 object-cover flex-shrink-0" style={{ borderRadius: 'var(--radius)' }} />
               )}
               <div className="min-w-0 flex-1">
                 <p style={{ color: t.text, fontSize: '13px', md: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</p>
                 <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', md: '9px', color: t.muted, letterSpacing: '0.08em', marginTop: '2px' }}>
                   {post.author_name} · {post.published_at || 'Brak daty'}
                 </p>
               </div>
             </div>
             {/* Mobile: actions in a row */}
             <div className="flex items-center gap-1 md:gap-3 flex-shrink-0 w-full md:w-auto justify-end" style={{ marginTop: '8px', paddingRight: '4px' }}>
               <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', md: '8px', letterSpacing: '0.1em', padding: '2px 6px', border: `0.5px solid ${post.is_published ? '#4A7C59' : '#262626'}`, color: post.is_published ? '#4A7C59' : 'rgba(245,240,235,0.3)' }}>
                 {post.is_published ? 'LIVE' : 'SZKIC'}
               </span>
               <button onClick={() => togglePublish(post)} style={{ color: t.muted, cursor: 'pointer', background: 'none', border: 'none', padding: '6px', minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {post.is_published ? <EyeOff size={12} /> : <Eye size={12} />}
               </button>
               <button onClick={() => openEdit(post)} style={{ color: t.muted, cursor: 'pointer', background: 'none', border: 'none', padding: '6px', minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Edit size={12} />
               </button>
               <button onClick={() => setDeleteConfirm(post)} style={{ color: t.fuchsia, cursor: 'pointer', background: 'none', border: 'none', padding: '6px', minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
             </div>
           </div>
          ))}
        </div>
      )}
    </div>
  );
}