import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawFrame, loadFonts, loadAssets } from '../scripts/lib/compose/draw.js';
import { stateAt } from '../scripts/lib/compose/plan.mjs';
import { timecode } from './helpers.mjs';

export function Preview({ plan, provider, time, setTime, playing, setPlaying, onPick }) {
  const canvas = useRef(), current = useRef(time), drawn = useRef(null);
  const [loop, setLoop] = useState(false), [rate, setRate] = useState(1);
  const [assets, setAssets] = useState(null), [error, setError] = useState(''), [dropped, setDropped] = useState(false);
  current.current = time;
  const duration = plan?.timemap.outputDuration ?? 0, fps = plan?.output.fps ?? 30;
  useEffect(() => {
    let active = true; setAssets(null); setError('');
    if (plan) Promise.all([
      loadFonts({ regular: '/fonts/Inter-Regular.woff2', semibold: '/fonts/Inter-SemiBold.woff2' }),
      loadAssets(plan, { assetBase: '/media/asset/' }),
    ]).then(([, loaded]) => { if (active) setAssets(loaded); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [plan]);
  useEffect(() => {
    if (!playing) provider?.pause();
    if (!playing || !duration) return;
    let raf, last = performance.now();
    const tick = now => {
      const elapsed = (now - last) / 1000; last = now;
      let next = current.current + elapsed * rate;
      if (next >= duration) { next = loop ? next % duration : duration; if (!loop) setPlaying(false); }
      current.current = next; setTime(next); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); provider?.pause(); };
  }, [playing, duration, rate, loop, provider]);
  useEffect(() => { if (time > duration) setTime(duration); }, [duration]);
  useEffect(() => {
    if (!plan || !provider || !assets) return;
    let active = true, raf, busy = false, lastTime = -1, count = 0, windowStart = performance.now();
    setDropped(false);
    const tick = async () => {
      if (!active) return;
      raf = requestAnimationFrame(tick);
      const t = current.current;
      if (busy || t === lastTime) return;
      busy = true;
      try {
        const state = stateAt(plan, t);
        const frame = state.section === 'main' ? await provider.getFrame(state.sourceT) : null;
        if (!active) return;
        const target = canvas.current, scale = Math.min(960 / plan.output.width, 1);
        const width = Math.round(plan.output.width * scale), height = Math.round(plan.output.height * scale);
        if (target.width !== width || target.height !== height) { target.width = width; target.height = height; }
        target.getContext('2d').setTransform(width / plan.output.width, 0, 0, height / plan.output.height, 0, 0);
        drawFrame(target, plan, t, frame, assets); drawn.current = { plan, state }; lastTime = t;
        if (playing) { provider.prefetch(state.sourceT); count++; }
        const now = performance.now();
        if (now - windowStart >= 1500) { setDropped(playing && count * 1000 / (now - windowStart) < 24); count = 0; windowStart = now; }
      } catch (e) { if (active) { setError(e.message); setPlaying(false); } }
      finally { busy = false; }
    };
    raf = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [plan, provider, assets, playing]);
  function pick(event) {
    if (!onPick || !drawn.current) return;
    const { plan: p, state } = drawn.current;
    if (state.section !== 'main') return;
    const rect = canvas.current.getBoundingClientRect(), f = p.layout.frame;
    const x = (event.clientX - rect.left) / rect.width * p.output.width;
    const y = (event.clientY - rect.top) / rect.height * p.output.height;
    if (x < f.x || x > f.x + f.w || y < f.y || y > f.y + f.h) return;
    const camera = state.camera;
    onPick({ x: camera.cx + ((x - f.x) / f.w - 0.5) * p.sourceSize.width / camera.z / p.scale,
      y: camera.cy + ((y - f.y) / f.h - 0.5) * p.sourceSize.height / camera.z / p.scale });
  }
  const step = direction => { setPlaying(false); setTime(Math.max(0, Math.min(duration, time + direction / fps))); };
  return <section class="preview" aria-label="Video preview">
    <div class="preview-stage"><canvas ref={canvas} onClick={pick} aria-label="Composition preview; click to pick zoom focus" style={{ aspectRatio: plan ? `${plan.output.width}/${plan.output.height}` : '16/9' }} /></div>
    {error && <p class="error" role="alert">{error}</p>}
    {dropped && <p class="warning" role="status">Preview below 24 fps — frames are being dropped.</p>}
    <div class="transport">
      <button onClick={() => step(-1)} title="Previous frame (,)" disabled={!plan}>‹</button>
      <button onClick={() => setPlaying(!playing)} disabled={!plan || !assets} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Pause' : 'Play'}</button>
      <button onClick={() => step(1)} title="Next frame (.)" disabled={!plan}>›</button>
      <output class="timecode">{timecode(time, fps)} / {timecode(duration, fps)}</output>
      <label class="seek"><span class="sr-only">Seek</span><input type="range" aria-label="Seek output time" min="0" max={duration} step={1 / fps} value={time} onInput={e => { setPlaying(false); setTime(+e.currentTarget.value); }} /></label>
      <label><input type="checkbox" checked={loop} onChange={e => setLoop(e.currentTarget.checked)} /> Loop</label>
      <label><span class="sr-only">Playback rate</span><select aria-label="Playback rate" value={rate} onChange={e => setRate(+e.currentTarget.value)}>{[0.5, 1, 2].map(n => <option value={n}>{n}×</option>)}</select></label>
    </div>
  </section>;
}
