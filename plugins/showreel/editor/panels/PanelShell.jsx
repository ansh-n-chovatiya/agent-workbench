import { h } from 'preact';
import { Search, X, TriangleAlert } from 'lucide-preact';
import { Button } from '../ui/button.jsx';
import { Tooltip } from '../ui/tooltip.jsx';

// The search field in the panel header: sticky, opaque, global. Cmd/Ctrl+K focuses it from anywhere.
export function SearchBox({ value, onChange, inputRef }) {
  return <div class="search">
    <Search size={14} aria-hidden="true" class="search-icon" />
    <input ref={inputRef} type="search" class="ui-input" aria-label="Search settings" placeholder="Search all settings" value={value} autocomplete="off" spellcheck={false}
      onInput={e => onChange(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
    {value ? <button type="button" class="search-clear" aria-label="Clear the search field" onClick={() => onChange('')}><X size={13} aria-hidden="true" /></button> : <kbd aria-hidden="true">⌘K</kbd>}
  </div>;
}
// Panel chrome: header (title, one-line subtitle, optional badge, close and search), optional tabs, a scroll area that fills its height
// with a quiet footer hint, and fixed actions at the bottom (Delete Zoom, Delete Clip).
export function PanelShell({ ariaLabel, title, subtitle, badge, search, children, footer = 'Changes save automatically', actions, onClose, closeLabel = 'Back to topics', alert, scroll = true }) {
  return <aside class="settings panel" aria-label={ariaLabel}>
    <div class="panel-head">
      <div class="panel-title"><h2>{title}</h2>{badge}{onClose && <Tooltip text="Back (Escape)" side="left"><Button size="icon" class="panel-close" aria-label={closeLabel} onClick={onClose}><X size={15} aria-hidden="true" /></Button></Tooltip>}</div>
      {subtitle && <p class="panel-sub">{subtitle}</p>}
      {search}
    </div>
    {alert && <div class="panel-alert" role="alert"><TriangleAlert size={14} aria-hidden="true" /><span>{alert}</span></div>}
    {scroll ? <div class="panel-scroll"><div class="panel-body">{children}</div>{footer && <p class="panel-foot">{footer}</p>}</div> : children}
    {actions && <div class="panel-actions">{actions}</div>}
  </aside>;
}
