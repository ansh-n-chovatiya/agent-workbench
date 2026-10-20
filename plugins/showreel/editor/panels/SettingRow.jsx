import { h } from 'preact';
import { useState } from 'preact/hooks';
import { settingFor } from '../../scripts/lib/compose/settings-schema.mjs';
import { GRADIENT_PRESETS } from '../gradient-presets.mjs';
import { changeComposition, zoomDepth } from '../../scripts/lib/compose/composition.mjs';
import { errorsForPath } from '../helpers.mjs';
import { LABELS, CONTROLS, CHIP_OPTIONS, optionLabel } from '../panel-model.mjs';
import { highlightSegments } from '../search-model.mjs';
import { Input } from '../ui/input.jsx';
import { Select } from '../ui/select.jsx';
import { Switch } from '../ui/switch.jsx';
import { Slider } from '../ui/slider.jsx';
import { ToggleGroup } from '../ui/toggle-group.jsx';
import { Row, ResetButton, NumberPill } from './Rows.jsx';
import { ColorSwatch } from './ColorSwatch.jsx';
import { GradientPicker } from './GradientPicker.jsx';
import { ImagePicker } from './ImagePicker.jsx';
import { Chips } from './Chips.jsx';
import { DepthChips } from '../ZoomPanel.jsx';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const labelFor = path => LABELS[path] ?? settingFor(path)?.label ?? path;
const highlight = (text, words) => words?.length ? highlightSegments(text, words).map(s => s.match ? <mark>{s.text}</mark> : s.text) : text;

// The right control for one setting path, in a compact row. `render` swaps in a custom control, `onChange` a custom writer,
// `words` highlights the matched text in search results.
export function SettingRow({ path, ctx, render, onChange, words, help, stacked, control: controlOverride }) {
  const s = settingFor(path);
  if (!s) return null;
  const { values, defaults, state, store } = ctx;
  const value = values[path], id = `setting-${path}`, label = labelFor(path), tip = help ?? s.help;
  const errors = errorsForPath(state.errors, path), invalid = !!errors.length;
  const error = invalid ? <p class="error" id={`${id}-error`}>{errors.join('\n')}</p> : null;
  const change = onChange ?? (next => store.change(path, next));
  const reset = <ResetButton label={label} visible={!same(value, defaults[path])} onClick={() => store.change(path, undefined, { reset: true })} />;
  const common = { id, path, label, labelNode: highlight(label, words), tip, reset, error };
  if (render) return <Row {...common} stacked={stacked}>{render({ id, value, onChange: change, invalid, label })}</Row>;
  const control = controlOverride ?? CONTROLS[path] ?? s.control;
  const aria = { id, 'aria-label': label, 'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? `${id}-error` : undefined };
  if (control === 'background') return <BackgroundControl base={path.replace(/\.type$/, '')} ctx={ctx} common={common} />;
  if (control === 'toggle') return <Row {...common}><Switch {...aria} checked={!!value} onCheckedChange={change} /></Row>;
  if (control === 'chips') return <Row {...common}><Chips id={id} label={label} options={CHIP_OPTIONS[path] ?? []} value={Array.isArray(value) ? value : []} onChange={change} /></Row>;
  if (control === 'depth') return <Row {...common} stacked><DepthChips depth={zoomDepth(value)} onChange={change} /></Row>;
  if (control === 'select') {
    const options = s.options.map(v => ({ value: v, label: optionLabel(path, v) }));
    const pick = next => change(s.options.find(v => String(v) === String(next)));
    if (options.length <= 4) return <Row {...common} stacked={stacked ?? options.map(o => o.label).join('').length > 18}><ToggleGroup id={id} aria-label={label} value={value} options={options} onValueChange={pick} /></Row>;
    return <Row {...common}><Select {...aria} value={value} options={options} onValueChange={pick} /></Row>;
  }
  if (control === 'number' || control === 'slider') {
    const numeric = path === 'zoom.depth' ? zoomDepth(value) : value;
    return <Row {...common} slider pill={<NumberPill aria-label={`${label} value`} aria-describedby={aria['aria-describedby']} invalid={invalid} value={numeric} min={s.min} max={s.max} step={s.step} unit={s.unit} onChange={change} />}>
      <Slider {...aria} min={s.min} max={s.max} step={s.step} value={[numeric ?? s.min]} onValueChange={([next]) => change(next)} />
    </Row>;
  }
  if (control === 'stepper') return <Row {...common}><NumberPill {...aria} invalid={invalid} value={value} min={s.min} max={s.max} step={s.step} unit={s.unit} onChange={change} /></Row>;
  if (control === 'color') return <Row {...common}><ColorSwatch id={id} label={label} value={value} onChange={change} invalid={invalid} nullable={path === 'cursor.clickEffect.color'} /></Row>;
  if (control === 'gradient') {
    const anglePath = path.replace(/colors$/, 'angle');
    return <Row {...common} stacked><GradientPicker id={id} label={label} colors={Array.isArray(value) ? value : []} angle={values[anglePath] ?? 135}
      onChange={({ colors, angle }) => store.setComposition(changeComposition(changeComposition(state.composition, path, colors), anglePath, angle), path)} /></Row>;
  }
  if (control === 'image') return <Row {...common} stacked><ImagePicker id={id} label={label} value={value} onChange={change} /></Row>;
  return <Row {...common} stacked><Input {...aria} type="text" value={value ?? ''} placeholder={s.placeholder ?? ''} onInput={e => change(e.currentTarget.value || null)} /></Row>;
}

// Background style plus the control it needs: gradient presets and stops, a solid colour swatch, or an image picker. One angle control, inside the gradient.
function BackgroundControl({ base, ctx, common }) {
  const { values, defaults, state, store } = ctx;
  const saved = values[`${base}.type`], colors = Array.isArray(values[`${base}.colors`]) ? values[`${base}.colors`] : [], angle = values[`${base}.angle`] ?? 135, image = values[`${base}.image`];
  // "Image" without an image yet is not a valid composition, so that choice stays local until the first file is uploaded.
  const [pending, setPending] = useState(null);
  const type = pending ?? saved;
  const paths = ['type', 'colors', 'angle', 'image'].map(leaf => `${base}.${leaf}`);
  const differs = paths.some(p => !same(values[p], defaults[p]));
  const setMany = (pairs, options) => { let c = state.composition; for (const [p, v] of pairs) c = changeComposition(c, p, v, options); store.setComposition(c, base); };
  const choose = next => {
    setPending(null);
    if (next === 'image' && !image) { setPending('image'); return; }
    if (next === 'gradient' && colors.length < 2) { setMany([[`${base}.type`, next], [`${base}.colors`, [...GRADIENT_PRESETS[0].colors]], [`${base}.angle`, GRADIENT_PRESETS[0].angle]]); return; }
    store.change(`${base}.type`, next);
  };
  const reset = <ResetButton label={common.label} visible={differs || !!pending} onClick={() => { setPending(null); setMany(paths.map(p => [p, undefined]), { reset: true }); }} />;
  const errorsOf = leaf => { const errors = errorsForPath(state.errors, `${base}.${leaf}`); return errors.length ? <p class="error" id={`setting-${base}.${leaf}-error`}>{errors.join('\n')}</p> : null; };
  const options = ['theme', 'gradient', 'solid', 'image'].map(v => ({ value: v, label: optionLabel(`${base}.type`, v) }));
  return <div class="bg-control">
    <Row {...common} reset={reset} error={null} stacked><ToggleGroup id={`setting-${base}.type`} aria-label={base === 'frame.background' ? common.label : settingFor(`${base}.type`).label} value={type} options={options} onValueChange={choose} /></Row>
    {type === 'theme' && <p class="srow-hint">Follows the colours of the chosen theme.</p>}
    {type === 'gradient' && <div class="srow srow-stacked" data-path={`${base}.colors`}>
      <GradientPicker id={`setting-${base}.colors`} label={labelFor(`${base}.colors`)} colors={colors} angle={angle} onChange={next => setMany([[`${base}.colors`, next.colors], [`${base}.angle`, next.angle]])} />{errorsOf('colors')}{errorsOf('angle')}
    </div>}
    {type === 'solid' && <Row id={`setting-${base}.colors`} path={`${base}.colors`} label="Colour" tip="The single colour behind the recording or card." error={errorsOf('colors')}>
      <ColorSwatch id={`setting-${base}.colors`} label={labelFor(`${base}.colors`)} value={colors[0]} onChange={c => store.change(`${base}.colors`, [c, ...colors.slice(1)])} invalid={!!errorsOf('colors')} />
    </Row>}
    {type === 'image' && <div class="srow srow-stacked" data-path={`${base}.image`}>
      <ImagePicker id={`setting-${base}.image`} label={labelFor(`${base}.image`)} value={image}
        onChange={v => { setPending(null); if (v) setMany([[`${base}.image`, v], [`${base}.type`, 'image']]); else setMany([[`${base}.image`, null], [`${base}.type`, 'theme']]); }} />
      {pending === 'image' && <p class="srow-hint">Choose an image to use it as the background.</p>}{errorsOf('image')}
    </div>}
  </div>;
}
