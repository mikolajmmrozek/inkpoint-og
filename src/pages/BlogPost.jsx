import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.BlogPost.list();
        const found = all.find(p => p.slug === id || p.id === id);
        setPost(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <PageLayout>
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-px animate-pulse" style={{ background: '#8B1A1A' }} />
      </div>
    </PageLayout>
  );

  if (!post) return (
    <PageLayout>
      <div className="pt-40 px-8 md:px-16 text-center">
        <p style={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.2em' }}>
          POST NIE ZNALEZIONY
        </p>
        <Link to="/blog" className="btn-ghost-parchment inline-block mt-8">Wróć do Bloga</Link>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      {/* Hero */}
      {post.cover_image_url && (
        <div className="relative h-[60vh] overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.35) contrast(1.1)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0A0A0A 0%, transparent 60%)' }} />
        </div>
      )}

      <div className="px-8 md:px-24 lg:px-48 py-16 max-w-4xl mx-auto">
        <Link to="/blog" className="text-micro mb-12 block" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.15em' }}>
          ← BLOG
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="flex gap-2 mb-6">
            {(post.tags || []).map(tag => (
              <span key={tag} style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8B1A1A', letterSpacing: '0.15em', border: '0.5px solid #8B1A1A', padding: '3px 8px', textTransform: 'uppercase' }}>
                {tag}
              </span>
            ))}
          </div>

          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700, color: '#F5F0EB', lineHeight: 1 }}>
            {post.title}
          </h1>

          <div className="flex items-center gap-4 mt-6 pb-8" style={{ borderBottom: '0.5px solid #262626' }}>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {post.author_name}
            </p>
            {post.published_at && (
              <>
                <span style={{ color: '#262626' }}>|</span>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: pl })}
                </p>
              </>
            )}
          </div>

          {post.video_url && (
            <div className="mt-8 aspect-video">
              <video src={post.video_url} controls className="w-full h-full" style={{ background: '#0A0A0A' }} />
            </div>
          )}

          <div
            className="mt-8 prose prose-invert max-w-none"
            style={{ color: 'rgba(245,240,235,0.7)', fontSize: '16px', lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: post.content || '<p>' + post.excerpt + '</p>' }}
          />
        </motion.div>
      </div>
    </PageLayout>
  );
}