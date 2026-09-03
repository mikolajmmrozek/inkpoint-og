import { useState } from 'react';
import { FileText } from 'lucide-react';
import FilePreviewModal from './FilePreviewModal';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function MessageContent({ message, t, isAdmin }) {
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const text = message.message || '';
  const attachments = message.attachments || [];
  const linkColor = isAdmin ? 'rgba(245,240,235,0.95)' : 'var(--brand)';

  const renderText = (txt) => {
    if (!txt) return null;
    const parts = txt.split(URL_REGEX);
    return parts.map((part, i) => {
      if (part.match(URL_REGEX)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' }}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {text && (
        <p style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {renderText(text)}
        </p>
      )}
      {attachments.length > 0 && (
        <div className={text ? 'mt-2' : ''} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {attachments.map((att, idx) => {
            if (att.type === 'image') {
              return (
                <img
                  key={idx}
                  src={att.url}
                  alt={att.name || 'image'}
                  onClick={() => setPreviewAttachment(att)}
                  style={{ width: '120px', height: '120px', objectFit: 'cover', cursor: 'pointer', border: `0.5px solid ${isAdmin ? 'rgba(245,240,235,0.2)' : t.border}` }}
                />
              );
            }
            return (
              <button
                key={idx}
                onClick={() => setPreviewAttachment(att)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: `0.5px solid ${isAdmin ? 'rgba(245,240,235,0.2)' : t.border}`, background: 'transparent', cursor: 'pointer' }}
              >
                <FileText size={16} color={isAdmin ? '#F5F0EB' : 'var(--brand)'} />
                <span style={{ fontSize: '11px', color: isAdmin ? '#F5F0EB' : t.text, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.name || (att.type === 'pdf' ? 'Plik PDF' : 'Plik')}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {previewAttachment && (
        <FilePreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </>
  );
}