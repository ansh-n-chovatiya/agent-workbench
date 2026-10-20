import { h, Fragment } from 'preact';
import * as icons from './panels/icons.js';
import { RAIL_TOPICS } from './rail-model.mjs';
import { Button } from './ui/button.jsx';
import { Tooltip } from './ui/tooltip.jsx';
// 56 px rail: 44 px targets, tooltips to the right, a selected pill, and a hairline before Export settings. Never scrolls at 640 px.
export function Rail({topic,onChange}) {
  return <nav class="editor-rail" aria-label="Editor topics">{RAIL_TOPICS.map(item => {
    const Icon = icons[item.icon];
    return <Fragment key={item.id}>
      {item.divider && <hr class="rail-divider" aria-hidden="true"/>}
      <Tooltip text={item.label} side="right"><Button size="icon" class="rail-item" aria-label={item.label} aria-pressed={topic===item.id} onClick={()=>onChange(item.id)}><Icon size={20} aria-hidden="true"/></Button></Tooltip>
    </Fragment>;
  })}</nav>;
}
