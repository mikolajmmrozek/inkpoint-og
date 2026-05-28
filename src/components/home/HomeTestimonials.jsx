import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function Stars({ value }) {
  return (
    <div style={{ fontSize: '16px', letterSpacing: '2px', marginBottom: '16px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= value ? '#FF007F' : 'rgba(245,240,235,0.15)' }}>★</span>
      ))}
    </div>
  );
}

export default function HomeTestimonials() {
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['publishedFeedback'],
    queryFn: () => base44.entities.Feedback.filter({ is_published: true }, '-created_date', 12),
  });

  if (feedbacks.length === 0) return null;

  return (
    <section className="py-20 px-8 md:px-16">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
            CO MÓWIĄ KLIENCI
          </p>
          <h2 style={{ fontFamily: 'Bebas Neue, system-ui', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 400, color: '#F5F0EB', lineHeight: 0.95, letterSpacing: '0.04em' }}>
            Opinie
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: '#262626' }}>
        {feedbacks.map((fb, i) => (
          <motion.div
            key={fb.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 3) * 0.1, duration: 0.6 }}
            style={{ background: '#0A0A0A', padding: '32px' }}
          >
            <Stars value={fb.rating_overall} />
            <p style={{ color: 'rgba(245,240,235,0.75)', fontSize: '15px', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '20px' }}>
              "{fb.short_review}"
            </p>
            <div className="flex items-center gap-3">
              <div style={{ width: '24px', height: '1px', background: '#FF007F' }} />
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#FF007F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {fb.client_name}
              </p>
              {fb.artist_name && (
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(245,240,235,0.3)', letterSpacing: '0.08em' }}>
                  · {fb.artist_name}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}