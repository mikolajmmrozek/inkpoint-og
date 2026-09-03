import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const MOCK_POSTS = [
  {
    id: '1',
    title: 'Jak dbać o świeży tatuaż — kompletny przewodnik',
    excerpt: 'Pierwsze dni po sesji są kluczowe dla jakości gojenia. Dowiedz się, jak właściwie pielęgnować skórę.',
    cover_image_url: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=800&q=80',
    author_name: 'Aleksandra Wiśniewska',
    published_at: '2026-03-15',
    tags: ['pielęgnacja', 'poradnik'],
  },
  {
    id: '2',
    title: 'Trendy w tatuażu 2026 — co dominuje na skórach',
    excerpt: 'Od ultra-minimalnych fine line po ekspresyjny ignorant style — oto co teraz rządzi w świecie tatuażu.',
    cover_image_url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80',
    author_name: 'Marcin Kowalski',
    published_at: '2026-02-20',
    tags: ['trendy', 'styl'],
  },
  {
    id: '3',
    title: 'Nasz nowy projekt: tatuaż florystyczny',
    excerpt: 'Za nami kilkumiesięczna praca nad botanicznym rękawem, który stał się jednym z naszych ulubionych projektów.',
    cover_image_url: 'https://images.unsplash.com/photo-1590246814883-57c511e4a0a4?w=800&q=80',
    author_name: 'Zuzanna Karpińska',
    published_at: '2026-01-10',
    tags: ['projekt', 'portfolio'],
  },
];

// Robust cover resolver — handles string, array, or fallback to images[] without re-saving data
const resolveCover = (post) => {
  const c = post?.cover_image_url;
  if (typeof c === 'string' && c) return c;
  if (Array.isArray(c) && c.length > 0) return typeof c[0] === 'string' ? c[0] : (c[0]?.url || null);
  const imgs = post?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    return typeof first === 'string' ? first : (first?.url || null);
  }
  return null;
};

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BlogPost.filter({ is_published: true }, '-published_at', 20)
      .then(data => setPosts(data.length > 0 ? data : MOCK_POSTS))
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = posts;

  return (
    <PageLayout>
      <div className="pt-40 pb-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-micro text-oxblood mb-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.2em' }}>
            WIEDZA & INSPIRACJE
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 9vw, 8rem)', fontWeight: 400, lineHeight: 0.9, color: 'hsl(var(--foreground))', letterSpacing: '0.04em' }}>
            Blog
          </h1>
        </motion.div>
      </div>

      <div className="px-8 md:px-16 pb-32">
        {loading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-video animate-pulse" style={{ background: 'hsl(var(--border))' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-16"
              >
                <Link to={`/blog/${featured.slug || featured.id}`} className="group grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="relative overflow-hidden aspect-[4/3] md:aspect-auto md:h-full min-w-0" style={{ borderRadius: 'var(--radius)' }}>
                    {resolveCover(featured) ? (
                      <img
                        src={resolveCover(featured)}
                        alt={featured.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ filter: 'brightness(0.65) contrast(1.1)' }}
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--border)))' }} />
                    )}
                  </div>
                  <div className="p-6 md:p-12 flex flex-col justify-center min-w-0">
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(featured.tags || []).map(tag => (
                        <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', border: '0.5px solid var(--brand)', padding: '3px 8px', textTransform: 'uppercase' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.7rem, 6vw, 2.2rem)', fontWeight: 600, color: 'hsl(var(--foreground))', lineHeight: 1.1, overflowWrap: 'break-word' }}>
                      {featured.title}
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb) / 0.5)', fontSize: '14px', lineHeight: 1.8, overflowWrap: 'break-word' }}>
                      {featured.excerpt}
                    </p>
                    <div className="mt-8 flex items-center justify-between">
                      <div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {featured.author_name}
                        </p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
                          {featured.published_at ? format(new Date(featured.published_at), 'dd MMM yyyy', { locale: pl }) : ''}
                        </p>
                      </div>
                      <p className="group-hover:text-oxblood transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        CZYTAJ →
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Other posts */}
            <div className="grid md:grid-cols-3 gap-8">
              {rest.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <Link to={`/blog/${post.slug || post.id}`} className="group block">
                    <div className="relative overflow-hidden aspect-[4/3] mb-6" style={{ borderRadius: 'var(--radius)' }}>
                      {resolveCover(post) ? (
                        <img
                          src={resolveCover(post)}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          style={{ filter: 'brightness(0.65) contrast(1.1)' }}
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--border)))' }} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(post.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.1em', border: '0.5px solid var(--brand)', padding: '2px 6px', textTransform: 'uppercase' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'hsl(var(--foreground))', lineHeight: 1.1 }}>
                      {post.title}
                    </h3>
                    <p className="mt-3 text-sm line-clamp-2" style={{ color: 'rgb(var(--foreground-rgb) / 0.4)', fontSize: '13px' }}>
                      {post.excerpt}
                    </p>
                    <p className="mt-4 group-hover:text-oxblood transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      CZYTAJ →
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}