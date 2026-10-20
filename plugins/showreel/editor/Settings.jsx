import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { compositionPaths } from '../scripts/lib/compose/composition.mjs';
import { sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { clipsOf } from './clips.mjs';
import { panelFor } from './rail-model.mjs';
import { PANEL_META } from './panel-model.mjs';
import { buildSearchIndex, searchSettings } from './search-model.mjs';
import { setCaption } from './edit-ops.mjs';
import { Input } from './ui/input.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.jsx';
import { PanelShell, SearchBox } from './panels/PanelShell.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { Row, NumberPill } from './panels/Rows.jsx';
import { TopicPanel } from './panels/TopicPanel.jsx';
import { SearchResults } from './panels/SearchResults.jsx';
import { Type } from './panels/icons.js';
import { ZoomPanel } from './ZoomPanel.jsx';
import { ClipPanel } from './ClipPanel.jsx';
import { VoicePanel } from './VoicePanel.jsx';
import { MusicPanel } from './MusicPanel.jsx';
import { BrandPanel } from './BrandPanel.jsx';

function CaptionPanel({ state, store, cue, onClose }) {
  const [error, setError] = useState('');
  function patch(value) { try { store.setComposition(setCaption(state.composition, cue.id, value, { duration: state.project.record.durationSec, plan: state.plan }), `captions.${cue.id}`); setError(''); } catch (e) { setError(e.message); } }
  return <PanelShell ariaLabel="Caption settings" title="Caption" subtitle={`${cue.start.toFixed(2)}–${cue.end.toFixed(2)} s on the recording`} onClose={onClose} footer="Drag the caption on the timeline to move it">
    <SettingsCard id="caption-text" title="Text" icon={Type}>
      <Row stacked id="caption-text-input" label="Caption"><Input id="caption-text-input" aria-label="Caption text" value={cue.text} maxLength={140} onInput={e => patch({ text: e.currentTarget.value })} /></Row>
      {['start', 'end'].map(key => <Row key={key} id={`caption-${key}`} label={key === 'start' ? 'Start' : 'End'} tip={`When the caption ${key === 'start' ? 'appears' : 'disappears'}, in recording seconds.`}>
        <NumberPill id={`caption-${key}`} aria-label={`Caption ${key}`} min={0} step={0.01} unit="s" value={cue[key]} onChange={v => { if (v !== null) patch({ [key]: v }); }} /></Row>)}
      {error && <p class="error" role="alert">{error}</p>}
    </SettingsCard>
  </PanelShell>;
}
export function Settings(props) {
  const { state, store, controller, selection, setSelection, time, provider, topic = 'zoom', setTopic, reveal, setReveal } = props;
  const [query, setQuery] = useState(''), [audioTab, setAudioTab] = useState(reveal?.tab ?? 'voice');
  useEffect(() => { if (reveal?.tab) setAudioTab(reveal.tab); }, [reveal?.n]);
  const index = useMemo(() => buildSearchIndex(), []);
  const panel = panelFor(selection, topic), defaults = compositionPaths({}), values = { ...defaults, ...compositionPaths(state.composition) }; // projects saved before a setting existed show its default
  if (panel === 'zoom-selection') {
    const region = (state.plan?.regions ?? state.composition.zoom.regions).find(z => z.id === selection.id);
    if (region) return <ZoomPanel key={region.id} state={state} store={store} region={region} time={state.plan ? sourceAt(state.plan.timemap, time).t : 0} onClose={() => setSelection(null)} />;
  }
  if (panel === 'clip-selection') {
    const clip = clipsOf(state.composition, state.project.record.durationSec).find(c => c.id === selection.id);
    if (clip) return <ClipPanel key={clip.id} state={state} store={store} clip={clip} onClose={() => setSelection(null)} />;
  }
  if (panel === 'caption-selection') {
    const cue = (state.composition.captions.cues ?? state.plan?.cues ?? []).find(c => c.id === selection.id);
    if (cue) return <CaptionPanel key={cue.id} state={state} store={store} cue={cue} onClose={() => setSelection(null)} />;
  }
  const ctx = { state, store, controller, values, defaults, time, provider };
  const meta = PANEL_META[topic] ?? PANEL_META.zoom, trimmed = query.trim();
  const searchBox = <SearchBox value={query} onChange={setQuery} />;
  const alert = state.error && !state.plan ? state.error : null;
  if (trimmed) {
    const results = searchSettings(index, trimmed);
    return <PanelShell ariaLabel="Composition settings" title={meta.title} subtitle={meta.subtitle} search={searchBox} alert={alert} footer="Searching every topic">
      <SearchResults query={trimmed} results={results} ctx={ctx} onClear={() => setQuery('')} onSuggest={setQuery}
        onGo={entry => { setQuery(''); setReveal?.({ path: entry.host, card: entry.card, tab: entry.tab, n: Date.now() }); setTopic?.(entry.topic); }} />
    </PanelShell>;
  }
  if (topic === 'audio') {
    return <PanelShell ariaLabel="Composition settings" title={meta.title} subtitle={meta.subtitle} search={searchBox} alert={alert} scroll={false}>
      <Tabs value={audioTab} onValueChange={setAudioTab} className="panel-tabs">
        <TabsList aria-label="Audio settings"><TabsTrigger value="voice">Voice</TabsTrigger><TabsTrigger value="music">Music</TabsTrigger></TabsList>
        <div class="panel-scroll"><div class="panel-body"><TabsContent value="voice"><VoicePanel {...ctx} reveal={reveal} /></TabsContent><TabsContent value="music"><MusicPanel {...ctx} reveal={reveal} /></TabsContent></div>
          <p class="panel-foot">Changes save automatically</p></div>
      </Tabs>
    </PanelShell>;
  }
  return <PanelShell ariaLabel="Composition settings" title={meta.title} subtitle={meta.subtitle} search={searchBox} alert={alert}>
    {topic === 'brand' ? <BrandPanel state={state} store={store} /> : <TopicPanel topic={topic} ctx={ctx} reveal={reveal} />}
  </PanelShell>;
}
