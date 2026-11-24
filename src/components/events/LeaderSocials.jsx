import { Instagram, Facebook, Globe } from 'lucide-react';

const TikTokIcon = ({ size = 13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M12.5 2h2.7c.2 1.9 1.3 3.4 3.3 3.8v2.7c-1.2 0-2.4-.4-3.4-1.1v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.8a2.8 2.8 0 1 0 2 2.7V2z" />
  </svg>
);

const ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
  website: Globe,
};

// Ikony social mediów prowadzącego — wyświetlamy wyłącznie podane linki.
export default function LeaderSocials({ links = [] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
      {links.map(({ kind, url }) => {
        const Icon = ICONS[kind];
        if (!Icon) return null;
        return (
          <a
            key={kind}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={kind === 'website' ? 'Strona www' : kind}
            style={{ color: 'rgb(var(--foreground-rgb) / 0.55)', display: 'flex', transition: 'color 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--foreground-rgb) / 0.55)'; }}
          >
            <Icon size={13} />
          </a>
        );
      })}
    </div>
  );
}