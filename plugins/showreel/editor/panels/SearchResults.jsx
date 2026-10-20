import { h, Fragment } from 'preact';
import { ArrowRight } from 'lucide-preact';
import { SearchX } from './icons.js';
import { SEARCH_SUGGESTIONS } from '../panel-model.mjs';
import { highlightSegments } from '../search-model.mjs';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { SettingRow } from './SettingRow.jsx';
import { EmptyState } from './EmptyState.jsx';

const mark = (text, words) => highlightSegments(text, words).map(s => s.match ? <mark>{s.text}</mark> : s.text);
// Search results replace the panel body: grouped by topic, each with its topic badge, the real control and a Go to action.
export function SearchResults({ query, results, ctx, onGo, onClear, onSuggest }) {
  if (!results.total) return <EmptyState icon={SearchX} title={`No settings match “${query}”`} line="Try another word, or jump to one of these."
    action={<><Button variant="outline" size="sm" onClick={onClear}>Clear search</Button>
      <div class="chips" role="group" aria-label="Suggested settings">{SEARCH_SUGGESTIONS.map(s => <button key={s} type="button" class="chip" onClick={() => onSuggest(s)}>{s}</button>)}</div></>} />;
  return <div class="search-results" aria-label="Search results">
    <p class="search-count" role="status">{results.total} {results.total === 1 ? 'setting matches' : 'settings match'}</p>
    {results.groups.map(group => <section class="sgroup" key={group.topic} aria-label={group.label}>
      <h3>{group.label}</h3>
      {group.items.map(({ entry }) => <div class="sresult" key={`${entry.topic}:${entry.host}`}>
        <div class="sresult-head"><Badge>{entry.topicLabel}</Badge><span class="sresult-card">{entry.cardTitle}{entry.advanced ? ' · Advanced' : ''}</span>
          <Button size="sm" class="sresult-go" aria-label={`Go to ${entry.label}`} onClick={() => onGo(entry)}>Go to<ArrowRight size={12} aria-hidden="true" /></Button></div>
        {entry.renderable ? <SettingRow path={entry.host} ctx={ctx} words={results.words} /> : <div class="srow srow-inline"><div class="srow-head"><span class="srow-label">{mark(entry.label, results.words)}</span></div></div>}
      </div>)}
    </section>)}
  </div>;
}
