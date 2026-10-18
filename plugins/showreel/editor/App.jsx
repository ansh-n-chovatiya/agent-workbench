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
import { isTyping } from './helpers.mjs';

function Shortcuts({ onClose }) {
  const dialog = useRef();
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="shortcuts-title" onCancel={onClose}>
    <div class="dialog-heading"><h2 id="shortcuts-title">Keyboard shortcuts</h2><button onClick={onClose} aria-label="Close shortcuts">×</button></div>
    <dl class="shortcuts">{[['Space', 'Play / pause'], [', / .', 'Previous / next frame'], ['⌘ / Ctrl Z', 'Undo'], ['⌘ / Ctrl Shift Z', 'Redo'], ['S / X', 'Split / cut range'], ['Z / C', 'Add zoom / caption'], ['Delete', 'Delete selected item'], ['← / →', 'Nudge one frame (Shift: ten)'], ['?', 'Show shortcuts']].map(([key, action]) => <div><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>
  </dialog>;
}
export function App() {
  const [store] = useState(createEditorStore), [state, setState] = useState(store.getState());
  const [selection, setSelection] = useState(null);
  const [provider, setProvider] = useState(null), [mediaError, setMediaError] = useState('');
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [shortcuts, setShortcuts] = useState(false), [toast, setToast] = useState('');
  useEffect(() => {
    let active = true, opened;
    let composition = store.getState().composition;
    const unsubscribe = store.subscribe(next => {
      if (next.composition !== composition) setPlaying(false);
      composition = next.composition; setState(next);
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
      if (isTyping(event.target) || document.querySelector('dialog[open]')) return;
      const key = event.key.toLowerCase(), command = event.metaKey || event.ctrlKey;
      if (command && key === 'z') { event.preventDefault(); if (event.shiftKey) store.redo(); else store.undo(); }
      else if (!command && !event.altKey) {
        if (event.key === ' ' && !event.target.closest('button, a')) { event.preventDefault(); if (state.plan) setPlaying(value => !value); }
        else if ([',', '.'].includes(key)) {
          event.preventDefault(); setPlaying(false);
          setTime(value => Math.max(0, Math.min(state.plan?.timemap.outputDuration ?? 0, value + (key === ',' ? -1 : 1) / (state.plan?.output.fps ?? 30))));
        } else if (event.key === '?') { event.preventDefault(); setShortcuts(true); }
      }
    };
    addEventListener('keydown', keydown); return () => removeEventListener('keydown', keydown);
  }, [state.plan, store]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2200); return () => clearTimeout(timer); } }, [toast]);
  return <div class="editor-shell">
    <TopBar state={state} store={store} />
    <div class="workspace"><div class="viewer">
      <div class="viewer-heading"><span>PREVIEW</span><button onClick={() => setShortcuts(true)} aria-label="Keyboard shortcuts">?</button></div>
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
    </div>{state.composition && <Settings state={state} store={store} />}</div>
    <section id="timeline-root" aria-label="Timeline"><Timeline state={state} store={store} time={time} setTime={setTime} setPlaying={setPlaying} selection={selection} setSelection={setSelection} /></section>
    {toast && <div class="toast" role="status">{toast}</div>}
    {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}
  </div>;
}
