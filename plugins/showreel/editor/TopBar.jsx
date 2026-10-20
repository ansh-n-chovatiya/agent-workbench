import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Moon, Sun, Undo2, Redo2, Download, Clapperboard } from 'lucide-preact';
import { ToggleGroup } from './ui/toggle-group.jsx';
import { ExportDialog } from './ExportDialog.jsx';
import { Button } from './ui/button.jsx';
import { Tooltip } from './ui/tooltip.jsx';
export function TopBar({ state, store, voice, theme, toggleTheme, notify }) {
  const [exportOpen, setExportOpen] = useState(false);
  const status = state.error ? 'Error' : state.saving || state.dirty ? 'Saving' : 'Saved';
  return <header class="topbar">
    <div class="brand"><Clapperboard size={20} aria-hidden="true" /><span>Showreel</span></div>
    <div class="project-name"><strong>{state.project?.name ?? 'Loading project…'}</strong></div>
    <span class={`save-status ${state.error ? 'error' : ''}`} role="status" title={state.error ?? ''}>{status}</span>
    {state.error && state.dirty && <Button onClick={() => store.save().catch(() => {})}>Retry save</Button>}
    <div class="history"><Tooltip text={state.past.length ? 'Undo (⌘/Ctrl Z)' : 'Nothing to undo (⌘/Ctrl Z)'}><Button size="icon" disabled={!state.past.length} aria-label="Undo" onClick={() => {store.undo(); notify('Undone');}}><Undo2 size={16} aria-hidden="true" /></Button></Tooltip><Tooltip text={state.future.length ? 'Redo (⌘/Ctrl Shift Z)' : 'Nothing to redo (⌘/Ctrl Shift Z)'}><Button size="icon" disabled={!state.future.length} aria-label="Redo" onClick={() => {store.redo(); notify('Redone');}}><Redo2 size={16} aria-hidden="true" /></Button></Tooltip></div>
    {state.composition && <div class="topbar-format"><span>Format</span><ToggleGroup aria-label="Format" value={state.composition.output.preset ?? (state.composition.output.height > state.composition.output.width ? 'vertical' : state.composition.output.height===state.composition.output.width ? 'square' : 'landscape')} onValueChange={value=>store.change('output.preset',value)} options={[{value:'landscape',label:'Landscape'},{value:'vertical',label:'Vertical'},{value:'square',label:'Square'}]}/></div>}
    <Tooltip text={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Button size="icon" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</Button></Tooltip>
    <Tooltip text={state.composition ? 'Export your video' : 'Load a recording before exporting'}><Button variant="default" disabled={!state.composition} onClick={() => setExportOpen(true)}><Download size={16} aria-hidden="true" />Export</Button></Tooltip>
    {exportOpen && <ExportDialog store={store} voice={voice} onClose={() => setExportOpen(false)} />}
  </header>;
}
