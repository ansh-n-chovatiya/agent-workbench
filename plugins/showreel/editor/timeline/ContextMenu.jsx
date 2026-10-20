import { h } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Scissors, Gauge, Trash2, RotateCcw, Hand, WandSparkles, Copy, Pencil, Mic, Music, ZoomIn, Captions } from 'lucide-preact';
export const ICONS = {Scissors,Gauge,Trash2,RotateCcw,Hand,WandSparkles,Copy,Pencil,Mic,Music,ZoomIn,Captions};

// A small, fixed-position menu with only the actions that are valid for the block it was opened on.
export function ContextMenu({x,y,label,actions,onAction,onClose}) {
  const ref = useRef(), [pos,setPos] = useState({x,y});
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({x:Math.max(8,Math.min(x,innerWidth-r.width-8)),y:y+r.height > innerHeight-8 ? Math.max(8,y-r.height) : y});
  },[x,y,actions.length]);
  useEffect(() => {
    ref.current.querySelector('[role^="menuitem"]:not(:disabled)')?.focus();
    const down = e => { if (!ref.current.contains(e.target)) onClose(); };
    const scroll = () => onClose();
    addEventListener('pointerdown',down,true); addEventListener('wheel',scroll,{capture:true,passive:true}); addEventListener('resize',scroll);
    return () => { removeEventListener('pointerdown',down,true); removeEventListener('wheel',scroll,{capture:true}); removeEventListener('resize',scroll); };
  },[]);
  function keydown(e) {
    const items = [...ref.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (['ArrowDown','ArrowUp','Home','End','Tab'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length-1 : (i+(e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1)+items.length)%items.length;
      items[next]?.focus();
    } else e.stopPropagation();
  }
  return <div ref={ref} role="menu" aria-label={label} class="context-menu" style={{left:pos.x,top:pos.y}} onKeyDown={keydown} onContextMenu={e => e.preventDefault()}>
    {actions.map(a => {
      const Icon = ICONS[a.icon];
      if (a.picks) return <div key={a.id} class="menu-group" role="group" aria-label={a.label}>
        <span class="menu-group-label">{Icon && <Icon size={14} aria-hidden="true"/>}{a.label}</span>
        <div class="menu-picks">{a.picks.map(p => <button key={p.rate} type="button" role="menuitemradio" aria-checked={p.active} aria-label={`Speed ${p.label}`} disabled={a.disabled} onClick={() => onAction(a.id,p.rate)}>{p.label}</button>)}</div>
      </div>;
      return <button key={a.id} type="button" role="menuitem" class={`menu-item ${a.danger ? 'danger' : ''}`} disabled={a.disabled} title={a.disabled ? a.hint : undefined} onClick={() => onAction(a.id)}>
        {Icon && <Icon size={14} aria-hidden="true"/>}<span>{a.label}</span>{a.hint && !a.disabled && <kbd>{a.hint}</kbd>}
      </button>;
    })}
  </div>;
}
