import { h } from 'preact';
import { useState } from 'preact/hooks';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
import { compositionPaths, zoomDepth } from '../scripts/lib/compose/composition.mjs';
import { groupSettings, errorsForPath } from './helpers.mjs';

function Color({ value, onChange, label, id, invalid }) {
  return <div class="control-row"><input type="color" aria-label={`${label} picker`} value={/^#[\da-f]{6}$/i.test(value) ? value : '#000000'} onInput={e => onChange(e.currentTarget.value)} />
    <input id={id} aria-label={label} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} type="text" value={value ?? ''} onInput={e => onChange(e.currentTarget.value || null)} /></div>;
}
function Control({ setting: s, value, onChange, values, change, invalid }) {
  const id = `setting-${s.path}`, label = s.label;
  const common = { id, 'aria-label': label, 'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? `${id}-error` : undefined };
  if (s.control === 'toggle') return <input {...common} type="checkbox" checked={!!value} onChange={e => onChange(e.currentTarget.checked)} />;
  if (s.control === 'select') return <select {...common} value={value} onChange={e => onChange(s.options.find(v => String(v) === e.currentTarget.value))}>{s.options.map(option => <option value={option}>{option}</option>)}</select>;
  if (s.control === 'number') {
    const numeric = s.path === 'zoom.depth' ? zoomDepth(value) : value;
    return <div class="control-row"><input {...common} type="range" min={s.min} max={s.max} step={s.step} value={numeric ?? s.min} onInput={e => onChange(+e.currentTarget.value)} />
      <input aria-label={`${label} value`} aria-invalid={invalid || undefined} type="number" min={s.min} max={s.max} step={s.step} value={numeric ?? ''} onInput={e => onChange(e.currentTarget.value === '' ? null : +e.currentTarget.value)} />{s.unit && <span class="control-unit">{s.unit}</span>}</div>;
  }
  if (s.control === 'color') return <Color id={id} label={label} value={value} onChange={onChange} invalid={invalid} />;
  if (s.control === 'gradient') {
    const stops = Array.isArray(value) ? value : [], anglePath = s.path.replace(/colors$/, 'angle');
    return <div id={id} class="gradient" role="group" aria-label={label}>
      {stops.map((color, index) => <div class="control-row"><Color label={`${label} stop ${index + 1}`} value={color} onChange={next => onChange(stops.map((c, i) => i === index ? next : c))} />
        <button aria-label={`Remove stop ${index + 1}`} disabled={stops.length <= 2} onClick={() => onChange(stops.filter((_, i) => i !== index))}>−</button></div>)}
      <button disabled={stops.length >= 4} onClick={() => onChange([...stops, stops.at(-1) ?? '#ffffff'])}>Add colour stop</button>
      <label>Angle <input aria-label={`${label} angle`} type="number" min="0" max="360" value={values[anglePath]} onInput={e => change(anglePath, +e.currentTarget.value)} /></label>
    </div>;
  }
  const array = Array.isArray(value);
  return <input {...common} type="text" value={array ? JSON.stringify(value) : value ?? ''}
    placeholder={s.control === 'image' ? 'Choose project file: relative/path.png' : ''}
    onInput={e => {
      const text = e.currentTarget.value;
      if (s.path === 'zoom.onlyKinds') { try { onChange(JSON.parse(text)); } catch { onChange(text); } }
      else onChange(text || null);
    }} />;
}
export function Settings({ state, store }) {
  const [query, setQuery] = useState(''), [tab, setTab] = useState('look');
  const groups = groupSettings(SETTINGS, query), names = Object.keys(groups), active = groups[tab] ? tab : names[0];
  const values = compositionPaths(state.composition);
  const change = (path, value) => store.change(path, value);
  function field(s) {
    const errors = errorsForPath(state.errors, s.path), id = `setting-${s.path}`;
    return <div class="setting" key={s.path}>
      <div class="setting-label"><label for={id} title={s.help}>{s.label}</label><button class="reset" aria-label={`Reset ${s.label}`} title="Reset to default" onClick={() => store.change(s.path, undefined, { reset: true })}>↺</button></div>
      <Control setting={s} value={values[s.path]} onChange={value => change(s.path, value)} values={values} change={change} invalid={!!errors.length} />
      <p class="setting-help">{s.help}</p>
      {!!errors.length && <p class="error" id={`${id}-error`}>{errors.join('\n')}</p>}
    </div>;
  }
  function fields(entries) {
    const sections = {};
    for (const entry of entries) (sections[entry.section] ??= []).push(entry);
    return Object.entries(sections).map(([name,items]) => <fieldset class="setting-group" key={name}><legend>{name}</legend>{items.map(field)}</fieldset>);
  }
  return <aside class="settings" aria-label="Composition settings">
    <div class="panel-heading"><h2>Settings</h2><span>COMPOSITION</span></div>
    <label class="search"><span class="sr-only">Search settings</span><input type="search" placeholder="Search settings…" value={query} onInput={e => setQuery(e.currentTarget.value)} /></label>
    <div class="tabs" role="tablist" aria-label="Settings groups" onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const index = names.indexOf(active), next = e.key === 'Home' ? 0 : e.key === 'End' ? names.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length;
      setTab(names[next]); document.getElementById(`tab-${names[next]}`)?.focus();
    }}>{names.map(name => <button role="tab" id={`tab-${name}`} aria-selected={active === name} aria-controls={`panel-${name}`} tabIndex={active === name ? 0 : -1} onClick={() => setTab(name)}>{name}</button>)}</div>
    {active ? <div class="settings-body" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
      {fields(groups[active].filter(s => !s.advanced))}
      {groups[active].some(s => s.advanced) && <details><summary>Advanced settings</summary>{fields(groups[active].filter(s => s.advanced))}</details>}
    </div> : <p class="empty">No matching settings</p>}
  </aside>;
}
