import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ExportDialog } from './ExportDialog.jsx';

export function TopBar({ state, store }) {
  const [exportOpen, setExportOpen] = useState(false);
  const status = state.error ? 'Error' : state.saving || state.dirty ? 'Saving' : 'Saved';
  return <header class="topbar">
    <div class="brand">SHOWREEL<span>EDITOR</span></div>
    <div class="project-name"><strong>{state.project?.name ?? 'Loading project…'}</strong><small>{state.project?.runId}</small></div>
    <span class={`save-status ${state.error ? 'error' : ''}`} role="status" title={state.error ?? ''}>{status}</span>
    {state.error && state.dirty && <button onClick={() => store.save().catch(() => {})}>Retry save</button>}
    <div class="history"><button disabled={!state.past.length} onClick={store.undo} title="Undo (⌘/Ctrl Z)">Undo</button><button disabled={!state.future.length} onClick={store.redo} title="Redo (⌘/Ctrl Shift Z)">Redo</button></div>
    <button class="primary" disabled={!state.composition} onClick={() => setExportOpen(true)}>Export</button>
    {exportOpen && <ExportDialog store={store} onClose={() => setExportOpen(false)} />}
  </header>;
}
