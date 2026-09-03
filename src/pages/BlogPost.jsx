import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PageLayout from '../components/layout/PageLayout';
import Lightbox from '../components/ui/Lightbox';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// Mosaic layout: groups of images with varying sizes
function ImageMosaic({ images, onOpen }) {
  if (!images || images.length === 0) return null;

  const groups = [];
  let i = 0;
  while (i < images.length) {
    const remaining = images.length - i;
    if (remaining === 1) {
      groups.push({ type: 'single', imgs: [images[i]] });
      i += 1;
    } else if (remaining === 2) {
      groups.push({ type: 'pair', imgs: [images[i], images[i + 1]] });
      i += 2;
    } else {
      // alternating: trio-left, trio-right
      const flip = groups.length % 2 === 0;
      groups.push({ type: flip ? 'trio-left' : 'trio-right', imgs: [images[i], images[i + 1], images[i + 2]] });
      i += 3;
    }
  }

  return (
    <div className="space-y-3 mt-12">
      {groups.map((group, gi) => {
        const startIdx = images.indexOf(group.imgs[0]);
        if (group.type === 'single') return (
          <div key={gi} className="cursor-pointer overflow-hidden group" onClick={() => onOpen(startIdx)}>
            <img src={group.imgs[0]?.url || group.imgs[0]} alt={group.imgs[0]?.caption || ''} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ maxHeight: '500px', filter: 'brightness(0.85) contrast(1.05)' }} />
          </div>
        );
        if (group.type === 'pair') return (
          <div key={gi} className="grid grid-cols-2 gap-3">
            {group.imgs.map((img, ii) => (
              <div key={ii} className="cursor-pointer overflow-hidden group aspect-square" onClick={() => onOpen(startIdx + ii)}>
                <img src={img?.url || img} alt={img?.caption || ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ filter: 'brightness(0.85) contrast(1.05)' }} />
              </div>
            ))}
          </div>
        );
        if (group.type === 'trio-left') return (
          <div key={gi} className="grid grid-cols-3 gap-3" style={{ gridTemplateRows: '280px' }}>
            <div className="col-span-2 cursor-pointer overflow-hidden group" onClick={() => onOpen(startIdx)}>
              <img src={group.imgs[0]?.url || group.imgs[0]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ filter: 'brightness(0.85) contrast(1.05)' }} />
            </div>
            <div className="flex flex-col gap-3">
              {group.imgs.slice(1).map((img, ii) => (
                <div key={ii} className="flex-1 cursor-pointer overflow-hidden group" onClick={() => onOpen(startIdx + 1 + ii)}>
                  <img src={img?.url || img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ filter: 'brightness(0.85) contrast(1.05)' }} />
                </div>
              ))}
            </div>
          </div>
        );
        // trio-right
        return (
          <div key={gi} className="grid grid-cols-3 gap-3" style={{ gridTemplateRows: '280px' }}>
            <div className="flex flex-col gap-3">
              {group.imgs.slice(0, 2).map((img, ii) => (
                <div key={ii} className="flex-1 cursor-pointer overflow-hidden group" onClick={() => onOpen(startIdx + ii)}>
                  <img src={img?.url || img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ filter: 'brightness(0.85) contrast(1.05)' }} />
                </div>
              ))}
            </div>
            <div className="col-span-2 cursor-pointer overflow-hidden group" onClick={() => onOpen(startIdx + 2)}>
              <img src={group.imgs[2]?.url || group.imgs[2]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ filter: 'brightness(0.85) contrast(1.05)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

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
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    </PageLayout>
  );

  if (!post) return (
    <PageLayout>
      <div className="pt-40 px-8 md:px-16 text-center">
        <p style={{ color: 'rgb(var(--foreground-rgb) / 0.4)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.2em' }}>
          POST NIE ZNALEZIONY
        </p>
        <Link to="/blog" className="btn-ghost-parchment inline-block mt-8">Wróć do Bloga</Link>
      </div>
    </PageLayout>
  );

  const allImages = post.images || [];
  const coverInImages = allImages.some(img => (img?.url || img) === post.cover_image_url);
  const sidebarImages = (!post.cover_image_url || coverInImages) ? allImages : [...allImages, { url: post.cover_image_url, caption: post.title }];

  return (
    <PageLayout>
      {/* Hero — cover image full width */}
      {post.cover_image_url && (
        <div className="relative h-[65vh] overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover media-border"
            style={{ filter: 'brightness(0.35) contrast(1.1)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)' }} />
          <div className="absolute top-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.55), transparent)' }} />
          {/* Title overlay on hero */}
          <div className="absolute bottom-0 left-0 right-0 px-8 md:px-16 pb-12">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(post.tags || []).map(tag => (
                <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', border: '0.5px solid var(--brand)', padding: '3px 8px', textTransform: 'uppercase' }}>
                  {tag}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 400, color: '#F5F0EB', lineHeight: 0.95, letterSpacing: '0.03em' }}>
              {post.title}
            </h1>
          </div>
        </div>
      )}

      <div className="px-8 md:px-16 lg:px-24 py-12 max-w-5xl mx-auto">
        <Link to="/blog" className="text-micro mb-10 block" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.15em' }}>
          ← BLOG
        </Link>

        {/* If no cover image, show title here */}
        {!post.cover_image_url && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(post.tags || []).map(tag => (
                <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.15em', border: '0.5px solid var(--brand)', padding: '3px 8px', textTransform: 'uppercase' }}>
                  {tag}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 400, color: 'hsl(var(--foreground))', lineHeight: 0.95, letterSpacing: '0.03em' }}>
              {post.title}
            </h1>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
          {/* Author / date bar */}
          <div className="flex items-center gap-4 mb-10 pb-8" style={{ borderBottom: '0.5px solid hsl(var(--border))' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {post.author_name}
            </p>
            {post.published_at && (
              <>
                <span style={{ color: 'hsl(var(--border))' }}>|</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: pl })}
                </p>
              </>
            )}
          </div>

          {/* Desktop: 2-col layout if media exists, else full width text */}
          {(post.video_url || sidebarImages.length > 0) ? (
            <div className="lg:grid lg:grid-cols-5 lg:gap-12">
              {/* Text — 3 cols */}
              <div className="lg:col-span-3">
                <div style={{ color: 'rgb(var(--foreground-rgb) / 0.75)', fontSize: '16px', lineHeight: 2, whiteSpace: 'pre-wrap' }}>
                  {post.content || post.excerpt}
                </div>
              </div>

              {/* Media sidebar — 2 cols */}
              <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-4">
                {post.video_url && (
                  <video src={post.video_url} controls className="w-full" style={{ background: 'hsl(var(--background))' }} />
                )}
                {sidebarImages.length > 0 && (
                  <div className="space-y-3">
                    {sidebarImages.map((img, i) => (
                      <div key={i} className="cursor-pointer overflow-hidden group" style={{ borderRadius: 'var(--radius)' }} onClick={() => setLightboxIndex(i)}>
                        <img
                          src={img?.url || img}
                          alt={img?.caption || ''}
                          className="w-full object-cover transition-transform duration-700 group-hover:scale-105 media-border"
                          style={{ filter: 'brightness(0.85) contrast(1.05)' }}
                        />
                        {img?.caption && (
                          <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.3)', letterSpacing: '0.08em' }}>
                            {img.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: 'rgb(var(--foreground-rgb) / 0.75)', fontSize: '16px', lineHeight: 2, whiteSpace: 'pre-wrap', maxWidth: '680px' }}>
              {post.content || post.excerpt}
            </div>
          )}

          {/* Mosaic gallery below on mobile / when many images */}
          {allImages.length > 2 && (
            <div className="lg:hidden mt-10">
              <ImageMosaic images={allImages} onOpen={setLightboxIndex} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={sidebarImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNext={(idx) => setLightboxIndex(idx !== undefined ? idx : (lightboxIndex + 1) % sidebarImages.length)}
            onPrev={() => setLightboxIndex((lightboxIndex - 1 + sidebarImages.length) % sidebarImages.length)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}