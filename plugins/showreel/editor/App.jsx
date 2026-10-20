import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createEditorStore } from './state.js';
import { createVoiceController } from './voice-controller.js';
import { openFrames } from './frames.js';
import { Preview } from './Preview.jsx';
import { Rail } from './Rail.jsx';
import { planRender } from '../scripts/lib/compose/plan.mjs';
import { editorAudioUrls } from './state.js';
import { Settings } from './Settings.jsx';
import { TopBar } from './TopBar.jsx';
import { Timeline } from './Timeline.jsx';
import { outputAt, sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { Button } from './ui/button.jsx';
import { Dialog } from './ui/dialog.jsx';
import { Tooltip, TooltipProvider } from './ui/tooltip.jsx';
import { Keyboard, Settings2, LoaderCircle, TriangleAlert } from 'lucide-preact';
import { readPreference, writePreference, timelineHeight, panelWidth, PANEL_MIN, PANEL_MAX, PANEL_DEFAULT } from './layout.mjs';
import { isTyping } from './helpers.mjs';
import { PanelShell } from './panels/PanelShell.jsx';
import { EmptyState } from './panels/EmptyState.jsx';

// The panel column before the project has loaded, or when loading failed: never an empty strip.
function LoadingPanel({ state, store }) {
  return <PanelShell ariaLabel="Composition settings" title={state.error ? 'Project' : 'Loading'} subtitle={state.error ? 'The project could not be opened' : 'Opening your project'} footer={null}>
    {state.error ? <EmptyState tone="error" icon={TriangleAlert} title="Could not open the project" line={state.error} role="alert" action={<Button variant="outline" size="sm" onClick={() => store.load()}>Try again</Button>} />
      : <EmptyState icon={LoaderCircle} spin title="Loading project…" line="Reading the recording and your settings." />}
  </PanelShell>;
}
// Cmd/Ctrl+K focuses the settings search from anywhere, leaving any selection panel first.
function focusSearch() {
  const find = () => document.querySelector('.settings-column input[type=search], .settings-sheet input[type=search]');
  const input = find();
  if (input) { input.focus(); input.select(); return true; }
  return false;
}

function Shortcuts({ onClose }) {
  return <Dialog title="Keyboard shortcuts" description="Edit your video without leaving the keyboard." onClose={onClose}>
    <dl class="shortcuts">{[['Space', 'Play / pause'], [', / .', 'Previous / next frame'], ['⌘ / Ctrl K', 'Search settings'], ['⌘ / Ctrl Z', 'Undo'], ['⌘ / Ctrl Shift Z', 'Redo'], ['S', 'Split clip'], ['Z / C', 'Add zoom / caption'], ['Delete', 'Delete selected item'], ['← / →', 'Nudge one frame (Shift: ten)'], ['?', 'Show shortcuts']].map(([key, action]) => <div><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>
  </Dialog>;
}
export function App() {
  const [store] = useState(createEditorStore), [state, setState] = useState(store.getState());
  const [voice] = useState(() => createVoiceController({ store }));
  const shell = useRef(), splitter = useRef();
  const [chosen, setChosen] = useState(() => Number(readPreference('timeline-height', 0)) || 0), [viewportH, setViewportH] = useState(innerHeight);
  const height = timelineHeight(chosen, viewportH);
  const [hint, setHint] = useState(() => readPreference('hint-dismissed', '') !== 'yes');
  const [sheet, setSheet] = useState(false), [topic,setTopic] = useState('zoom');
  const [reveal, setReveal] = useState(null); // the setting a search "Go to" should scroll to
  const [panel, setPanel] = useState(() => panelWidth(readPreference('panel-width', 0)));
  const workspace = useRef(), panelDrag = useRef();
  function resizePanel(value, remember = true) { const next = panelWidth(value); setPanel(next); if (remember) writePreference('panel-width', String(next)); }
  function startPanelResize(event) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus();
    const left = workspace.current.getBoundingClientRect().left + 56;
    const move = e => resizePanel(e.clientX - left, false);
    const finish = e => { removeEventListener('pointermove', move); removeEventListener('pointerup', finish); removeEventListener('pointercancel', finish); panelDrag.current = null; if (e.clientX !== undefined) resizePanel(e.clientX - left); };
    panelDrag.current?.(); panelDrag.current = finish;
    addEventListener('pointermove', move); addEventListener('pointerup', finish); addEventListener('pointercancel', finish);
  }
  const [zoomDraft,setZoomDraft] = useState(null);
  const previewPlan = useMemo(() => {
    if (!zoomDraft || !state.plan) return state.plan;
    try {return planRender({...state.project,scenes:undefined,composition:zoomDraft,sourceSize:state.plan.sourceSize,voiceClips:state.project.clips??null,audioUrls:editorAudioUrls,brandBase:'/media/brand/'});} catch {return state.plan;}
  },[zoomDraft,state.plan]);
  const [theme, setTheme] = useState(() => readPreference('theme', '') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [selection, setSelection] = useState(null);
  const [provider, setProvider] = useState(null), [mediaError, setMediaError] = useState('');
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [shortcuts, setShortcuts] = useState(false), [toast, setToast] = useState('');
  const storeError = useRef(null);
  useEffect(() => {
    let active = true, opened;
    let composition = store.getState().composition;
    const unsubscribe = store.subscribe(next => {
      if (next.composition !== composition) {setPlaying(false);setZoomDraft(null);}
      composition = next.composition; setState(next);
      if (next.error && next.error !== storeError.current) setToast(next.error);
      storeError.current = next.error;
    });
    store.load();
    voice.start();
    openFrames().then(frames => {
      opened = frames;
      if (!active) { frames.close(); return; }
      setProvider(frames); store.setSourceSize(frames.sourceSize);
    }).catch(e => { if (active) setMediaError(e.message); });
    return () => { active = false; opened?.close(); unsubscribe(); voice.dispose(); store.dispose(); };
  }, [store]);
  useEffect(()=>{
    if(selection?.type!=='zoom' || !state.plan) return;
    const region=state.plan.regions.find(z=>z.id===selection.id);
    if(!region) return;
    const mapped=sourceAt(state.plan.timemap,time);
    if(mapped.section!=='main' || mapped.t<region.tStart || mapped.t>region.tEnd) {
      const next=outputAt(state.plan.timemap,region.tStart+Math.min(.05,(region.tEnd-region.tStart)/2));
      if(next!==null) {setTime(next);setPlaying(false);}
    }
  },[selection?.type,selection?.id]);
  useEffect(() => {
    const beforeUnload = event => { if (store.getState().dirty) { event.preventDefault(); event.returnValue = ''; } };
    addEventListener('beforeunload', beforeUnload);
    return () => removeEventListener('beforeunload', beforeUnload);
  }, [store]);
  useEffect(() => {
    const keydown = event => {
      if (document.querySelector('[role="dialog"], [role="listbox"]')) return;
      if(event.key==='Escape'){setSelection(null);setZoomDraft(null);return;}
      const key = event.key.toLowerCase(), command = event.metaKey || event.ctrlKey;
      if (command && key === 'k' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        if (!focusSearch()) { setSelection(null); setZoomDraft(null); requestAnimationFrame(() => { if (!focusSearch()) setTimeout(focusSearch, 50); }); }
        return;
      }
      if (isTyping(event.target)) return;
      if (command && key === 'z') { event.preventDefault(); if (event.shiftKey) {store.redo(); setToast('Redone');} else {store.undo(); setToast('Undone');} }
      else if (!command && !event.altKey) {
        if (event.key === ' ' && !event.target.closest('button, a')) { event.preventDefault(); if (state.plan) { setTime(t => t >= state.plan.timemap.outputDuration - 0.05 ? 0 : t); setPlaying(value => !value); } }
        else if ([',', '.'].includes(key)) {
          event.preventDefault(); setPlaying(false);
          setTime(value => Math.max(0, Math.min(state.plan?.timemap.outputDuration ?? 0, value + (key === ',' ? -1 : 1) / (state.plan?.output.fps ?? 30))));
        } else if (event.key === '?') { event.preventDefault(); setShortcuts(true); }
      }
    };
    addEventListener('keydown', keydown); return () => removeEventListener('keydown', keydown);
  }, [state.plan, store]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {if (!readPreference('theme', '')) setTheme(media.matches ? 'dark' : 'light');};
    media.addEventListener('change', follow);
    const resize = () => setViewportH(innerHeight);
    addEventListener('resize', resize);
    return () => {media.removeEventListener('change', follow); removeEventListener('resize', resize); splitter.current?.(); panelDrag.current?.({});};
  }, []);
  function resizeTimeline(value) { const next = timelineHeight(value, shell.current.clientHeight); setChosen(next); writePreference('timeline-height', String(next)); }
  function startResize(event) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus();
    const move = e => resizeTimeline(shell.current.getBoundingClientRect().bottom - e.clientY);
    const finish = () => {removeEventListener('pointermove', move); removeEventListener('pointerup', finish); removeEventListener('pointercancel', finish); splitter.current = null;};
    splitter.current?.(); splitter.current = finish;
    addEventListener('pointermove', move); addEventListener('pointerup', finish); addEventListener('pointercancel', finish);
  }
  return <TooltipProvider delayDuration={350}><div ref={shell} class="editor-shell" style={{'--timeline-height':`${height}px`,'--panel-width':`${panel}px`}}>
    <TopBar state={state} store={store} voice={voice} theme={theme} toggleTheme={() => {const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); writePreference('theme', next);}} notify={setToast} />
    <div class="workspace" ref={workspace}><Rail topic={topic} onChange={value=>{setTopic(value);setSelection(null);setZoomDraft(null);if(innerWidth<900)setSheet(true);}}/><div class="settings-column">{state.composition ? <Settings key={topic} topic={topic} setTopic={setTopic} reveal={reveal} setReveal={setReveal} state={state} store={store} controller={voice} selection={selection} setSelection={setSelection} time={time} provider={provider} /> : <LoadingPanel state={state} store={store} />}</div>
      <div class="vsplitter" role="separator" tabIndex="0" aria-label="Resize settings panel" aria-orientation="vertical" aria-valuemin={PANEL_MIN} aria-valuemax={PANEL_MAX} aria-valuenow={panel} title="Drag to resize; double-click to reset" onPointerDown={startPanelResize} onDblClick={() => resizePanel(PANEL_DEFAULT)}
        onKeyDown={e => {if(['ArrowLeft','ArrowRight','Home','End','Enter'].includes(e.key)) {e.preventDefault();resizePanel(e.key==='Home'?PANEL_MIN:e.key==='End'?PANEL_MAX:e.key==='Enter'?PANEL_DEFAULT:panel+(e.key==='ArrowRight'?16:-16));}}} />
      <div class="viewer">
      <div class="viewer-heading"><span>PREVIEW</span><div><Tooltip text="Keyboard shortcuts (?)"><Button size="icon" onClick={() => setShortcuts(true)} aria-label="Keyboard shortcuts"><Keyboard size={16} aria-hidden="true" /></Button></Tooltip><Tooltip text="Open composition settings"><Button class="settings-toggle" size="icon" onClick={() => setSheet(true)} aria-label="Open settings"><Settings2 size={16} aria-hidden="true" /></Button></Tooltip></div></div>
      {(state.error || mediaError) && <p class="error app-error" role="alert">{mediaError || state.error}</p>}
      <Preview plan={previewPlan} provider={provider} time={time} setTime={setTime} playing={playing} setPlaying={setPlaying}
        focus={selection?.type === 'zoom' ? previewPlan?.regions.find(z => z.id === selection.id) : null}
        onZoomChange={(patch,phase)=>{
          if (phase==='cancel') {setZoomDraft(null);return;}
          const c=store.getState().composition;
          const next={...c,zoom:{...c.zoom,autoSuggest:false,regions:state.plan.regions.map(z=>z.id===selection.id?{...z,...patch,source:'manual'}:z)}};
          if(phase==='commit'){store.setComposition(next);setZoomDraft(null);}else setZoomDraft(next);
        }}
 />
    </div></div>
    <div class="splitter" role="separator" tabIndex="0" aria-label="Resize timeline" aria-orientation="horizontal" aria-valuemin={190} aria-valuemax={Math.floor(innerHeight * .6)} aria-valuenow={Math.round(height)} onPointerDown={startResize} onDblClick={() => resizeTimeline(0)} onKeyDown={e => {if(['ArrowUp','ArrowDown','Home','End','Enter'].includes(e.key)) {e.preventDefault();resizeTimeline(e.key==='Home'?190:e.key==='End'?innerHeight*.6:e.key==='Enter'?0:height+(e.key==='ArrowUp'?16:-16));}}} />
    <section id="timeline-root" aria-label="Timeline" onPointerDownCapture={e=>{
      if(e.button===0 && !e.target.closest('button, input, [role="button"], .timeline-block, .clip-block, .trim-block, .timeline-toolbar, .scenes-area, .video-track, .clip-track')) {setSelection(null);}
    }}>
      {/* timeline-agent hook: the editing hint now lives under the timeline toolbar (same 'hint-dismissed' preference); `voice` powers the Voice block's Regenerate action. */}
      <Timeline state={state} store={store} time={time} setTime={setTime} setPlaying={setPlaying} selection={selection} setSelection={setSelection} voice={voice} />
    </section>
    {toast && <div class="toast" role="status">{toast}</div>}
    {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}
    {sheet && state.composition && <Dialog title="Settings" description="Adjust the look of your video." className="settings-sheet" onClose={() => setSheet(false)}><Settings topic={topic} setTopic={setTopic} reveal={reveal} setReveal={setReveal} state={state} store={store} controller={voice} selection={selection} setSelection={setSelection} time={time} provider={provider} /></Dialog>}
  </div></TooltipProvider>;
}
