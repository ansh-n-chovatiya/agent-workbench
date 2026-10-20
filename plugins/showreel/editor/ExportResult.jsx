import { h } from 'preact';
import { useState } from 'preact/hooks';
import { CheckCircle2, FolderOpen, Play, Copy } from 'lucide-preact';
import { Button } from './ui/button.jsx';
import { request } from './state.js';
import { shortPath, formatSize, formatDuration } from './export-model.mjs';
import { loudnessText } from './voice-status.mjs';

export function ExportResult({ result, homeDir, onAgain, onError }) {
  const [copied, setCopied] = useState(false);
  async function action(route) { try { await request(route, { method: 'POST' }); } catch (error) { onError(error.message); } }
  async function copy() {
    try { await navigator.clipboard.writeText(result.finalFile); setCopied(true); }
    catch { onError('Could not copy the path. Allow clipboard access and try again.'); }
  }
  return <section class="export-result" aria-label="Export result">
    <h3><CheckCircle2 size={22} aria-hidden="true" />Your video is ready</h3>
    <img class="export-poster" src={`${result.posterUrl}?v=${encodeURIComponent(result.finalFile)}`} alt="A frame from your exported video" />
    <strong class="export-file-name">{result.fileName}</strong>
    <p class="export-folder" title={result.folder}>{shortPath(result.folder, homeDir)}</p>
    <p class="export-metadata">{formatSize(result.sizeBytes)} · {formatDuration(result.durationSec)} · {result.width} × {result.height} · {result.fps} fps</p>
    {(result.loudness || result.audio) && <p class="loudness-result">Sound: {loudnessText(result.audio ?? result.loudness) ?? 'could not be measured'}</p>}
    {result.audio?.warnings?.map((warning, i) => <p key={i} class="warning">{warning}</p>)}
    <div class="export-result-actions">
      <Button variant="default" onClick={() => action('/api/reveal')}><FolderOpen size={15} aria-hidden="true" />Show in folder</Button>
      <Button variant="outline" onClick={() => action('/api/open')}><Play size={15} aria-hidden="true" />Open video</Button>
      <Button variant="outline" onClick={copy}><Copy size={15} aria-hidden="true" />{copied ? 'Copied' : 'Copy path'}</Button>
    </div>
    <span role="status" class="sr-only">{copied ? 'Path copied' : ''}</span>
    <div class="export-secondary"><a href="/api/export/download" download={result.fileName}>Download a copy</a><Button onClick={onAgain}>Export again</Button></div>
  </section>;
}
