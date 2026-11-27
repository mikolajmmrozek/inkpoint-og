import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { BLOCK_TYPES, newBlock } from '@/lib/marketing';
import { fieldStyle, labelStyle, selectStyle } from '@/lib/marketingUi';

const TYPE_LABELS = Object.fromEntries(BLOCK_TYPES.map(item => [item.key, item.label]));

export default function BlockEditor({ blocks, onChange, t }) {
  const patch = (index, value) => onChange(blocks.map((block, i) => (i === index ? { ...block, ...value } : block)));
  const remove = (index) => onChange(blocks.filter((_, i) => i !== index));
  const move = (index, direction) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div key={index} className="p-3" style={{ border: `0.5px solid ${t.border}`, borderRadius: 'var(--radius)' }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)' }}>
                {TYPE_LABELS[block.type] || block.type}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="W górę" style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: t.muted, opacity: index === 0 ? 0.3 : 1, padding: 4 }}><ArrowUp size={12} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label="W dół" style={{ background: 'none', border: 'none', cursor: index === blocks.length - 1 ? 'default' : 'pointer', color: t.muted, opacity: index === blocks.length - 1 ? 0.3 : 1, padding: 4 }}><ArrowDown size={12} /></button>
                <button type="button" onClick={() => remove(index)} aria-label="Usuń blok" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: 4 }}><Trash2 size={12} /></button>
              </div>
            </div>

            {(block.type === 'heading' || block.type === 'text') && (
              <textarea
                value={block.text || ''}
                onChange={event => patch(index, { text: event.target.value })}
                rows={block.type === 'heading' ? 1 : 3}
                style={{ ...fieldStyle(t), resize: 'vertical' }}
                placeholder={block.type === 'heading' ? 'Nagłówek wiadomości' : 'Treść akapitu'}
              />
            )}

            {block.type === 'button' && (
              <div className="space-y-1">
                <input value={block.text || ''} onChange={event => patch(index, { text: event.target.value })} style={fieldStyle(t)} placeholder="Tekst przycisku" />
                <input value={block.url || ''} onChange={event => patch(index, { url: event.target.value })} style={fieldStyle(t)} placeholder="{{app_url}}/booking" />
              </div>
            )}

            {block.type === 'image' && (
              <div className="space-y-1">
                <input value={block.image_url || ''} onChange={event => patch(index, { image_url: event.target.value })} style={fieldStyle(t)} placeholder="Adres zdjęcia (https://…)" />
                <input value={block.text || ''} onChange={event => patch(index, { text: event.target.value })} style={fieldStyle(t)} placeholder="Opis zdjęcia" />
              </div>
            )}

            {(block.type === 'heading' || block.type === 'text' || block.type === 'button' || block.type === 'image') && (
              <div className="mt-2" style={{ maxWidth: 140 }}>
                <span style={labelStyle(t)}>Wyrównanie</span>
                <select value={block.align || 'left'} onChange={event => patch(index, { align: event.target.value })} style={selectStyle(t)}>
                  <option value="left">Do lewej</option>
                  <option value="center">Wyśrodkowane</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {BLOCK_TYPES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange([...blocks, newBlock(key)])}
            className="flex items-center gap-1"
            style={{ background: 'none', border: `0.5px dashed ${t.border}`, borderRadius: 'var(--radius)', padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}
          >
            <Plus size={10} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}