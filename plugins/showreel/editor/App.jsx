import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { createEditorStore } from './state.js';
import { openFrames } from './frames.js';
import { Preview } from './Preview.jsx';
import { Settings } from './Settings.jsx';
import { TopBar } from './TopBar.jsx';
import { Timeline } from './Timeline.jsx';
import { setZoomFocus } from './edit-ops.mjs';
import { sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { Button } from './ui/button.jsx';
import { Dialog } from './ui/dialog.jsx';
import { Tooltip, TooltipProvider } from './ui/tooltip.jsx';
import { Keyboard, Settings2, X } from 'lucide-preact';
import { readPreference, writePreference, timelineHeight } from './layout.mjs';
import { isTyping } from './helpers.mjs';

function Shortcuts({ onClose }) {
  return <Dialog title="Keyboard shortcuts" description="Edit your video without leaving the keyboard." onClose={onClose}>
    <dl class="shortcuts">{[['Space', 'Play / pause'], [', / .', 'Previous / next frame'], ['⌘ / Ctrl Z', 'Undo'], ['⌘ / Ctrl Shift Z', 'Redo'], ['S / X', 'Split / cut range'], ['Z / C', 'Add zoom / caption'], ['Delete', 'Delete selected item'], ['← / →', 'Nudge one frame (Shift: ten)'], ['?', 'Show shortcuts']].map(([key, action]) => <div><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>
  </Dialog>;
}
export function App() {
  const [store] = useState(createEditorStore), [state, setState] = useState(store.getState());
  const shell = useRef(), splitter = useRef();
  const [chosen, setChosen] = useState(() => Number(readPreference('timeline-height', 0)) || 0), [viewportH, setViewportH] = useState(innerHeight);
  const height = timelineHeight(chosen, viewportH);
  const [hint, setHint] = useState(() => readPreference('hint-dismissed', '') !== 'yes');
  const [sheet, setSheet] = useState(false);
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
      if (next.composition !== composition) setPlaying(false);
      composition = next.composition; setState(next);
      if (next.error && next.error !== storeError.current) setToast(next.error);
      storeError.current = next.error;
    });
    store.load();
    openFrames().then(frames => {
      opened = frames;
      if (!active) { frames.close(); return; }
      setProvider(frames); store.setSourceSize(frames.sourceSize);
    }).catch(e => { if (active) setMediaError(e.message); });
    return () => { active = false; opened?.close(); unsubscribe(); store.dispose(); };
  }, [store]);
  useEffect(() => {
    const beforeUnload = event => { if (store.getState().dirty) { event.preventDefault(); event.returnValue = ''; } };
    addEventListener('beforeunload', beforeUnload);
    return () => removeEventListener('beforeunload', beforeUnload);
  }, [store]);
  useEffect(() => {
    const keydown = event => {
      if (isTyping(event.target) || document.querySelector('[role="dialog"], [role="listbox"]')) return;
      const key = event.key.toLowerCase(), command = event.metaKey || event.ctrlKey;
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
    return () => {media.removeEventListener('change', follow); removeEventListener('resize', resize); splitter.current?.();};
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
  return <TooltipProvider delayDuration={350}><div ref={shell} class="editor-shell" style={{'--timeline-height':`${height}px`}}>
    <TopBar state={state} store={store} theme={theme} toggleTheme={() => {const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); writePreference('theme', next);}} notify={setToast} />
    <div class="workspace"><div class="viewer">
      <div class="viewer-heading"><span>PREVIEW</span><div><Tooltip text="Keyboard shortcuts (?)"><Button size="icon" onClick={() => setShortcuts(true)} aria-label="Keyboard shortcuts"><Keyboard size={16} aria-hidden="true" /></Button></Tooltip><Tooltip text="Open composition settings"><Button class="settings-toggle" size="icon" onClick={() => setSheet(true)} aria-label="Open settings"><Settings2 size={16} aria-hidden="true" /></Button></Tooltip></div></div>
      {(state.error || mediaError) && <p class="error app-error" role="alert">{mediaError || state.error}</p>}
      <Preview plan={state.plan} provider={provider} time={time} setTime={setTime} playing={playing} setPlaying={setPlaying}
        focus={selection?.type === 'zoom' ? state.plan?.regions.find(z => z.id === selection.id) : null}
        onPick={point => {
          if (selection?.type !== 'zoom' || !state.plan) return;
          try {
            const c = {...state.composition,zoom:{...state.composition.zoom,regions:state.plan.regions}};
            store.setComposition(setZoomFocus(c,selection.id,sourceAt(state.plan.timemap,time).t,point.x,point.y,{duration:state.project.record.durationSec}));
          } catch(e) { setToast(e.message); }
        }} />
    </div><div class="settings-column">{state.composition && <Settings state={state} store={store} />}</div></div>
    <div class="splitter" role="separator" tabIndex="0" aria-label="Resize timeline" aria-orientation="horizontal" aria-valuemin={190} aria-valuemax={Math.floor(innerHeight * .6)} aria-valuenow={Math.round(height)} onPointerDown={startResize} onDblClick={() => resizeTimeline(0)} onKeyDown={e => {if(['ArrowUp','ArrowDown','Home','End','Enter'].includes(e.key)) {e.preventDefault();resizeTimeline(e.key==='Home'?190:e.key==='End'?innerHeight*.6:e.key==='Enter'?0:height+(e.key==='ArrowUp'?16:-16));}}} />
    <section id="timeline-root" aria-label="Timeline">
      {hint && <div class="hint-card"><p>Drag on the Video track to select a part.<br />Press Delete to cut it, or choose Speed to fast-forward it.<br />Choose Add zoom to bring a detail closer.</p><Tooltip text="Dismiss this hint"><Button size="icon" aria-label="Dismiss editing hint" onClick={() => {setHint(false);writePreference('hint-dismissed','yes');}}><X size={14} aria-hidden="true" /></Button></Tooltip></div>}
      <Timeline state={state} store={store} time={time} setTime={setTime} setPlaying={setPlaying} selection={selection} setSelection={setSelection} />
    </section>
    {toast && <div class="toast" role="status">{toast}</div>}
    {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}
    {sheet && state.composition && <Dialog title="Settings" description="Adjust the look of your video." className="settings-sheet" onClose={() => setSheet(false)}><Settings state={state} store={store} /></Dialog>}
  </div></TooltipProvider>;
}
