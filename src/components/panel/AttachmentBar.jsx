import { useState } from 'react';
import { Paperclip, X, Loader2, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AttachmentBar({ attachments, setAttachments, t }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        return {
          url: file_url,
          type: isImage ? 'image' : isPdf ? 'pdf' : 'file',
          name: file.name,
        };
      }));
      setAttachments(prev => [...(prev || []), ...uploaded]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => (prev || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="mb-2">
      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', border: `0.5px solid ${t.border}` }}>
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px' }}>
                  <FileText size={14} color="var(--brand)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: t.muted, textTransform: 'uppercase' }}>PDF</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(idx)}
                style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', background: 'var(--brand)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
              >
                <X size={10} color="#FFF" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label style={{ cursor: uploading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', border: `0.5px solid ${t.border}`, fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {uploading ? 'WYSYŁANIE...' : 'ZAŁĄCZ PLIK'}
        <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileSelect} style={{ display: 'none' }} disabled={uploading} />
      </label>
    </div>
  );
}