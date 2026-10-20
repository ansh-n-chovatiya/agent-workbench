import { h, Fragment } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Info } from 'lucide-preact';
import { placeTip } from '../layout.mjs';

// The (i) beside a label: keyboard focusable, opens on hover or focus, closes on Escape, blur, leave or scroll.
// It is portaled with fixed positioning so the panel's scroller never clips it, and it sits above the row it explains.
export function InfoTip({ label, text }) {
  const button = useRef(), id = useId();
  const [pos, setPos] = useState(null);
  const show = () => {
    if (!button.current) return;
    const panel = button.current.closest('.settings')?.getBoundingClientRect(); // stay inside the panel, never over the rail or preview
    setPos(placeTip(button.current.getBoundingClientRect(), panel && panel.width >= 280 ? { left: panel.left, width: panel.width, height: innerHeight } : { left: 0, width: innerWidth, height: innerHeight }));
  };
  const hide = () => setPos(null);
  useEffect(() => {
    if (!pos) return undefined;
    const close = () => hide();
    addEventListener('scroll', close, true); addEventListener('resize', close);
    return () => { removeEventListener('scroll', close, true); removeEventListener('resize', close); };
  }, [!!pos]);
  if (!text) return null;
  return <>
    <button ref={button} type="button" class="info-tip" aria-label={`About ${label}`} aria-describedby={pos ? id : undefined}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onKeyDown={e => { if (e.key === 'Escape' && pos) { e.stopPropagation(); hide(); } }}>
      <Info size={13} aria-hidden="true" />
    </button>
    {pos && createPortal(<span role="tooltip" id={id} class={`info-bubble side-${pos.side}`} style={{ left: `${pos.left}px`, width: `${pos.width}px`, ...(pos.top !== null ? { top: `${pos.top}px` } : { bottom: `${pos.bottom}px` }) }}>{text}</span>, document.body)}
  </>;
}
