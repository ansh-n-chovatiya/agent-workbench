import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Pipette } from 'lucide-preact';
import { Popover } from '../ui/popover.jsx';
import { Input } from '../ui/input.jsx';
import { Button } from '../ui/button.jsx';
import { COLOR_PRESETS, isHex } from '../gradient-presets.mjs';

const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
// A swatch button that opens a popover with preset colours, the native picker and a hex field. `nullable` adds "Use theme colour".
export function ColorSwatch({ id, label, value, onChange, nullable = false, nullLabel = 'Theme colour', invalid = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen} label={`${label} colour`} trigger={
    <button type="button" id={id} class="swatch-btn" aria-label={label} aria-invalid={invalid || undefined} disabled={disabled}>
      <i class={`swatch ${value ? '' : 'none'}`} style={value ? { background: value } : undefined} aria-hidden="true" /><span class="swatch-text">{value ?? nullLabel}</span>
    </button>}>
    <div class="swatch-pop">
      <div class="swatch-grid" role="group" aria-label={`${label} presets`}>
        {COLOR_PRESETS.map(p => <button key={p.hex} type="button" class="swatch-cell" style={{ background: p.hex }} aria-label={p.name} aria-pressed={same(p.hex, value)} onClick={() => onChange(p.hex)} />)}
      </div>
      <div class="swatch-custom">
        <label class="swatch-native" title="Pick any colour"><input type="color" aria-label={`${label} picker`} value={isHex(value) ? value : '#000000'} onInput={e => onChange(e.currentTarget.value)} /><Pipette size={13} aria-hidden="true" /></label>
        <Input aria-label={`${label} hex`} aria-invalid={invalid || undefined} value={value ?? ''} placeholder="#rrggbb" spellcheck={false} onInput={e => onChange(e.currentTarget.value || null)} />
      </div>
      {nullable && <Button size="sm" variant="outline" class="swatch-null" aria-pressed={value == null} onClick={() => { onChange(null); setOpen(false); }}>Use theme colour</Button>}
    </div>
  </Popover>;
}
