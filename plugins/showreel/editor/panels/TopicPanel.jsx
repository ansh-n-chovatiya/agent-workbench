import { h, Fragment } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as icons from './icons.js';
import { changeComposition } from '../../scripts/lib/compose/composition.mjs';
import { TOPIC_CARDS, ABSORBED, cardPaths } from '../panel-model.mjs';
import { SIZE_PRESETS, presetForSize, sizeForPreset, sizeLabel } from '../size-presets.mjs';
import { autoZoomRegenerate } from '../edit-ops.mjs';
import { Button } from '../ui/button.jsx';
import { ToggleGroup } from '../ui/toggle-group.jsx';
import { SettingsCard } from './SettingsCard.jsx';
import { SettingRow } from './SettingRow.jsx';
import { Row, ResetButton } from './Rows.jsx';
import { EmptyState } from './EmptyState.jsx';
import { ThemeCards } from '../ThemeCards.jsx';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function RecordingInfo({ state }) {
  const { project, plan } = state, record = project.record ?? {};
  const warnings = (plan?.warnings ?? []).filter(w => typeof w === 'string' && /recording.*video|profiles differ/.test(w));
  return <>
    <div class="info-rows">
      {[['Run', project.runId], ['Profile', record.profile ?? project.events?.profile ?? 'desktop'], ['Length', `${(record.durationSec ?? 0).toFixed(1)} s`],
        ['Captured at', record.video ? `${record.video.width} × ${record.video.height}` : '—']].map(([k, v]) => <div class="info-row" key={k}><span>{k}</span><span title={String(v)}>{v}</span></div>)}
    </div>
    {warnings.map(w => <p class="warning" key={w}>{w}</p>)}
    <p class="srow-hint">Open a different recording from the command line to switch runs.</p>
  </>;
}
function SizePresets({ ctx }) {
  const { state, store, values, defaults } = ctx, output = state.composition.output;
  const current = presetForSize(output);
  const options = [...SIZE_PRESETS.map(p => ({ value: p.id, label: p.label })), ...(current === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])];
  const differs = !same(values['output.width'], defaults['output.width']) || !same(values['output.height'], defaults['output.height']);
  const reset = <ResetButton label="Size" visible={differs} onClick={() => store.setComposition(changeComposition(changeComposition(state.composition, 'output.width', undefined, { reset: true }), 'output.height', undefined, { reset: true }), 'output.size')} />;
  return <Row stacked id="output-size" path="output.size" label="Size" tip="The finished video's resolution. 1080p suits most uploads; custom sizes sit under Advanced." reset={reset}
    hint={`${sizeLabel(output)} · ${SIZE_PRESETS.find(p => p.id === current)?.hint ?? 'Custom size'}`}>
    <ToggleGroup id="output-size" aria-label="Output size" value={current} options={options} onValueChange={id => {
      if (id === 'custom') return;
      const { width, height } = sizeForPreset(id, output);
      store.setComposition(changeComposition(changeComposition(state.composition, 'output.width', width), 'output.height', height), 'output.size');
    }} />
  </Row>;
}
// Custom width or height means a custom size: the format preset no longer dictates the pixels.
const customSize = (ctx, path) => value => {
  let c = changeComposition(ctx.state.composition, path, value);
  if (value !== null) c = changeComposition(c, 'output.preset', null);
  ctx.store.setComposition(c, path);
};
function CardView({ card, ctx, reveal }) {
  const Icon = icons[card.icon];
  const rows = (paths, extra = {}) => paths.map(p => <SettingRow key={p} path={p} ctx={ctx} {...(card.special === 'size' && /^output\.(width|height)$/.test(p) ? { onChange: customSize(ctx, p) } : {})} {...extra} />);
  const paths = cardPaths(card);
  const resetAll = paths.length ? () => { let c = ctx.state.composition; for (const p of paths) c = changeComposition(c, p, undefined, { reset: true }); ctx.store.setComposition(c, card.id); } : null;
  const target = reveal ? (ABSORBED[reveal.path] ?? reveal.path) : null;
  const before = card.special === 'theme' ? <ThemeCards state={ctx.state} store={ctx.store} time={ctx.time} provider={ctx.provider} />
    : card.special === 'recording' ? <RecordingInfo state={ctx.state} /> : card.special === 'size' ? <SizePresets ctx={ctx} /> : null;
  return <SettingsCard id={card.id} title={card.title} icon={Icon} description={card.description} onReset={resetAll}
    advanced={card.advanced?.length ? rows(card.advanced) : null} forceOpen={!!target && !!card.advanced?.includes(target)}>
    {before}{card.primary?.length ? rows(card.primary) : null}
  </SettingsCard>;
}
function TopicEmptyState({ topic, ctx }) {
  const { state, store } = ctx;
  if (topic === 'zoom') {
    const regions = state.plan?.regions ?? state.composition.zoom.regions ?? [];
    if (regions.length) return null;
    const { events, record } = state.project;
    return <EmptyState icon={icons.ZoomIn} title="No zooms yet" line="Add one from the timeline, or let Showreel place zooms around clicks and typing."
      action={<Button variant="outline" size="sm" onClick={() => { const next = autoZoomRegenerate(state.composition, events, record); next.zoom.enabled = true; next.zoom.autoSuggest = false; store.setComposition(next, 'zoom.regions'); }}><icons.WandSparkles size={13} aria-hidden="true" />Auto zoom</Button>} />;
  }
  if (topic === 'captions') {
    const cues = state.composition.captions.cues ?? state.plan?.cues ?? [];
    if (cues.length) return null;
    return <EmptyState icon={icons.Captions} title="No captions yet" line="Captions come from your steps. Add one with Add Layer on the timeline." />;
  }
  return null;
}
// A topic's cards from the curation model, plus its empty state and a scroll-to for "Go to" from search.
export function TopicPanel({ topic, ctx, reveal }) {
  const root = useRef();
  useEffect(() => {
    if (!reveal?.path || !root.current) return;
    const host = ABSORBED[reveal.path] ?? reveal.path;
    const el = root.current.querySelector(`[data-path="${CSS.escape(host)}"]`) ?? root.current.querySelector(`[data-card="${CSS.escape(reveal.card ?? '')}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'instant' }); el.classList.add('flash');
    const timer = setTimeout(() => el.classList.remove('flash'), 1500);
    return () => clearTimeout(timer);
  }, [reveal?.n]);
  const cards = TOPIC_CARDS[topic] ?? [];
  return <div class="topic-panel" ref={root}>
    {cards.map((card, i) => <Fragment key={card.id}><CardView card={card} ctx={ctx} reveal={reveal} />{i === 0 && <TopicEmptyState topic={topic} ctx={ctx} />}</Fragment>)}
  </div>;
}
