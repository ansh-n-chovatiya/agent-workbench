import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { createThumbnailStrip, stripSlots } from './thumbnails.mjs';

// Opens the thumbnail strip once per recording, a moment after mount so the preview loads first.
export function useThumbnails(duration,enabled = true) {
  const [version,setVersion] = useState(0), ref = useRef(null);
  useEffect(() => {
    if (!(duration > 0) || !enabled) return undefined;
    const strip = createThumbnailStrip({duration,onUpdate:() => setVersion(v => v+1)});
    ref.current = strip; setVersion(v => v+1);
    const timer = setTimeout(() => strip.start(),600);
    return () => { clearTimeout(timer); strip.close(); ref.current = null; };
  },[duration,enabled]);
  return {strip:ref.current,version};
}

// Draws the frames that are decoded so far across the block; missing slots show the block's gradient.
export function Filmstrip({strip,version,start,end,width,height}) {
  const canvas = useRef();
  const w = Math.max(1,Math.min(4096,Math.round(width))), hgt = Math.max(1,Math.round(height));
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const dpr = Math.min(2,devicePixelRatio || 1);
    if (el.width !== Math.round(w*dpr) || el.height !== Math.round(hgt*dpr)) { el.width = Math.round(w*dpr); el.height = Math.round(hgt*dpr); }
    const ctx = el.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,hgt);
    if (!strip) return;
    for (const slot of stripSlots(w,hgt,start,end,strip.aspect)) {
      const frame = strip.at(slot.t); if (!frame) continue;
      const scale = Math.max(slot.width/frame.width,hgt/frame.height), dw = frame.width*scale, dh = frame.height*scale;
      ctx.save(); ctx.beginPath(); ctx.rect(slot.x,0,slot.width,hgt); ctx.clip();
      ctx.drawImage(frame,slot.x+(slot.width-dw)/2,(hgt-dh)/2,dw,dh); ctx.restore();
    }
  },[strip,version,start,end,w,hgt]);
  return <canvas ref={canvas} class="filmstrip" aria-hidden="true" style={{width:w,height:hgt}}/>;
}
