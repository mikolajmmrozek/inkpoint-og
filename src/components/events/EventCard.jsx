import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { formatPrice, formatSessionDate, formatSessionTime } from '@/lib/events';
import LeaderStack from '@/components/events/LeaderStack';

const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' };

export default function EventCard({ event, session, spots, index = 0, leaders = [] }) {
  const full = spots?.full;
  const noSession = !session;
  const left = spots ? spots.left : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.08, 0.4), duration: 0.6 }}
      className="group h-full"
    >
      <Link to={`/wydarzenia/${event.slug || event.id}`} className="flex flex-col h-full" style={{ textDecoration: 'none' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius)', background: 'hsl(var(--border))' }}>
          {event.main_image_url ? (
            <img
              src={event.main_image_url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 media-darken-soft media-border"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgb(var(--brand-rgb) / 0.08)' }}>
              <CalendarDays size={28} color="var(--brand)" />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.85) 0%, hsl(var(--background) / 0.15) 55%, transparent 100%)' }} />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {event.category_name && (
              <span style={{ ...mono, fontSize: '9px', color: 'var(--brand)', border: '0.5px solid var(--brand)', padding: '3px 8px', background: 'hsl(var(--background) / 0.7)' }}>
                {event.category_name}
              </span>
            )}
            {full && (
              <span style={{ ...mono, fontSize: '9px', color: 'hsl(var(--background))', background: 'hsl(var(--foreground))', padding: '3px 8px' }}>
                Brak miejsc
              </span>
            )}
            {noSession && !full && (
              <span style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.7)', border: '0.5px solid rgb(var(--foreground-rgb) / 0.3)', padding: '3px 8px', background: 'hsl(var(--background) / 0.7)' }}>
                Zakończone
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 pt-5">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', lineHeight: 1.05, letterSpacing: '0.04em', color: 'hsl(var(--foreground))' }}>
            {event.title}
          </h3>
          {event.short_description && (
            <p className="mt-2" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgb(var(--foreground-rgb) / 0.6)' }}>
              {event.short_description}
            </p>
          )}

          {leaders.length > 0 && (
            <div className="mt-4 flex items-center gap-2 min-w-0">
              <LeaderStack people={leaders} size={24} />
              <span style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {leaders.map(l => l.name).join(' · ')}
              </span>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {session ? (
              <>
                <p className="flex items-center gap-2" style={{ ...mono, fontSize: '10px', color: 'hsl(var(--foreground))' }}>
                  <CalendarDays size={12} color="var(--brand)" /> {formatSessionDate(session.date)}
                </p>
                {session.start_time && (
                  <p className="flex items-center gap-2" style={{ ...mono, fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
                    <Clock size={12} color="var(--brand)" /> {formatSessionTime(session)}
                  </p>
                )}
              </>
            ) : (
              <p style={{ ...mono, fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.45)' }}>Brak zaplanowanych terminów</p>
            )}
            {(session?.location || event.location) && (
              <p className="flex items-center gap-2" style={{ ...mono, fontSize: '10px', color: 'rgb(var(--foreground-rgb) / 0.55)' }}>
                <MapPin size={12} color="var(--brand)" /> {session?.location || event.location}
              </p>
            )}
            {spots && (
              <p className="flex items-center gap-2" style={{ ...mono, fontSize: '10px', color: full ? '#ef4444' : 'rgb(var(--foreground-rgb) / 0.55)' }}>
                <Users size={12} color={full ? '#ef4444' : 'var(--brand)'} />
                {full ? 'Brak wolnych miejsc' : `Wolne miejsca: ${left} / ${spots.capacity}`}
              </p>
            )}
          </div>

          <div className="mt-auto pt-5 flex items-center justify-between gap-3">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--brand)', letterSpacing: '0.04em' }}>
              {formatPrice(event.price)}
            </span>
            <span style={{ ...mono, fontSize: '9px', color: 'rgb(var(--foreground-rgb) / 0.5)' }}>Szczegóły →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}