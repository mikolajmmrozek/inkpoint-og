import { useRef, useEffect, useState } from 'react';

export default function SignatureCanvas({ value, onChange, label, clearLabel, showErrors, theme, textMuted, borderColor }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  const canvasBg = theme === 'light' ? '#ffffff' : '#111111';
  const strokeColor = theme === 'light' ? '#111111' : '#F5F0EB';
  const borderColorFinal = showErrors && !value ? 'var(--brand)' : borderColor || (theme === 'light' ? '#E5E5E5' : '#262626');
  const placeholderColor = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(245,240,235,0.15)';
  const bc = borderColor || '#262626';
  const tm = textMuted || 'rgba(245,240,235,0.5)';

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = value;
    } else {
      setIsEmpty(true);
    }
  }, [canvasBg, value]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    if (clientX === undefined || clientY === undefined) return null;
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    x = Math.max(0, Math.min(x, canvas.width));
    y = Math.max(0, Math.min(y, canvas.height));
    return { x, y };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    if (!pos) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const pos = getPos(e, canvas);
    if (!pos) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange(dataUrl);
    } catch (e) {
      // Canvas might be tainted — still allow saving
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange('');
  };

  return (
    <div>
      {label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: showErrors && !value ? 'var(--brand)' : tm, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
          {label} * {showErrors && !value && '(wymagane)'}
        </p>
      )}
      <div style={{ border: `0.5px solid ${borderColorFinal}`, background: canvasBg, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          style={{ width: '100%', height: '150px', display: 'block', cursor: 'crosshair', touchAction: 'none', backgroundColor: canvasBg }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: placeholderColor, letterSpacing: '0.1em' }}>
              ✍ {label || 'Sign here'}
            </p>
          </div>
        )}
      </div>
      <button type="button" onClick={clear} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: tm, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', marginTop: '6px', padding: 0 }}>
        ↺ {clearLabel || 'Clear'}
      </button>
    </div>
  );
}