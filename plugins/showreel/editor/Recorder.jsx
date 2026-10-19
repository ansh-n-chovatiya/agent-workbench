import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Mic, Square, Check, RotateCcw, X } from 'lucide-preact';
import { Button } from './ui/button.jsx';
import { Checkbox } from './ui/checkbox.jsx';
import { Label } from './ui/label.jsx';
import { convertToWav, levelFromBytes } from './audio-wav.js';
import { formatDuration } from './voice-status.mjs';

const MAX_SECONDS = 600;
// Plain-language reasons the microphone could not start.
export function microphoneMessage(error) {
  const name = error?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone access is blocked. Allow the microphone for this page in your browser’s site settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found. Connect one and try again.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The microphone could not be opened. Another app may be using it.';
  return error?.message || 'The microphone could not be started.';
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Records one take: permission, optional 3-2-1 countdown, live level meter, stop, listen back, then Keep or Re-record.
// onSave receives a 48 kHz mono 16-bit WAV (Uint8Array); the caller uploads it.
export function Recorder({ stepName, onSave, onClose }) {
  const [phase, setPhase] = useState('idle'), [countdown, setCountdown] = useState(true), [count, setCount] = useState(0);
  const [level, setLevel] = useState(0), [seconds, setSeconds] = useState(0), [error, setError] = useState(''), [url, setUrl] = useState('');
  const live = useRef({ token: 0 }), blob = useRef(null);
  function release() {
    const l = live.current;
    l.token++; cancelAnimationFrame(l.raf); clearInterval(l.timer);
    if (l.recorder && l.recorder.state !== 'inactive') { l.recorder.onstop = null; try { l.recorder.stop(); } catch { /* already stopped */ } }
    l.stream?.getTracks().forEach(track => track.stop()); l.context?.close?.().catch(() => {});
    live.current = { token: l.token };
  }
  useEffect(() => () => { release(); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function begin() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('This browser cannot record audio here. Import an audio file instead.'); return; }
    release(); const l = live.current, token = l.token; setPhase('requesting');
    try { l.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { if (live.current === l) { setError(microphoneMessage(e)); setPhase('idle'); } return; }
    if (live.current !== l || l.token !== token) { l.stream.getTracks().forEach(track => track.stop()); return; }
    try {
      l.context = new AudioContext(); const analyser = l.context.createAnalyser(); analyser.fftSize = 512;
      l.context.createMediaStreamSource(l.stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const meter = () => { analyser.getByteTimeDomainData(data); setLevel(levelFromBytes(data)); l.raf = requestAnimationFrame(meter); };
      meter();
    } catch { /* the meter is a nicety; recording works without it */ }
    if (countdown) {
      setPhase('countdown');
      for (const n of [3, 2, 1]) { setCount(n); await sleep(1000); if (live.current !== l) return; }
    }
    const chunks = [];
    try { l.recorder = new MediaRecorder(l.stream); }
    catch (e) { setError(microphoneMessage(e)); setPhase('idle'); release(); return; }
    l.recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    l.recorder.onstop = () => {
      blob.current = new Blob(chunks, { type: l.recorder.mimeType || 'audio/webm' });
      setUrl(URL.createObjectURL(blob.current)); setPhase('review'); setLevel(0);
      l.stream?.getTracks().forEach(track => track.stop()); cancelAnimationFrame(l.raf); l.context?.close?.().catch(() => {});
    };
    l.recorder.onerror = e => { setError(e.error?.message ?? 'Recording failed.'); setPhase('idle'); release(); };
    l.recorder.start(250); setSeconds(0); setPhase('recording');
    const startedAt = performance.now();
    l.timer = setInterval(() => { const elapsed = (performance.now() - startedAt) / 1000; setSeconds(elapsed); if (elapsed >= MAX_SECONDS) stop(); }, 200);
  }
  function stop() { clearInterval(live.current.timer); if (live.current.recorder?.state === 'recording') live.current.recorder.stop(); }
  function again() { release(); blob.current = null; setUrl(''); setSeconds(0); setPhase('idle'); setError(''); }
  async function keep() {
    setPhase('saving'); setError('');
    try {
      const { wav } = await convertToWav(await blob.current.arrayBuffer());
      await onSave(wav); onClose();
    } catch (e) { setError(e.message); setPhase('review'); }
  }
  const busy = ['requesting', 'countdown'].includes(phase);
  return <div class="recorder" role="group" aria-label={`Record your voice for ${stepName}`}>
    {phase === 'idle' && <>
      <p class="setting-help">Record yourself reading this step. You can listen back before you keep it.</p>
      <Label class="check-row"><Checkbox aria-label="3-2-1 countdown" checked={countdown} onCheckedChange={setCountdown} />3-2-1 countdown first</Label>
    </>}
    {phase === 'requesting' && <p class="setting-help" role="status">Waiting for microphone permission…</p>}
    {phase === 'countdown' && <p class="recorder-count" role="status" aria-live="assertive">{count}</p>}
    {['countdown', 'recording'].includes(phase) && <div class="level-meter" role="meter" aria-label="Microphone level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(level * 100)}><span style={{ width: `${Math.round(level * 100)}%` }} /></div>}
    {phase === 'recording' && <p class="setting-help" role="status"><span class="rec-dot" aria-hidden="true" />Recording {formatDuration(seconds)}</p>}
    {phase === 'review' && <audio controls src={url} aria-label="Listen to your recording" />}
    {phase === 'saving' && <p class="setting-help" role="status">Saving your recording…</p>}
    {!!error && <p class="error" role="alert">{error}</p>}
    <div class="row-actions">
      {phase === 'idle' && <Button variant="outline" size="sm" onClick={begin}><Mic size={14} aria-hidden="true" />Start recording</Button>}
      {phase === 'recording' && <Button variant="outline" size="sm" onClick={stop}><Square size={14} aria-hidden="true" />Stop</Button>}
      {phase === 'review' && <><Button variant="outline" size="sm" onClick={keep}><Check size={14} aria-hidden="true" />Keep recording</Button><Button size="sm" onClick={again}><RotateCcw size={14} aria-hidden="true" />Re-record</Button></>}
      <Button size="sm" disabled={phase === 'saving'} onClick={() => { release(); onClose(); }}><X size={14} aria-hidden="true" />{busy || phase === 'recording' ? 'Cancel' : 'Close'}</Button>
    </div>
  </div>;
}
