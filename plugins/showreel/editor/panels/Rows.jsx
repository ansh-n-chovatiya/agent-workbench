import { h } from 'preact';
import { RotateCcw } from 'lucide-preact';
import { Label } from '../ui/label.jsx';
import { Button } from '../ui/button.jsx';
import { Tooltip } from '../ui/tooltip.jsx';
import { InfoTip } from './InfoTip.jsx';

// One setting row. Inline: label left, control right. Stacked: control under the label. Slider: label + value pill, slider under it.
export function Row({ id, path, label, labelNode, tip, reset, pill, stacked = false, slider = false, children, error, hint }) {
  const kind = slider ? 'slider' : stacked ? 'stacked' : 'inline';
  return <div class={`srow srow-${kind}`} data-path={path}>
    <div class="srow-head">
      <Label class="srow-label" for={id}>{labelNode ?? label}</Label>
      {tip && <InfoTip label={label} text={tip} />}
      <span class="srow-spacer" />
      {reset}
      {pill}
    </div>
    {children && <div class="srow-control">{children}</div>}
    {hint && <p class="srow-hint">{hint}</p>}
    {error}
  </div>;
}
// Appears on hover or focus only when the value differs from its default.
export function ResetButton({ label, onClick, visible }) {
  if (!visible) return null;
  return <Tooltip text="Reset to default" side="top"><Button size="icon" class="reset" aria-label={`Reset ${label}`} onClick={onClick}><RotateCcw size={13} aria-hidden="true" /></Button></Tooltip>;
}
// A small editable value with its unit, shown beside slider labels instead of a full-width number box.
export function NumberPill({ value, min, max, step, unit, invalid, onChange, id, ...rest }) {
  const digits = Math.max(String(Math.round(max ?? 0)).length, String(Math.round(min ?? 0)).length) + (step && step < 1 ? 3 : 0);
  return <span class={`num-pill ${invalid ? 'invalid' : ''}`}>
    <input id={id} type="number" min={min} max={max} step={step} value={value ?? ''} aria-invalid={invalid || undefined} style={{ width: `${Math.max(3, digits) + 1}ch` }}
      onInput={e => onChange(e.currentTarget.value === '' ? null : +e.currentTarget.value)} {...rest} />
    {unit && <span class="num-pill-unit">{unit}</span>}
  </span>;
}
