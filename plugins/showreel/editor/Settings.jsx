import { h } from 'preact';
import { useState } from 'preact/hooks';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
import { compositionPaths, zoomDepth } from '../scripts/lib/compose/composition.mjs';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select } from './ui/select.jsx';
import { Switch } from './ui/switch.jsx';
import { Slider } from './ui/slider.jsx';
import { Popover } from './ui/popover.jsx';
import { ToggleGroup } from './ui/toggle-group.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { RotateCcw } from 'lucide-preact';
import { groupSettings, errorsForPath } from './helpers.mjs';

function Color({ value, onChange, label, id, invalid }) {
  return <Popover label={`${label} colour`} trigger={<Button class="colour-swatch" id={id} aria-label={label}><span style={{background:value ?? 'transparent'}} />{value ?? 'None'}</Button>}>
    <div class="colour-editor"><Input type="color" aria-label={`${label} picker`} value={/^#[\da-f]{6}$/i.test(value) ? value : '#000000'} onInput={e => onChange(e.currentTarget.value)} />
    <Input aria-label={`${label} hex`} aria-invalid={invalid || undefined} type="text" value={value ?? ''} onInput={e => onChange(e.currentTarget.value || null)} /></div></Popover>;
}
function Control({ setting: s, value, onChange, values, change, invalid }) {
  const id = `setting-${s.path}`, label = s.label;
  const common = { id, 'aria-label': label, 'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? `${id}-error` : undefined };
  if (s.control === 'toggle') return <Switch {...common} checked={!!value} onCheckedChange={onChange} />;
  if (s.control === 'select') {
    const props = {...common, value, onValueChange: next => onChange(s.options.find(v => String(v) === String(next))), options:s.options.map(v => ({value:v,label:String(v).replace(/-/g,' ').replace(/^./,c => c.toUpperCase())}))};
    return s.options.length >= 2 && s.options.length <= 6 && s.options.every(v => String(v).length <= 8) ? <ToggleGroup {...props} /> : <Select {...props} />;
  }
  if (s.control === 'number') {
    const numeric = s.path === 'zoom.depth' ? zoomDepth(value) : value;
    return <div class="control-row"><Slider {...common} min={s.min} max={s.max} step={s.step} value={[numeric ?? s.min]} onValueChange={([next]) => onChange(next)} />
      <Input aria-label={`${label} value`} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} type="number" min={s.min} max={s.max} step={s.step} value={numeric ?? ''} onInput={e => onChange(e.currentTarget.value === '' ? null : +e.currentTarget.value)} />{s.unit && <span class="control-unit">{s.unit}</span>}</div>;
  }
  if (s.control === 'color') return <Color id={id} label={label} value={value} onChange={onChange} invalid={invalid} />;
  if (s.control === 'gradient') {
    const stops = Array.isArray(value) ? value : [], anglePath = s.path.replace(/colors$/, 'angle');
    return <div id={id} class="gradient" role="group" aria-label={label}>
      {stops.map((color, index) => <div class="control-row"><Color label={`${label} stop ${index + 1}`} value={color} onChange={next => onChange(stops.map((c, i) => i === index ? next : c))} />
        <Button aria-label={`Remove stop ${index + 1}`} disabled={stops.length <= 2} onClick={() => onChange(stops.filter((_, i) => i !== index))}>−</Button></div>)}
      <Button disabled={stops.length >= 4} onClick={() => onChange([...stops, stops.at(-1) ?? '#ffffff'])}>Add colour stop</Button>
      <Label>Angle <Input aria-label={`${label} angle`} type="number" min="0" max="360" value={values[anglePath]} onInput={e => change(anglePath, +e.currentTarget.value)} /></Label>
    </div>;
  }
  const array = Array.isArray(value);
  return <Input {...common} type="text" value={array ? JSON.stringify(value) : value ?? ''}
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
  const values = compositionPaths(state.composition), defaults = compositionPaths({});
  const tabNames = {look:'Look',cursor:'Cursor',zoom:'Zoom',captions:'Captions',cards:'Intro & outro',output:'Size & quality'};
  const ordered = ['look','cursor','zoom','captions','cards','output'].filter(name => names.includes(name));
  const change = (path, value) => store.change(path, value);
  function field(s) {
    const errors = errorsForPath(state.errors, s.path), id = `setting-${s.path}`;
    return <div class="setting" key={s.path}>
      <div class="setting-label"><Label for={id} title={s.help}>{s.label}</Label>{JSON.stringify(values[s.path]) !== JSON.stringify(defaults[s.path]) && <Tooltip text="Reset to default"><Button size="icon" class="reset" aria-label={`Reset ${s.label}`} onClick={() => store.change(s.path, undefined, { reset: true })}><RotateCcw size={14} aria-hidden="true" /></Button></Tooltip>}</div>
      <Control setting={s} value={values[s.path]} onChange={value => change(s.path, value)} values={values} change={change} invalid={!!errors.length} />
      <p class="setting-help">{s.help}</p>
      {!!errors.length && <p class="error" id={`${id}-error`}>{errors.join('\n')}</p>}
    </div>;
  }
  function fields(entries) {
    const sections = {};
    for (const entry of entries) (sections[entry.section] ??= []).push(entry);
    return Object.entries(sections).map(([name,items]) => <details class="setting-group" key={name} open><summary>{name.replace(/^title card/,"Intro card")}</summary>{items.map(field)}</details>);
  }
  return <aside class="settings" aria-label="Composition settings">
    <div class="panel-heading"><h2>Settings</h2><span>COMPOSITION</span></div>
    <Label class="search"><span class="sr-only">Search settings</span><Input type="search" placeholder="Search settings…" value={query} onInput={e => setQuery(e.currentTarget.value)} /></Label>
    <Tabs value={active ?? ''} onValueChange={setTab} className="settings-tabs">
      <TabsList aria-label="Settings groups">{ordered.map(name => <TabsTrigger key={name} value={name}>{tabNames[name]}</TabsTrigger>)}</TabsList>
      {active ? <TabsContent value={active}>
        {fields(groups[active].filter(s => !s.advanced))}
        {groups[active].some(s => s.advanced) && <details><summary>Advanced</summary>{fields(groups[active].filter(s => s.advanced))}</details>}
      </TabsContent> : <p class="empty">No matching settings</p>}
    </Tabs>
  </aside>;
}
