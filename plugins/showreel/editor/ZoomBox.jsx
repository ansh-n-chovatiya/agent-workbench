import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { stateAt } from '../scripts/lib/compose/plan.mjs';
import { zoomBox, moveZoomBox, resizeZoomBox } from './zoom-box.mjs';
import { zoomScreenBox, screenToZoomPoint, regionAtTime } from './zoom-screen.mjs';
export function ZoomBox({plan,region,time,size,onChange,onPause}) {
  const gesture = useRef(null);
  useEffect(()=>()=>gesture.current?.(),[]);
  useEffect(()=>{gesture.current?.();},[region.id]);
  const state = stateAt(plan,time);
  if (state.section !== 'main' || !size.width || !size.height) return null;
  const current = regionAtTime(region,state.sourceT), viewport = plan.viewport;
  const rect = zoomScreenBox(zoomBox(current,viewport),plan,state.camera,size);
  const f = plan.layout.frame, manual = region.source==='manual';
  function start(e,corner) {
    if (!manual || e.button!==0) return;
    e.preventDefault();e.stopPropagation();onPause();
    // Freeze the inverse transform at pointer-down; a moving camera must not feed back into a drag.
    const origin = {x:e.clientX,y:e.clientY}, camera=state.camera;
    const parent = e.currentTarget.closest('.preview-canvas-wrap').getBoundingClientRect();
    let final=null;
    const move = event => {
      const patch = corner
        ? resizeZoomBox(current,corner,screenToZoomPoint({x:event.clientX-parent.left,y:event.clientY-parent.top},plan,camera,size),viewport)
        : moveZoomBox(current,(event.clientX-origin.x)/rect.sx,(event.clientY-origin.y)/rect.sy,viewport);
      // Manual mode has one fixed focus for the whole region.
      final = {...patch,keyframes:(patch.keyframes ?? current.keyframes).map(k=>({...k,t:region.tStart}))};
      onChange(final,'draft');
    };
    const clean=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',cancel);removeEventListener('keydown',key,{capture:true});gesture.current=null;};
    const up=()=>{clean();onChange(final,final ? 'commit' : 'cancel');};
    const cancel=()=>{clean();onChange(null,'cancel');};
    const key=event=>{if(event.key==='Escape'){event.preventDefault();cancel();}};
    gesture.current?.();gesture.current=cancel;
    addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',cancel);addEventListener('keydown',key,{capture:true});
  }
  function nudge(e,corner) {
    if(!manual || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();e.stopPropagation();
    const amount=e.shiftKey?20:4,dx=e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,dy=e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0;
    const box=zoomBox(current,viewport);
    const patch=corner ? resizeZoomBox(current,corner,{x:box.x+(corner.endsWith('e')?box.w:0)+dx,y:box.y+(corner.startsWith('s')?box.h:0)+dy},viewport) : moveZoomBox(current,dx,dy,viewport);
    onPause();onChange(patch,'commit');
  }
  return <div class="zoom-box-layer" style={{clipPath:`inset(${f.y/plan.output.height*100}% ${(1-(f.x+f.w)/plan.output.width)*100}% ${(1-(f.y+f.h)/plan.output.height)*100}% ${f.x/plan.output.width*100}%)`}}>
    <div class={`zoom-box ${manual?'manual':'auto'}`} data-testid="zoom-box" tabIndex={manual?0:undefined} role="group" onKeyDown={e=>nudge(e)} aria-label={`${manual?'Manual':'Auto'} zoom crop`} style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}} onPointerDown={e=>start(e)}>
      <span class="zoom-box-label">{manual ? `${region.depth}x` : 'Auto'}</span>
      {manual && ['nw','ne','sw','se'].map(corner=><button type="button" class={`zoom-handle ${corner}`} aria-label={`Resize zoom ${corner}`} onPointerDown={e=>start(e,corner)} onKeyDown={e=>nudge(e,corner)}/>)}
    </div>
  </div>;
}
