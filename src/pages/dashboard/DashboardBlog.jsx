import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function DashboardBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | post object
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const data = await base44.entities.BlogPost.list('-created_date', 50);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', excerpt: '', content: '', author_name: '', tags: [], is_published: false, cover_image_url: '', video_url: '' });
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
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, cover_image_url: file_url }));
    setUploading(false);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>
            ZARZĄDZANIE
          </p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>
            Blog
          </h2>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 btn-oxblood">
          <Plus size={14} /> NOWY POST
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
            style={{ background: 'rgba(10,10,10,0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl max-h-screen overflow-y-auto"
              style={{ border: '0.5px solid #262626', background: '#0A0A0A', padding: '40px' }}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', fontWeight: 600, color: '#F5F0EB' }}>
                  {editing === 'new' ? 'Nowy Post' : 'Edytuj Post'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: 'rgba(245,240,235,0.4)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tytuł *</label>
                  <input style={inputStyle} value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Skrót</label>
                  <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={form.excerpt || ''} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Treść (HTML)</label>
                  <textarea rows={8} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono', fontSize: '12px' }} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Autor</label>
                    <input style={inputStyle} value={form.author_name || ''} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tagi (przecinki)</label>
                    <input style={inputStyle} value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>URL Video (opcjonalne)</label>
                    <input style={inputStyle} value={form.video_url || ''} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                  <div>
                    <label className="block mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Data publikacji</label>
                    <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.published_at || ''} onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))} onFocus={e => e.target.style.borderBottomColor = '#8B1A1A'} onBlur={e => e.target.style.borderBottomColor = '#262626'} />
                  </div>
                </div>

                {/* Cover image upload */}
                <div>
                  <label className="block mb-3" style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Zdjęcie tytułowe</label>
                  {form.cover_image_url && (
                    <img src={form.cover_image_url} alt="Cover" className="w-32 h-20 object-cover mb-3" style={{ filter: 'brightness(0.7)' }} />
                  )}
                  <label className="btn-ghost-parchment inline-block cursor-pointer text-center" style={{ fontSize: '10px', padding: '10px 20px' }}>
                    {uploading ? 'PRZESYŁANIE...' : 'WYBIERZ PLIK'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={{ border: `0.5px solid ${form.is_published ? '#4A7C59' : '#262626'}`, color: form.is_published ? '#4A7C59' : 'rgba(245,240,235,0.3)', background: 'transparent', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {form.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {form.is_published ? 'OPUBLIKOWANY' : 'SZKIC'}
                  </button>
                </div>

                <div className="flex gap-4 pt-4" style={{ borderTop: '0.5px solid #262626' }}>
                  <button onClick={handleSave} className="btn-oxblood flex-1">ZAPISZ</button>
                  <button onClick={() => setEditing(null)} className="btn-ghost-parchment">ANULUJ</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
        </div>
      ) : (
        <div style={{ border: '0.5px solid #262626' }}>
          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.2)', letterSpacing: '0.1em' }}>
                BRAK POSTÓW
              </p>
            </div>
          ) : posts.map((post, i) => (
            <div key={post.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < posts.length - 1 ? '0.5px solid #262626' : 'none' }}>
              <div className="flex items-center gap-6 min-w-0">
                {post.cover_image_url && (
                  <img src={post.cover_image_url} alt="" className="w-12 h-12 object-cover flex-shrink-0" style={{ filter: 'brightness(0.6)' }} />
                )}
                <div className="min-w-0">
                  <p style={{ color: '#F5F0EB', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.08em', marginTop: '2px' }}>
                    {post.author_name} · {post.published_at || 'Brak daty'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.1em', padding: '3px 8px', border: `0.5px solid ${post.is_published ? '#4A7C59' : '#262626'}`, color: post.is_published ? '#4A7C59' : 'rgba(245,240,235,0.3)' }}>
                  {post.is_published ? 'LIVE' : 'SZKIC'}
                </span>
                <button onClick={() => togglePublish(post)} style={{ color: 'rgba(245,240,235,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}>
                  {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => openEdit(post)} style={{ color: 'rgba(245,240,235,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}>
                  <Edit size={14} />
                </button>
                <button onClick={() => deletePost(post.id)} style={{ color: '#8B1A1A', cursor: 'pointer', background: 'none', border: 'none' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}