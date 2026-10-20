import { h, Fragment } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { outputAt, sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { zoomDepth } from '../scripts/lib/compose/composition.mjs';
import * as ops from './edit-ops.mjs';
import { clipsOf, splitClipAt, deleteClip, restoreClip, setClipSpeed } from './clips.mjs';
import { setZoomMode } from './zoom-box.mjs';
import { clamp, clock, shortClock, displayTime as toDisplay, snapTime, itemRange, LAYERS, layerRows, missingLayers, rowHeights, ticks, fitScale, sliderFromScale, scaleFromSlider, MAX_SCALE, hasUserEdits } from './timeline-model.mjs';
import { clampZoomRange, dragCreateRange, zoomPlacement, duplicateRange, DEFAULT_ZOOM_SEC } from './timeline/zoom-geometry.mjs';
import { menuActions, quickActions } from './timeline/context-menu.mjs';
import { ContextMenu, ICONS } from './timeline/ContextMenu.jsx';
import { Filmstrip, useThumbnails } from './timeline/Filmstrip.jsx';
import { ScenesStrip } from './ScenesStrip.jsx';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Popover } from './ui/popover.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { ToggleGroup } from './ui/toggle-group.jsx';
import { Slider } from './ui/slider.jsx';
import { ZoomIn, WandSparkles, Scissors, Layers, VolumeX, Film, Captions, Mic, Music, Hand, Minus, Plus, Maximize2, X, Clock, CircleAlert, Info, Check } from 'lucide-preact';
import { isTyping } from './helpers.mjs';
import { voiceBlocks, musicBar } from './audio-view.mjs';
import { baseName } from './voice-status.mjs';
import { readPreference, writePreference } from './layout.mjs';

const LAYER_ICONS = {clip:Film,zoom:ZoomIn,captions:Captions,voice:Mic,music:Music};
const RULER_HEIGHT = 26;
const BLOCK_GAP = 4; // visible gap between touching zoom or caption blocks
const openTopic = label => document.querySelector('nav[aria-label="Editor topics"]')?.querySelector(`button[aria-label="${label}"]`)?.click();
const same = (a,b) => a?.type === b?.type && a?.id === b?.id;

// The two or three most common actions, floating on a selected block while it is hovered or focused.
function MiniToolbar({kind,item,sourceT,onAction}) {
  const actions = quickActions(kind,item,{sourceT});
  if (!actions.length) return null;
  return <div class="mini-toolbar" role="toolbar" aria-label={`${kind} quick actions`} onPointerDown={e => e.stopPropagation()}>
    {actions.map(a => { const Icon = ICONS[a.icon]; return <Tooltip key={a.id} text={a.label}><Button size="icon" class={a.danger ? 'danger' : ''} aria-label={a.label} disabled={a.disabled} onClick={e => { e.stopPropagation(); onAction(a.id,kind,item); }}><Icon size={14} aria-hidden="true"/></Button></Tooltip>; })}
  </div>;
}

export function Timeline({state,store,time,setTime,setPlaying,selection,setSelection,voice:voiceController = null}) {
  const {composition:c,plan,project} = state;
  const [scale,setScale] = useState(null), [output,setOutput] = useState(false);
  const [notice,setNotice] = useState(null), [draft,setDraft] = useState(null), [editing,setEditing] = useState(null);
  const [ghost,setGhost] = useState(null), [guide,setGuide] = useState(null), [menu,setMenu] = useState(null);
  const [layerOpen,setLayerOpen] = useState(false), [added,setAdded] = useState({});
  const [size,setSize] = useState({width:0,height:0,labels:132});
  const [hint,setHint] = useState(() => readPreference('hint-dismissed','') !== 'yes');
  const grid = useRef(), lanes = useRef(), labelsRef = useRef(), gesture = useRef(null), userScaled = useRef(false);
  const duration = project?.record.durationSec ?? 0, map = plan?.timemap, fps = plan?.output.fps ?? 60;
  const sourceT = map ? sourceAt(map,time).t : 0, context = {duration,plan};
  const working = c && plan ? {...c,zoom:{...c.zoom,regions:c.zoom.regions.length && !c.zoom.enabled ? c.zoom.regions : plan.regions}} : c;
  const shown = draft ?? working, cues = shown?.captions.cues ?? plan?.cues ?? [];
  const clips = c ? clipsOf(c,duration) : [], clicks = project?.events.clicks ?? [];
  const displayTime = t => toDisplay(map,t,output);
  const extent = output ? map?.outputDuration ?? duration : duration;
  const minScale = fitScale(size.width,extent), px = t => displayTime(t)*(scale ?? minScale);
  const width = Math.max(1,extent*(scale ?? minScale));
  const geometry = (start,end) => ({left:px(start),width:Math.max(4,px(end)-px(start))});
  const fromClient = x => {
    const t = clamp((x-lanes.current.getBoundingClientRect().left)/(scale ?? minScale),0,extent);
    return output && map ? sourceAt(map,t).t : t;
  };
  const snap = (t,alt,extra = []) => snapTime(t,{alt,duration,fps,px,points:[sourceT,...clips.flatMap(c => [c.start,c.end]),...clicks.map(c => c.t),...extra]});
  const {strip,version:thumbVersion} = useThumbnails(plan ? duration : 0);

  // Notices live in the toolbar, never over the tracks.
  function notify(text,kind = 'info') { setNotice({text,kind,at:Date.now()}); }
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(null),notice.kind === 'error' ? 5000 : 3200); return () => clearTimeout(timer); },[notice]);
  function commit(operation) {
    try { const next = operation(); store.setComposition(next); return true; }
    catch (e) { notify(e.message,'error'); return false; }
  }
  function displayOutput(t) { return map.segments.find(s => s.start >= t)?.outputStart ?? map.mainEnd; }
  function seek(t) { setPlaying(false); setTime(outputAt(map,t) ?? displayOutput(t)); }
  const jumpTo = t => { setPlaying(false); setTime(t); };

  // Layout: rows stretch to fill the grid; the scale starts at "fit" until the user zooms.
  useLayoutEffect(() => {
    const el = grid.current; if (!el) return undefined;
    const measure = () => setSize({width:el.clientWidth-(labelsRef.current?.offsetWidth ?? 132),height:el.clientHeight,labels:labelsRef.current?.offsetWidth ?? 132});
    const observer = new ResizeObserver(measure); observer.observe(el); if (labelsRef.current) observer.observe(labelsRef.current); measure();
    return () => observer.disconnect();
  },[!!plan]);
  useEffect(() => { if (!userScaled.current && size.width > 0 && extent > 0) setScale(fitScale(size.width,extent)); },[size.width,extent]);
  function changeScale(value,anchor = null) {
    const el = grid.current, current = scale ?? minScale, next = clamp(value,minScale,MAX_SCALE);
    if (!el || next === current) return;
    userScaled.current = true;
    const playhead = displayTime(sourceT)*current-el.scrollLeft, visible = playhead >= 0 && playhead <= size.width;
    const t = anchor ?? (visible ? displayTime(sourceT) : (el.scrollLeft+size.width/2)/current);
    setScale(next); requestAnimationFrame(() => { el.scrollLeft = Math.max(0,t*next-(t*current-el.scrollLeft)); });
  }
  function fit() { userScaled.current = false; setScale(fitScale(size.width,extent)); if (grid.current) grid.current.scrollLeft = 0; }
  useEffect(() => {
    const el = grid.current; if (!el) return undefined;
    const wheel = e => {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); changeScale((scale ?? minScale)*Math.exp(-e.deltaY*0.005)); }
      else if (e.shiftKey && Math.abs(e.deltaX) === 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
    };
    el.addEventListener('wheel',wheel,{passive:false}); return () => el.removeEventListener('wheel',wheel);
  },[scale,minScale,plan,size.width,sourceT]);

  // Edits.
  function split() {
    if (commit(() => splitClipAt(c,sourceT,context))) {
      const clip = clipsOf(store.getState().composition,duration).find(r => r.start <= sourceT && r.end > sourceT);
      if (clip) setSelection({type:'clip',id:clip.id});
    }
  }
  function createZoom(start,end) {
    const base = {...working,zoom:{...working.zoom,enabled:true,autoSuggest:false}}, viewport = project.events.viewport;
    const depth = clamp(zoomDepth(working.zoom.depth) || 1.8,1.05,5);
    if (commit(() => ops.addZoomRegion(base,{tStart:start,tEnd:end,x:viewport.width/2,y:viewport.height/2,depth},context))) {
      const region = store.getState().composition.zoom.regions.find(z => Math.abs(z.tStart-ops.snapFrame(start)) < 1e-6);
      if (region) setSelection({type:'zoom',id:region.id});
    }
  }
  function addZoomAt(t = sourceT) {
    const placement = zoomPlacement(working.zoom.regions,t,{duration,length:DEFAULT_ZOOM_SEC});
    if (!placement) { notify('No room for a zoom here. Shorten a neighbour first.'); return; }
    if (placement.existing) { setSelection({type:'zoom',id:placement.existing.id}); notify('A zoom already covers this moment; selected it.'); return; }
    createZoom(placement.start,placement.end);
  }
  function addCaptionAt(t = sourceT) {
    setAdded(v => ({...v,captions:true}));
    let start = ops.snapFrame(t);
    for (const cue of cues) if (start >= cue.start && start < cue.end) start = cue.end;
    const next = cues.find(q => q.start >= start), end = Math.min(duration,start+2,next?.start ?? duration);
    if (end-start < 0.1) { notify('No room for a caption here.'); return; }
    if (commit(() => ops.addCaption({...c,captions:{...c.captions,enabled:true}},{text:'New caption',start,end},context))) {
      const cue = store.getState().composition.captions.cues.find(q => q.start === start);
      if (cue) { setSelection({type:'caption',id:cue.id}); setEditing({id:cue.id,text:cue.text}); }
    }
  }
  function remove(sel = selection) {
    if (!sel) return;
    const clip = clips.find(r => r.id === sel.id);
    let ok = false;
    if (sel.type === 'clip' && clip && !clip.deleted) ok = commit(() => deleteClip(c,clip,context));
    if (sel.type === 'zoom') ok = commit(() => ops.deleteZoomRegion(working,sel.id,context));
    if (sel.type === 'caption') ok = commit(() => ops.deleteCaption(c,sel.id,context));
    if (ok && same(sel,selection)) setSelection(null);
  }
  function moveItem(base,sel,start,end) {
    if (sel.type === 'zoom') return ops.updateZoomRegion({...base,zoom:{...base.zoom,autoSuggest:false}},sel.id,{tStart:start,tEnd:end},context);
    if (sel.type === 'caption') return ops.setCaption(base,sel.id,{start,end},context);
    return base;
  }
  function act(id,kind,item,value) {
    setMenu(null);
    if (kind === 'clip') {
      if (id === 'split') split();
      if (id === 'speed') commit(() => setClipSpeed(c,item,value,context));
      if (id === 'delete') remove({type:'clip',id:item.id});
      if (id === 'restore') commit(() => restoreClip(c,item));
    } else if (kind === 'zoom') {
      if (id === 'auto' || id === 'manual') commit(() => setZoomMode(working,item.id,id,{duration,events:project.events,record:project.record,sourceT,time:sourceT}));
      if (id === 'duplicate') {
        const range = duplicateRange(working.zoom.regions,item,{duration});
        if (!range) { notify('No room after this zoom to duplicate it.'); return; }
        const focus = item.keyframes?.[0] ?? {x:project.events.viewport.width/2,y:project.events.viewport.height/2};
        if (commit(() => ops.addZoomRegion({...working,zoom:{...working.zoom,enabled:true,autoSuggest:false}},{tStart:range.start,tEnd:range.end,x:focus.x,y:focus.y,depth:item.depth},context))) {
          const region = store.getState().composition.zoom.regions.find(z => Math.abs(z.tStart-range.start) < 1e-6);
          if (region) setSelection({type:'zoom',id:region.id});
        }
      }
      if (id === 'delete') remove({type:'zoom',id:item.id});
    } else if (kind === 'caption') {
      if (id === 'edit') { setSelection({type:'caption',id:item.id}); setEditing({id:item.id,text:item.text}); }
      if (id === 'delete') remove({type:'caption',id:item.id});
    } else if (kind === 'voice') {
      if (id === 'regenerate') { if (voiceController) voiceController.generate({stepIds:[item.stepId],force:true}); else openTopic('Audio'); }
      if (id === 'open-audio') openTopic('Audio');
    } else if (kind === 'music') {
      if (id === 'open-audio') openTopic('Audio');
    } else if (kind === 'track') {
      if (id === 'add-zoom') addZoomAt(item.t);
      if (id === 'add-caption') addCaptionAt(item.t);
    }
  }
  function openMenu(e,kind,item,sel = null) {
    e.preventDefault(); e.stopPropagation();
    if (sel) setSelection(sel);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left+Math.min(rect.width/2,80), y = e.clientY || rect.top+rect.height/2;
    const actions = kind === 'track' ? [item.layer === 'zoom' ? {id:'add-zoom',label:'Add zoom here',icon:'ZoomIn'} : {id:'add-caption',label:'Add caption here',icon:'Captions'}] : menuActions(kind,item,{sourceT});
    setMenu({x,y,kind,item,actions,label:`${kind[0].toUpperCase()+kind.slice(1)} actions`,returnTo:e.currentTarget});
  }
  function closeMenu() { const el = menu?.returnTo; setMenu(null); if (el?.isConnected) el.focus(); }
  const menuKey = e => e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey);

  // Keyboard. The listener is registered once; it reads the latest render through a ref so a key pressed right after a click sees the new playhead.
  const live = useRef({}); live.current = {menu,selection,working,cues,sourceT,split,addZoomAt,addCaptionAt,remove,moveItem,commit};
  useEffect(() => {
    if (!plan) return undefined;
    const keydown = e => {
      const {menu,selection,working,cues,sourceT,split,addZoomAt,addCaptionAt,remove,moveItem,commit} = live.current;
      if (menu || isTyping(e.target) || document.querySelector('[role="dialog"], [role="listbox"]') || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const key = e.key.toLowerCase();
      if (['s','z','c','delete','backspace'].includes(key)) {
        e.preventDefault(); ({s:split,z:() => addZoomAt(sourceT),c:() => addCaptionAt(sourceT),delete:() => remove(),backspace:() => remove()})[key]();
      } else if (['ArrowLeft','ArrowRight'].includes(e.key) && selection && selection.type !== 'clip') {
        const r = itemRange(working,selection,cues); if (!r) return;
        e.preventDefault(); const delta = (e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/fps;
        let start = clamp(r.start+delta,0,duration-(r.end-r.start)), end = start+r.end-r.start;
        if (selection.type === 'zoom') ({start,end} = clampZoomRange(working.zoom.regions,{start,end},{excludeId:selection.id,duration,mode:'move',original:r}));
        commit(() => moveItem(working,selection,start,end));
      } else if (menuKey(e) && selection) {
        const el = document.querySelector(`[data-sel="${selection.type}:${selection.id}"]`); if (!el) return;
        e.preventDefault(); el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:0,clientY:0}));
      }
    };
    addEventListener('keydown',keydown); return () => removeEventListener('keydown',keydown);
  },[!!plan,fps,duration]);
  useEffect(() => () => gesture.current?.cleanup?.(),[]);

  // Pointer gestures.
  function listen(move,up) {
    const cleanup = () => { removeEventListener('pointermove',move); removeEventListener('pointerup',finish); removeEventListener('pointercancel',cancel); gesture.current = null; };
    const finish = ev => { cleanup(); up(ev,true); }, cancel = ev => { cleanup(); up(ev,false); };
    gesture.current?.cleanup?.(); gesture.current = {cleanup:cancel};
    addEventListener('pointermove',move); addEventListener('pointerup',finish); addEventListener('pointercancel',cancel);
  }
  function drag(e,sel,edge) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.focus(); setSelection(sel); setPlaying(false);
    const base = working, r = itemRange(base,sel,cues), origin = fromClient(e.clientX);
    const neighbours = sel.type === 'zoom' ? base.zoom.regions.filter(z => z.id !== sel.id).flatMap(z => [z.tStart,z.tEnd]) : [];
    let final = null, moved = false;
    const move = event => {
      if (Math.abs(event.clientX-e.clientX) < 3 && !moved) return;
      moved = true;
      const t = fromClient(event.clientX); let start = r.start, end = r.end, snapGuide = null;
      if (edge === 'start') start = snap(t,event.altKey,neighbours);
      else if (edge === 'end') end = snap(t,event.altKey,neighbours);
      else { start = snap(r.start+t-origin,event.altKey,neighbours); end = start+r.end-r.start; }
      if (sel.type === 'zoom') ({start,end,guide:snapGuide} = clampZoomRange(base.zoom.regions,{start,end},{excludeId:sel.id,duration,mode:edge ?? 'move',original:r}));
      try { final = moveItem(base,sel,start,end); setDraft(final); setGuide(snapGuide); }
      catch (err) { final = null; setDraft(null); setGuide(null); notify(err.message,'error'); }
    };
    listen(move,(ev,ok) => { if (ok && final) { store.setComposition(final); setSelection(sel); } setDraft(null); setGuide(null); });
  }
  function rulerDrag(e) {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    const seekRuler = x => { setPlaying(false); if (output) setTime(clamp((x-lanes.current.getBoundingClientRect().left)/(scale ?? minScale),0,extent)); else seek(fromClient(x)); };
    seekRuler(e.clientX);
    listen(ev => seekRuler(ev.clientX),() => {});
  }
  function trackDown(e,layer) {
    if (e.button !== 0 || e.target.closest('.timeline-block, .clip-block, .voice-block, .music-bar, button')) return;
    const t0 = fromClient(e.clientX);
    if (layer !== 'zoom') { seek(t0); return; }
    e.preventDefault();
    let moved = false, last = null;
    const regions = working.zoom.regions;
    const move = ev => {
      if (!moved && Math.abs(ev.clientX-e.clientX) < 4) return;
      moved = true; last = dragCreateRange(regions,t0,fromClient(ev.clientX),{duration});
      setGhost(last); setGuide(last?.guide ?? null);
    };
    listen(move,(ev,ok) => {
      setGhost(null); setGuide(null);
      if (!moved) seek(t0); else if (ok && last?.valid) createZoom(last.start,last.end); else if (ok && last) notify('Drag a little further to make a zoom.');
    });
  }
  function resizeKey(e,sel,edge) {
    if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const r = itemRange(working,sel,cues), delta = (e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/fps;
    let start = r.start+(edge === 'start' ? delta : 0), end = r.end+(edge === 'end' ? delta : 0);
    if (sel.type === 'zoom') ({start,end} = clampZoomRange(working.zoom.regions,{start,end},{excludeId:sel.id,duration,mode:edge,original:r}));
    commit(() => moveItem(working,sel,start,end));
  }
  if (!c || !plan) return <p class="empty">Load a recording to edit its timeline.</p>;

  const voiceItems = voiceBlocks({plan,storyboard:project.storyboard,composition:c,output}), music = musicBar({plan,output});
  const rows = layerRows({cues:cues.length,voice:voiceItems.length,music:!!music,added});
  const missing = missingLayers(rows);
  const heights = rowHeights(Math.max(0,size.height-RULER_HEIGHT-1),rows);
  const tickMarks = ticks(extent,scale ?? minScale);
  const playheadX = (output ? time : sourceT)*(scale ?? minScale);
  const showHint = hint && !hasUserEdits(c);
  const dismissHint = () => { setHint(false); writePreference('hint-dismissed','yes'); };
  const selected = sel => same(selection,sel);

  function block(sel,start,end,kind,{label,detail,pill,icon:Icon,onEnter}) {
    const g = geometry(start,end), on = selected(sel);
    return <div key={sel.id} role="button" tabIndex="0" data-sel={`${sel.type}:${sel.id}`} aria-label={`${kind}: ${label}, ${clock(start)} to ${clock(end)}; arrow keys move`} aria-pressed={on}
      class={`timeline-block ${kind} ${on ? 'selected' : ''} ${g.width < 140 ? 'narrow' : ''}`} style={{left:g.left+BLOCK_GAP/2,width:Math.max(4,g.width-BLOCK_GAP)}}
      onPointerDown={e => drag(e,sel)} onFocus={() => setSelection(sel)} onClick={() => setSelection(sel)} onContextMenu={e => openMenu(e,kind,{...(kind === 'zoom' ? shown.zoom.regions.find(z => z.id === sel.id) : cues.find(q => q.id === sel.id))},sel)}
      onDblClick={onEnter} onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } else if (menuKey(e)) { openMenu(e,kind,{...(kind === 'zoom' ? shown.zoom.regions.find(z => z.id === sel.id) : cues.find(q => q.id === sel.id))},sel); } }}>
      <Button class="edge start" tabIndex="-1" aria-label={`Resize ${kind} start`} onPointerDown={e => drag(e,sel,'start')} onKeyDown={e => resizeKey(e,sel,'start')}/>
      <span class="block-body">{kind === 'zoom' && <span class="pill">{Icon && <Icon size={11} aria-hidden="true"/>}<b>{pill}</b></span>}<span class="block-text">{label}</span>{detail && <span class="block-detail">{detail}</span>}</span>
      <Button class="edge end" tabIndex="-1" aria-label={`Resize ${kind} end`} onPointerDown={e => drag(e,sel,'end')} onKeyDown={e => resizeKey(e,sel,'end')}/>
      {on && <MiniToolbar kind={kind} item={kind === 'zoom' ? shown.zoom.regions.find(z => z.id === sel.id) : cues.find(q => q.id === sel.id)} sourceT={sourceT} onAction={act}/>}
    </div>;
  }
  const addLayer = id => { setLayerOpen(false); setAdded(v => ({...v,[id]:true})); notify(`${LAYERS.find(l => l.id === id).label} layer added.`); };
  const layerLabel = id => LAYERS.find(l => l.id === id).label;
  const NoticeIcon = notice?.kind === 'error' ? CircleAlert : notice?.kind === 'success' ? Check : Info;
  return <div class="timeline-editor simple-timeline">
    <ScenesStrip state={state} store={store}/>
    <div class="timeline-toolbar" role="toolbar" aria-label="Timeline edits">
      <Tooltip text={missing.length ? 'Show another layer' : 'All layers added'}>
        <Popover label="Add Layer" open={layerOpen && missing.length > 0} onOpenChange={setLayerOpen} contentProps={{side:'top',align:'start'}}
          trigger={<Button aria-label="Add Layer" aria-expanded={layerOpen} disabled={!missing.length}><Layers size={14} aria-hidden="true"/><span class="label-text">Add Layer</span></Button>}>
          <div class="layer-menu" role="group" aria-label="Layers to add">{missing.map(l => { const Icon = LAYER_ICONS[l.id]; return <Button key={l.id} onClick={() => addLayer(l.id)}><Icon size={14} aria-hidden="true"/>{l.label}</Button>; })}</div>
        </Popover>
      </Tooltip>
      <span class="toolbar-divider" aria-hidden="true"/>
      <Tooltip text="Add zoom at playhead (Z)"><Button aria-label="Add zoom" onClick={() => addZoomAt(sourceT)}><ZoomIn size={15} aria-hidden="true"/><span class="label-text">Add zoom</span></Button></Tooltip>
      <Tooltip text="Regenerate automatic zooms; manual zooms stay"><Button aria-label="Auto zoom" onClick={() => commit(() => { const next = ops.autoZoomRegenerate(working,project.events,project.record); next.zoom.enabled = true; next.zoom.autoSuggest = false; return next; })}><WandSparkles size={15} aria-hidden="true"/><span class="label-text">Auto zoom</span></Button></Tooltip>
      <Tooltip text="Split clip at playhead (S)"><Button aria-label="Split" onClick={split}><Scissors size={15} aria-hidden="true"/><span class="label-text">Split</span></Button></Tooltip>
      <div class={`timeline-notice ${notice?.kind ?? ''}`} role="status" aria-live="polite">{notice && <><NoticeIcon size={13} aria-hidden="true"/><span>{notice.text}</span></>}</div>
      <span class="result-chip" title="Length of the exported video">Result {Math.floor(map.outputDuration/60)}:{String(Math.floor(map.outputDuration%60)).padStart(2,'0')}</span>
      <div class="time-mode"><ToggleGroup aria-label="Timeline time" value={output ? 'output' : 'source'} onValueChange={v => setOutput(v === 'output')} options={[{value:'source',label:'Source'},{value:'output',label:'Output'}]}/></div>
      <div class="zoom-control">
        <Tooltip text="Zoom timeline out (⌘/Ctrl + wheel)"><Button size="icon" aria-label="Zoom timeline out" onClick={() => changeScale((scale ?? minScale)/1.4)}><Minus size={14} aria-hidden="true"/></Button></Tooltip>
        <Slider aria-label="Timeline zoom" min={0} max={100} step={1} value={[sliderFromScale(scale ?? minScale,minScale)]} onValueChange={([v]) => changeScale(scaleFromSlider(v,minScale))}/>
        <Tooltip text="Zoom timeline in (⌘/Ctrl + wheel)"><Button size="icon" aria-label="Zoom timeline in" onClick={() => changeScale((scale ?? minScale)*1.4)}><Plus size={14} aria-hidden="true"/></Button></Tooltip>
        <Tooltip text="Fit the whole recording"><Button size="icon" aria-label="Fit timeline" onClick={fit}><Maximize2 size={14} aria-hidden="true"/></Button></Tooltip>
      </div>
    </div>
    {showHint && <div class="hint-card"><Info size={13} aria-hidden="true"/><p>Split a clip to speed it up or remove it. Select a zoom to move its box.</p><Tooltip text="Dismiss this hint"><Button size="icon" aria-label="Dismiss editing hint" onClick={dismissHint}><X size={14} aria-hidden="true"/></Button></Tooltip></div>}
    <div class="timeline-grid" ref={grid} tabIndex="0" role="region" aria-label="Timeline; scroll to pan">
      <div class="track-labels" ref={labelsRef}>
        <div class="track-label corner" style={{height:RULER_HEIGHT}}><Clock size={13} aria-hidden="true"/><span>Time</span></div>
        {rows.map(id => { const Icon = LAYER_ICONS[id]; return <div key={id} class={`track-label ${id}`} style={{height:heights[id]}} title={(typeof innerWidth === 'number' && innerWidth < 1100) ? layerLabel(id) : undefined}><Icon size={15} aria-hidden="true"/><span>{layerLabel(id)}</span></div>; })}
      </div>
      <div class="timeline-lanes" ref={lanes} style={{width}} data-scale={scale ?? minScale}>
        <div class="timeline-ruler" role="slider" tabIndex="0" aria-label={`Playhead in ${output ? 'output' : 'source'} time`} aria-valuemin="0" aria-valuemax={extent} aria-valuenow={output ? time : sourceT} aria-valuetext={clock(output ? time : sourceT)} style={{height:RULER_HEIGHT}} onPointerDown={rulerDrag}
          onKeyDown={e => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? extent : clamp((output ? time : sourceT)+(e.key === 'ArrowLeft' ? -1 : 1)*(e.shiftKey ? 10 : 1)/fps,0,extent); if (output) jumpTo(next); else seek(next); } }}>
          {tickMarks.map(tick => <i key={tick.t} class={`tick ${tick.major ? 'major' : ''}`} style={{left:tick.t*(scale ?? minScale)}}>{tick.label && <span>{tick.label}</span>}</i>)}
          <button type="button" class="playhead-handle" aria-label="Drag playhead" style={{left:playheadX}} onPointerDown={rulerDrag}/>
        </div>
        <div class="timeline-tracks">
          {rows.map(id => <div key={id} class={`timeline-track ${id}-track ${id === 'captions' ? 'caption-track' : ''}`} aria-label={`${layerLabel(id)} track`} style={{height:heights[id]}}
            onPointerDown={e => trackDown(e,id)} onDblClick={e => { if (e.target.closest('.timeline-block, .clip-block, .voice-block, .music-bar, button')) return; if (id === 'zoom') addZoomAt(fromClient(e.clientX)); if (id === 'captions') addCaptionAt(fromClient(e.clientX)); }}
            onContextMenu={e => { if (e.target.closest('.timeline-block, .clip-block, .voice-block, .music-bar')) return; if (id === 'zoom' || id === 'captions') openMenu(e,'track',{layer:id,t:fromClient(e.clientX)}); else e.preventDefault(); }}>
            {id === 'clip' && clips.map(clip => {
              const g = geometry(clip.start,clip.end), on = selected({type:'clip',id:clip.id}), length = clip.end-clip.start;
              return <div key={clip.id} data-sel={`clip:${clip.id}`} class={`clip-block ${clip.deleted ? 'deleted' : ''} ${on ? 'selected' : ''} ${g.width < 140 ? 'narrow' : ''} ${strip?.status === 'loading' ? 'loading' : ''}`} style={{left:g.left+1,width:Math.max(4,g.width-2)}} aria-busy={strip?.status === 'loading'}
                onContextMenu={e => openMenu(e,'clip',clip,{type:'clip',id:clip.id})}>
                {!clip.deleted && <Filmstrip strip={strip} version={thumbVersion} start={clip.start} end={clip.end} width={Math.max(4,g.width-2)} height={Math.max(8,heights.clip-8)}/>}
                <button type="button" class="clip-hit" aria-label={`Clip ${clock(clip.start)} to ${clock(clip.end)}${clip.rate !== 1 ? `, ${clip.rate}x speed` : ''}${clip.deleted ? ', deleted' : ''}${clip.muted ? ', muted' : ''}`} aria-pressed={on}
                  onFocus={() => setSelection({type:'clip',id:clip.id})} onPointerDown={e => { if (e.button === 0) { setSelection({type:'clip',id:clip.id}); seek(fromClient(e.clientX)); } }} onClick={() => setSelection({type:'clip',id:clip.id})}
                  onKeyDown={e => { if (menuKey(e)) openMenu(e,'clip',clip,{type:'clip',id:clip.id}); }}>
                  {!clip.deleted && (clip.rate !== 1 || clip.muted) && <span class="pill">{clip.rate !== 1 && <b>{clip.rate}x</b>}{clip.muted && <VolumeX size={11} aria-label="Muted"/>}</span>}
                  {!clip.deleted && <span class="block-detail">{clock(clip.start)} – {clock(clip.end)}</span>}
                </button>
                {clip.deleted && <Button class="restore-clip" size="sm" aria-label={`Restore clip ${clock(clip.start)} to ${clock(clip.end)}`} onClick={() => commit(() => restoreClip(c,clip))}>Restore</Button>}
                {on && !clip.deleted && <MiniToolbar kind="clip" item={clip} sourceT={sourceT} onAction={act}/>}
              </div>;
            })}
            {id === 'zoom' && !shown.zoom.regions.length && !ghost && <div class="ghost-block" style={{left:px(sourceT),width:Math.max(96,px(Math.min(duration,sourceT+DEFAULT_ZOOM_SEC))-px(sourceT))}} aria-hidden="true"><ZoomIn size={13}/><span>Double-click to add a zoom</span></div>}
            {id === 'zoom' && shown.zoom.regions.map(z => block({type:'zoom',id:z.id},z.tStart,z.tEnd,'zoom',{pill:`${zoomDepth(z.depth)}x`,icon:z.source === 'auto' ? WandSparkles : Hand,label:z.source === 'auto' ? 'Auto' : 'Manual',detail:`${clock(z.tStart)} – ${clock(z.tEnd)}`}))}
            {id === 'zoom' && ghost && <div class={`ghost-block create ${ghost.valid ? '' : 'invalid'}`} style={geometry(ghost.start,ghost.end)} aria-hidden="true"><span>{(ghost.end-ghost.start).toFixed(1)} s</span></div>}
            {id === 'captions' && !cues.length && <span class="track-placeholder">{LAYERS[2].hint}</span>}
            {id === 'captions' && cues.map(q => block({type:'caption',id:q.id},q.start,q.end,'caption',{pill:`${(q.end-q.start).toFixed(1)} s`,label:q.text,onEnter:() => { setSelection({type:'caption',id:q.id}); setEditing({id:q.id,text:q.text}); }}))}
            {id === 'voice' && !voiceItems.length && <span class="track-placeholder">{LAYERS[3].hint}</span>}
            {id === 'voice' && voiceItems.map(b => <button type="button" key={b.stepId} class={`voice-block ${b.source} ${b.warning ? 'warn' : ''}`} style={{left:b.start*(scale ?? minScale),width:Math.max(6,(b.end-b.start)*(scale ?? minScale))}} title={b.warning ?? b.label}
              aria-label={`Voice: ${b.label}, ${clock(b.start)} to ${clock(b.end)}${b.warning ? `. Warning: ${b.warning}` : ''}. Select to move the playhead here.`} onClick={() => jumpTo(b.outStart)} onContextMenu={e => openMenu(e,'voice',b)} onKeyDown={e => { if (menuKey(e)) openMenu(e,'voice',b); }}>
              <span class="pill"><Mic size={11} aria-hidden="true"/>{b.warning && <b aria-hidden="true">!</b>}</span><span class="block-text">{b.label}</span></button>)}
            {id === 'music' && !music && <span class="track-placeholder">{LAYERS[4].hint}</span>}
            {id === 'music' && music && <button type="button" class="music-bar" style={{left:music.start*(scale ?? minScale),width:Math.max(6,(music.end-music.start)*(scale ?? minScale))}} title={baseName(c.audio.music.file)}
              aria-label={`Music: ${baseName(c.audio.music.file)}. Select to move the playhead to the start.`} onClick={() => jumpTo(0)} onContextMenu={e => openMenu(e,'music',music)} onKeyDown={e => { if (menuKey(e)) openMenu(e,'music',music); }}>
              <i class="fade-in" style={{width:music.fadeIn*(scale ?? minScale)}} aria-hidden="true"/><i class="fade-out" style={{width:music.fadeOut*(scale ?? minScale)}} aria-hidden="true"/><span class="pill"><Music size={11} aria-hidden="true"/></span><span class="block-text">{baseName(c.audio.music.file)}</span></button>}
          </div>)}
          {guide !== null && <div class="snap-guide" style={{left:px(guide)}} aria-hidden="true"/>}
          <div class="timeline-playhead" style={{left:playheadX}} aria-hidden="true"/>
        </div>
      </div>
    </div>
    {editing && <form class="caption-inline" onSubmit={e => { e.preventDefault(); if (commit(() => ops.setCaption(c,editing.id,{text:editing.text},context))) setEditing(null); }}>
      <Label>Caption text<Input autoFocus maxLength="140" value={editing.text} onInput={e => setEditing({...editing,text:e.currentTarget.value})} onKeyDown={e => { if (e.key === 'Escape') setEditing(null); }}/></Label><Button type="submit" variant="default">Save caption</Button><Button type="button" onClick={() => setEditing(null)}>Cancel</Button>
    </form>}
    {menu && <ContextMenu x={menu.x} y={menu.y} label={menu.label} actions={menu.actions} onAction={(id,value) => act(id,menu.kind,menu.item,value)} onClose={closeMenu}/>}
  </div>;
}
