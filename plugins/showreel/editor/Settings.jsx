import { h } from 'preact';
import { useState } from 'preact/hooks';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
import { compositionPaths } from '../scripts/lib/compose/composition.mjs';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.jsx';
import { groupSettings } from './helpers.mjs';
import { SettingField } from './SettingField.jsx';
import { VoicePanel } from './VoicePanel.jsx';
import { MusicPanel } from './MusicPanel.jsx';

export function Settings({ state, store, controller }) {
  const [query, setQuery] = useState(''), [tab, setTab] = useState('look');
  const groups = groupSettings(SETTINGS, query), names = Object.keys(groups);
  const values = compositionPaths(state.composition), defaults = compositionPaths({});
  // The schema's 'audio' group is shown by two custom panels: Voice (audio.voice.*) and Music (music, ducking and loudness).
  const audio = groups.audio ?? [];
  const tabNames = {look:'Look',cursor:'Cursor',zoom:'Zoom',captions:'Captions',cards:'Intro & outro',audio:'Audio',voice:'Voice',music:'Music',output:'Size & quality'};
  const has = {voice: audio.some(s => s.path.startsWith('audio.voice.')), music: audio.some(s => !s.path.startsWith('audio.voice.'))};
  const ordered = ['look','cursor','zoom','captions','cards','voice','music','output'].filter(name => name === 'voice' || name === 'music' ? has[name] && controller : names.includes(name));
  const active = ordered.includes(tab) ? tab : ordered[0];
  const field = s => <SettingField key={s.path} setting={s} values={values} defaults={defaults} state={state} store={store} />;
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
      {active === 'voice' ? <TabsContent value="voice"><VoicePanel state={state} store={store} controller={controller} values={values} defaults={defaults} /></TabsContent>
        : active === 'music' ? <TabsContent value="music"><MusicPanel state={state} store={store} controller={controller} values={values} defaults={defaults} /></TabsContent>
        : active ? <TabsContent value={active}>
          {fields(groups[active].filter(s => !s.advanced))}
          {groups[active].some(s => s.advanced) && <details><summary>Advanced</summary>{fields(groups[active].filter(s => s.advanced))}</details>}
        </TabsContent> : <p class="empty">No matching settings</p>}
    </Tabs>
  </aside>;
}
