import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Plus, SlidersHorizontal, X } from 'lucide-preact';
import { Button } from '../ui/button.jsx';
import { Slider } from '../ui/slider.jsx';
import { ColorSwatch } from './ColorSwatch.jsx';
import { Row, NumberPill } from './Rows.jsx';
import { GRADIENT_PRESETS, MIN_STOPS, MAX_STOPS, addStop, removeStop, gradientCss, matchGradientPreset } from '../gradient-presets.mjs';

// Visual preset swatches plus Custom: colour stops with add and remove, and ONE angle control.
export function GradientPicker({ id, label, colors = [], angle = 135, onChange }) {
  const current = matchGradientPreset(colors, angle);
  const [custom, setCustom] = useState(current === 'custom');
  const showCustom = custom || current === 'custom';
  const set = next => onChange({ colors, angle, ...next });
  return <div class="gradient-picker" id={id} role="group" aria-label={label}>
    <div class="gswatches">
      {GRADIENT_PRESETS.map(p => <button key={p.id} type="button" class="gswatch" style={{ background: gradientCss(p.colors, p.angle) }} title={p.name} aria-label={`${p.name} gradient`} aria-pressed={current === p.id}
        onClick={() => { setCustom(false); onChange({ colors: [...p.colors], angle: p.angle }); }} />)}
    </div>
    <div class="chips"><button type="button" class="chip" aria-pressed={showCustom} onClick={() => setCustom(true)}><SlidersHorizontal size={12} aria-hidden="true" />Custom</button></div>
    {showCustom && <div class="gradient-custom">
      <div class="gpreview" style={{ background: gradientCss(colors, angle) }} aria-hidden="true" />
      <div class="gstops">
        {colors.map((color, i) => <div class="gstop" key={i}>
          <ColorSwatch label={`${label} stop ${i + 1}`} value={color} onChange={next => set({ colors: colors.map((c, k) => k === i ? next : c) })} />
          <Button size="icon" class="gstop-remove" aria-label={`Remove stop ${i + 1}`} disabled={colors.length <= MIN_STOPS} onClick={() => set({ colors: removeStop(colors, i) })}><X size={13} aria-hidden="true" /></Button>
        </div>)}
        <Button size="sm" variant="outline" class="gadd" disabled={colors.length >= MAX_STOPS} onClick={() => set({ colors: addStop(colors) })}><Plus size={13} aria-hidden="true" />Add stop</Button>
      </div>
      <Row slider id={`${id}-angle`} label="Angle" pill={<NumberPill aria-label={`${label} angle value`} value={angle} min={0} max={360} step={1} unit="°" onChange={v => v !== null && set({ angle: v })} />}>
        <Slider id={`${id}-angle`} aria-label={`${label} angle`} min={0} max={360} step={1} value={[angle]} onValueChange={([v]) => set({ angle: v })} />
      </Row>
    </div>}
  </div>;
}
