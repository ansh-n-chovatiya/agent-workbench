import { h, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { outputAt, sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { zoomDepth } from '../scripts/lib/compose/composition.mjs';
import * as ops from './edit-ops.mjs';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Popover } from './ui/popover.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { Separator } from './ui/separator.jsx';
import { ToggleGroup } from './ui/toggle-group.jsx';
import { Badge } from './ui/badge.jsx';
import { isTyping } from './helpers.mjs';

const clock = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5,'0')}`;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
export function Timeline({ state, store, time, setTime, setPlaying, selection, setSelection }) {
  const { composition: c, plan, project } = state;
  const [scale,setScale] = useState(80), [output,setOutput] = useState(false), [error,setError] = useState('');
  const [splits,setSplits] = useState([]), [speedOpen,setSpeedOpen] = useState(false), [rate,setRate] = useState(2);
  const [depth,setDepth] = useState(1.7), [editing,setEditing] = useState(null), [draft,setDraft] = useState(null);
  const scroller = useRef(), lanes = useRef(), gesture = useRef(null), anchor = useRef(null);
  const duration = project?.record.durationSec ?? 0, map = plan?.timemap;
  const sourceT = map ? sourceAt(map,time).t : 0;
  const context = { duration, plan };
  const working = c && plan ? {...c,zoom:{...c.zoom,regions:c.zoom.regions.length && !c.zoom.enabled ? c.zoom.regions : plan.regions}} : c;
  const shown = draft ?? working;
  const cues = shown?.captions.cues ?? plan?.cues ?? [];
  const steps = project?.events.steps ?? [];
  const clicks = project?.events.clicks ?? [];
  // Cut intervals collapse in output view; their markers remain selectable for restore.
  function displayTime(t) {
    if (!output || !map) return t;
    const mapped = outputAt(map,t);
    if (mapped !== null) return mapped;
    const next = map.segments.find(s => s.start >= t);
    return next?.outputStart ?? map.mainEnd;
  }
  const extent = output ? map?.outputDuration ?? duration : duration;
  const width = Math.max(600,extent*scale);
  const px = t => displayTime(t)*scale;
  const style = (start,end) => ({left:px(start),width:Math.max(4,px(end)-px(start))});
  const fromClient = x => {
    const t = clamp((x-lanes.current.getBoundingClientRect().left)/scale,0,extent);
    return output && map ? sourceAt(map,t).t : t;
  };
  const snap = (t,alt) => {
    t = clamp(t,0,duration);
    if (!alt) {
      const points = [sourceT,...steps.flatMap(s => [s.tStart,s.tEnd]),...clicks.map(c => c.t),...splits];
      const nearest = points.reduce((best,p) => best === null || Math.abs(px(p)-px(t)) < Math.abs(px(best)-px(t)) ? p : best,null);
      if (nearest !== null && Math.abs(px(nearest)-px(t)) < 8) t = nearest;
    }
    return clamp(ops.snapFrame(t),0,duration);
  };
  function commit(operation) {
    try { const next = operation(); store.setComposition(next); setError(''); return true; }
    catch(e) { setError(e.message); return false; }
  }
  function seek(t) {
    setPlaying(false);
    setTime(outputAt(map,t) ?? displayOutput(t));
  }
  function displayOutput(t) { return map.segments.find(s => s.start >= t)?.outputStart ?? map.mainEnd; }
  function split() {
    ops.splitAt(c,sourceT); setSplits(values => [...new Set([...values,ops.snapFrame(sourceT)])].sort((a,b) => a-b));
    setError('Split boundary added; select either side to cut or change speed.');
  }
  function selectedRange() {
    if (selection?.type === 'range') return selection;
    if (selection?.type === 'speed') return c.edits.speeds[selection.index];
    throw new Error('Select a range on the Video track first.');
  }
  function cut() { commit(() => { const r = selectedRange(); return ops.cutRange(c,r.start,r.end,context); }); }
  function speed(value) { commit(() => { const r = selectedRange(); const next = ops.setSpeed(c,r.start,r.end,value,context); setSelection({type:'range',start:r.start,end:r.end}); return next; }); }
  function addZoom() {
    const start = ops.snapFrame(sourceT), next = working.zoom.regions.find(z => z.tStart >= start);
    const end = Math.min(duration,start+2,next?.tStart ?? duration);
    if (commit(() => ops.addZoomRegion(working,{tStart:start,tEnd:end,x:project.events.viewport.width/2,y:project.events.viewport.height/2,depth},context))) {
      const region = store.getState().composition.zoom.regions.find(z => z.tStart === start);
      setSelection({type:'zoom',id:region.id});
    }
  }
  function addCue() {
    const start = ops.snapFrame(sourceT), next = cues.find(cue => cue.start >= start);
    if (commit(() => ops.addCaption(c,{text:'New caption',start,end:Math.min(duration,start+2,next?.start ?? duration)},context))) {
      const cue = store.getState().composition.captions.cues.find(cue => cue.start === start);
      setSelection({type:'caption',id:cue.id}); setEditing({id:cue.id,text:cue.text});
    }
  }
  function remove() {
    if (selection?.type === 'zoom') commit(() => ops.deleteZoomRegion(working,selection.id,context));
    else if (selection?.type === 'caption') commit(() => ops.deleteCaption(c,selection.id,context));
    else if (selection?.type === 'speed') commit(() => ops.clearSpeed(c,selection.index,context));
    else cut();
  }
  function restore(index = selection?.index) { commit(() => ops.restoreRange(c,index,context)); }
  function itemRange(sel,base = working) {
    if (sel.type === 'zoom') { const z = base.zoom.regions.find(z => z.id === sel.id); return z && {start:z.tStart,end:z.tEnd}; }
    if (sel.type === 'caption') return (base.captions.cues ?? plan.cues).find(q => q.id === sel.id);
    if (sel.type === 'speed') return base.edits.speeds[sel.index];
    return sel.type === 'range' ? sel : null;
  }
  function moveItem(base,sel,start,end) {
    if (sel.type === 'zoom') return ops.updateZoomRegion(base,sel.id,{tStart:start,tEnd:end},context);
    if (sel.type === 'caption') return ops.setCaption(base,sel.id,{start,end},context);
    if (sel.type === 'speed') {
      const rate = base.edits.speeds[sel.index].rate;
      return ops.setSpeed(ops.clearSpeed(base,sel.index,context),start,end,rate,context);
    }
  }
  function movedSelection(next,sel,start) {
    if (sel.type !== 'speed') return sel;
    const index = next.edits.speeds.findIndex(r => r.start <= ops.snapFrame(start) && r.end > ops.snapFrame(start));
    return index < 0 ? null : {type:'speed',index};
  }
  useEffect(() => {
    if (!plan) return;
    const keydown = e => {
      if (isTyping(e.target) || document.querySelector('[role="dialog"], [role="listbox"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (['s','x','z','c','delete','backspace'].includes(key)) {
        if (e.target.closest('button') && ['delete','backspace'].includes(key)) return;
        e.preventDefault(); ({s:split,x:cut,z:addZoom,c:addCue,delete:remove,backspace:remove})[key]();
      } else if (['ArrowLeft','ArrowRight'].includes(e.key) && selection && !e.target.closest('button')) {
        e.preventDefault(); const delta = (e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/60;
        const r = itemRange(selection);
        if (!r) return;
        if (selection.type === 'range') setSelection({...selection,start:clamp(r.start+delta,0,duration-(r.end-r.start)),end:clamp(r.start+delta,0,duration-(r.end-r.start))+(r.end-r.start)});
        else commit(() => { const next = moveItem(working,selection,r.start+delta,r.end+delta); setSelection(movedSelection(next,selection,r.start+delta)); return next; });
      }
    };
    addEventListener('keydown',keydown); return () => removeEventListener('keydown',keydown);
  });
  useEffect(() => () => { gesture.current?.cleanup?.(); }, []);
  function drag(e,sel,edge) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.focus(); setSelection(sel); setPlaying(false);
    const base = working, r = itemRange(sel,base), origin = fromClient(e.clientX);
    let final = null, finalStart = r.start, moved = false;
    const move = event => {
      if (Math.abs(event.clientX-e.clientX)<3 && !moved) return;
      moved = true;
      const t = fromClient(event.clientX); let start = r.start, end = r.end;
      if (edge === 'start') start = snap(t,event.altKey);
      else if (edge === 'end') end = snap(t,event.altKey);
      else { start = snap(r.start+t-origin,event.altKey); end = start+r.end-r.start; }
      try { final = moveItem(base,sel,start,end); finalStart = start; setDraft(final); setError(''); }
      catch(err) { final = null; setDraft(null); setError(err.message); }
    };
    const cleanup = () => { removeEventListener('pointermove',move); removeEventListener('pointerup',up); removeEventListener('pointercancel',cancel); };
    const up = () => { cleanup(); if (final) { store.setComposition(final); setSelection(movedSelection(final,sel,finalStart)); } setDraft(null); gesture.current = null; };
    const cancel = () => { cleanup(); setDraft(null); gesture.current = null; };
    gesture.current?.cleanup?.(); gesture.current = {cleanup:cancel};
    addEventListener('pointermove',move); addEventListener('pointerup',up); addEventListener('pointercancel',cancel);
  }
  function selectVideo(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.currentTarget.focus();
    const t = snap(fromClient(e.clientX),e.altKey), initial = e.shiftKey && anchor.current !== null ? anchor.current : t;
    anchor.current = initial;
    const select = value => setSelection({type:'range',start:Math.min(initial,value),end:Math.max(initial,value)});
    const boundaries = [...new Set([0,duration,...steps.flatMap(s => [s.tStart,s.tEnd]),...splits])].sort((a,b) => a-b);
    if (e.shiftKey) select(t);
    else setSelection({type:'range',start:boundaries.findLast(b => b <= t) ?? 0,end:boundaries.find(b => b > t) ?? duration});
    seek(t);
    const move = ev => select(snap(fromClient(ev.clientX),ev.altKey));
    const up = () => { removeEventListener('pointermove',move); removeEventListener('pointerup',up); removeEventListener('pointercancel',up); gesture.current = null; };
    gesture.current?.cleanup?.(); gesture.current = {cleanup:up};
    addEventListener('pointermove',move); addEventListener('pointerup',up); addEventListener('pointercancel',up);
  }
  function rulerDrag(e) {
    if (e.button !== 0) return;
    const seekRuler = x => { setPlaying(false); if (output) setTime(clamp((x-lanes.current.getBoundingClientRect().left)/scale,0,extent)); else seek(fromClient(x)); };
    e.preventDefault(); seekRuler(e.clientX);
    const move = ev => seekRuler(ev.clientX);
    const up = () => { removeEventListener('pointermove',move); removeEventListener('pointerup',up); removeEventListener('pointercancel',up); gesture.current = null; };
    gesture.current?.cleanup?.(); gesture.current = {cleanup:up};
    addEventListener('pointermove',move); addEventListener('pointerup',up); addEventListener('pointercancel',up);
  }
  function changeScale(value,clientX) {
    const el = scroller.current, next = clamp(value,10,800), rect = el.getBoundingClientRect();
    const offset = clientX === undefined ? el.clientWidth/2 : clientX-rect.left;
    const position = (el.scrollLeft+offset)/scale;
    setScale(next); requestAnimationFrame(() => { el.scrollLeft = position*next-offset; });
  }
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const wheel = e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); changeScale(scale*Math.exp(-e.deltaY*0.005),e.clientX); } else if (e.shiftKey || Math.abs(e.deltaX)>0) { e.preventDefault(); el.scrollLeft += e.deltaX || e.deltaY; } };
    el.addEventListener('wheel',wheel,{passive:false}); return () => el.removeEventListener('wheel',wheel);
  },[scale,plan]);
  if (!c || !plan) return <p class="empty">Load a recording to edit its timeline.</p>;
  const selectedZoom = shown.zoom.regions.find(z => selection?.type === 'zoom' && z.id === selection.id);
  const ticks = []; const tickStep = [0.25,0.5,1,2,5,10,30,60,120,300,600].find(n => n*scale >= 65) ?? 600;
  for(let t=0;t<=extent;t+=tickStep) ticks.push(t);
  function block(sel,start,end,label,kind) {
    const active = selection?.type === sel.type && (sel.id ? selection.id === sel.id : selection.index === sel.index);
    return <div key={sel.id ?? sel.index} role="button" tabIndex="0" aria-label={`${kind}: ${label}, ${clock(start)} to ${clock(end)}; arrow keys move`} aria-pressed={active}
      class={`timeline-block ${kind} ${active ? 'selected' : ''}`} style={style(start,end)} onPointerDown={e => drag(e,sel)}
      onFocus={() => setSelection(sel)} onClick={() => setSelection(sel)} onDblClick={() => { if(sel.type === 'caption') setEditing({id:sel.id,text:label}); }}
      onKeyDown={e => { if (e.key === 'Enter') { setSelection(sel); if(sel.type === 'caption') setEditing({id:sel.id,text:label}); } }}>
      <Button class="edge start" aria-label={`Resize ${kind} start`} onPointerDown={e => drag(e,sel,'start')} onKeyDown={e => resizeKey(e,sel,'start')} />
      <span>{kind === 'zoom' ? <>{label.split(' · ')[0]} <Badge>{label.split(' · ')[1]}</Badge></> : label}</span><Button class="edge end" aria-label={`Resize ${kind} end`} onPointerDown={e => drag(e,sel,'end')} onKeyDown={e => resizeKey(e,sel,'end')} />
    </div>;
  }
  function resizeKey(e,sel,edge) {
    if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault();e.stopPropagation(); const r = itemRange(sel), delta = (e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/60;
    commit(() => { const start = r.start+(edge === 'start' ? delta : 0); const next = moveItem(working,sel,start,r.end+(edge === 'end' ? delta : 0)); setSelection(movedSelection(next,sel,start)); return next; });
  }
  return <div class="timeline-editor">
    <div class="timeline-toolbar" role="toolbar" aria-label="Timeline edits">
      <Tooltip text="Split at playhead (S)"><Button onClick={split}>Split</Button></Tooltip>
      <Tooltip text="Cut range or delete selection (Delete / X)"><Button onClick={remove}>Cut</Button></Tooltip><Separator />
      <Tooltip text="Change the speed of the selected Video range"><Popover open={speedOpen} onOpenChange={setSpeedOpen} label="Change speed" trigger={<Button>Speed</Button>}>
        <div class="speed-options">{[0.5,1,1.5,2,4,8].map(n => <Button onClick={() => {speed(n);setSpeedOpen(false);}}>{n}x</Button>)}</div>
        <Label>Custom speed <Input aria-label="Custom speed" type="number" min="0.25" max="8" step="0.05" value={rate} onInput={e => setRate(+e.currentTarget.value)} /> x</Label><Button onClick={() => {speed(rate);setSpeedOpen(false);}}>Apply</Button>
      </Popover></Tooltip><Separator />
      <Tooltip text="Add zoom region (Z)"><Button onClick={addZoom}>Add zoom</Button></Tooltip>
      <Tooltip text="Choose the magnification of a zoom region"><Popover label="Zoom depth" trigger={<Button aria-label="Zoom depth">{zoomDepth(selectedZoom?.depth ?? depth)}×</Button>}><Label>Zoom depth<Input aria-label="Zoom depth value" type="number" min="1.05" max="4" step="0.05" value={zoomDepth(selectedZoom?.depth ?? depth)} onInput={e => { const value = +e.currentTarget.value; setDepth(value); if(selectedZoom) commit(() => ops.updateZoomRegion(working,selectedZoom.id,{depth:value},context)); }} /></Label></Popover></Tooltip>
      <Tooltip text="Regenerate automatic zooms; preserve manual regions"><Button onClick={() => commit(() => ops.autoZoomRegenerate(working,project.events,project.record))}>Auto zoom</Button></Tooltip><Separator />
      <Tooltip text="Add caption (C)"><Button onClick={addCue}>Add caption</Button></Tooltip><Separator />
      <Tooltip text={selection?.type === 'trim' ? 'Restore the selected removed range' : 'Select a removed range to restore it'}><Button disabled={selection?.type !== 'trim'} onClick={() => restore()}>Restore</Button></Tooltip>
      <div class="time-mode"><Tooltip text="Show source or edited output time"><span><ToggleGroup aria-label="Timeline time" value={output ? 'output' : 'source'} onValueChange={next => setOutput(next === 'output')} options={[{value:'source',label:'Source'},{value:'output',label:'Output'}]} /></span></Tooltip></div>
      <Tooltip text="Zoom timeline out (Ctrl/⌘ + wheel)"><Button size="icon" aria-label="Zoom timeline out" onClick={() => changeScale(scale/1.4)}>−</Button></Tooltip><Tooltip text="Zoom timeline in (Ctrl/⌘ + wheel)"><Button size="icon" aria-label="Zoom timeline in" onClick={() => changeScale(scale*1.4)}>+</Button></Tooltip>
    </div>
    <div class="timeline-summary"><strong>Result {clock(map.outputDuration)}</strong><span>{clock(c.edits.trims.reduce((n,r) => n+r.end-r.start,0))} removed · {c.edits.trims.length} {c.edits.trims.length === 1 ? 'cut' : 'cuts'}</span><span>{output ? 'OUTPUT' : 'SOURCE'} TIME · Drag to select · Alt disables snapping</span></div>
    {error && <p role="status" class="timeline-message">{error}</p>}
    {selectedZoom && <p class="timeline-message">Click the preview to set this region’s focus at the playhead.</p>}
    <div class="timeline-grid"><div class="track-labels" aria-hidden="true">{['Time','Video','Speed','Zoom','Captions','Cursor'].map(label => <div>{label}</div>)}</div>
      <div class="timeline-scroll" ref={scroller} tabIndex="0" aria-label="Timeline; scroll horizontally to pan">
        <div class="timeline-lanes" ref={lanes} style={{width}}>
          <div class="timeline-ruler" role="slider" tabIndex="0" aria-label={`Playhead in ${output ? 'output' : 'source'} time`} aria-valuemin="0" aria-valuemax={extent} aria-valuenow={output ? time : sourceT} onPointerDown={rulerDrag}
            onKeyDown={e => { if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {e.preventDefault();e.stopPropagation();const next = e.key === 'Home' ? 0 : e.key === 'End' ? extent : clamp((output ? time : sourceT)+(e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/60,0,extent); if(output) {setPlaying(false);setTime(next);} else seek(next);} }}>
            {ticks.map(t => <span style={{left:t*scale}}>{clock(t)}</span>)}
          </div>
          <div class="timeline-track video-track" tabIndex="0" aria-label="Video; drag or shift click to select a source range" onPointerDown={selectVideo}>
            {steps.map(step => <div class="step-block" role="button" tabIndex="0" aria-label={`Select video step ${step.id}`} style={style(step.tStart,step.tEnd)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setSelection({type:'range',start:step.tStart,end:step.tEnd}); seek(step.tStart); } }}>{project.storyboard.steps.find(s => s.id === step.id)?.name ?? project.storyboard.steps.find(s => s.id === step.id)?.title ?? project.storyboard.steps.find(s => s.id === step.id)?.caption ?? step.id}</div>)}
            {splits.map(t => <i class="split-line" style={{left:px(t)}} />)}
            {c.edits.trims.map((r,index) => <Button class={`trim-block ${selection?.type === 'trim' && selection.index === index ? 'selected' : ''}`} style={style(r.start,r.end)} aria-label={`Removed ${clock(r.start)} to ${clock(r.end)}`} onPointerDown={e => e.stopPropagation()} onClick={() => setSelection({type:'trim',index})}>Removed</Button>)}
            {selection?.type === 'range' && <div class="range-selection" style={style(selection.start,selection.end)} />}
          </div>
          <div class="timeline-track">{shown.edits.speeds.map((r,index) => block({type:'speed',index},r.start,r.end,`${r.rate}x`,'speed'))}</div>
          <div class="timeline-track">{shown.zoom.regions.map(z => block({type:'zoom',id:z.id},z.tStart,z.tEnd,`${zoomDepth(z.depth)}x · ${z.source}`,'zoom'))}</div>
          <div class="timeline-track">{cues.map(cue => block({type:'caption',id:cue.id},cue.start,cue.end,cue.text,'caption'))}</div>
          <div class="timeline-track cursor-track">{clicks.map(click => <span class="click-marker" style={{left:px(click.t)}} title={`Click at ${clock(click.t)}`} />)}</div>
          <div class="timeline-playhead" style={{left:(output ? time : sourceT)*scale}} />
        </div>
      </div>
    </div>
    {editing && <form class="caption-inline" onSubmit={e => { e.preventDefault(); if(commit(() => ops.setCaption(c,editing.id,{text:editing.text},context))) setEditing(null); }}>
      <Label>Caption text <Input autoFocus maxLength="140" value={editing.text} onInput={e => setEditing({...editing,text:e.currentTarget.value})} onKeyDown={e => {if(e.key === 'Escape') setEditing(null);}} /></Label><Button type="submit">Save caption</Button><Button type="button" onClick={() => setEditing(null)}>Cancel</Button>
    </form>}
    {!!c.edits.trims.length && <details class="removed-list"><summary>Removed ({c.edits.trims.length})</summary>{c.edits.trims.map((r,index) => <div><span>{clock(r.start)} – {clock(r.end)} · {clock(r.end-r.start)}</span><Button onClick={() => restore(index)}>Restore</Button></div>)}</details>}
  </div>;
}
