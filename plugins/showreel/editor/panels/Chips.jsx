import { h } from 'preact';
// Multi-select toggle chips (for example the Clicks and Typing zoom triggers). At least `min` stay selected.
export function Chips({ id, label, options, value = [], onChange, min = 1, disabled = false }) {
  const toggle = option => {
    const selected = value.includes(option);
    if (selected && value.length <= min) return;
    onChange(selected ? value.filter(v => v !== option) : options.filter(o => o.value === option || value.includes(o.value)).map(o => o.value));
  };
  return <div id={id} class="chips" role="group" aria-label={label}>
    {options.map(o => <button key={String(o.value)} type="button" class="chip" disabled={disabled} aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>{o.label}</button>)}
  </div>;
}
