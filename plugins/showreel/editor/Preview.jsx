import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawFrame, loadFonts, loadAssets } from '../scripts/lib/compose/draw.js';
import { stateAt } from '../scripts/lib/compose/plan.mjs';
import { timecode } from './helpers.mjs';
import { playbackSync, previewBelowRate } from './playback.mjs';

export function Preview({ plan, provider, time, setTime, playing, setPlaying, onPick, focus }) {
  const video = useRef(), canvas = useRef(), current = useRef(time), drawn = useRef(null);
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
  useEffect(() => { if (time > duration) setTime(duration); }, [duration]);
  useEffect(() => {
    const media = video.current;
    provider?.pause();
    if (!plan || !provider || !assets || !media) return;
    let active = true, raf, busy = false, lastTime = -1, last = performance.now();
    let main = false, starting = false, seeking = false, frameCallback;
    let serial = 0, drawnSerial = 0, expected = 0, previousFrame = null;
    const samples = [], perf = window.__editorPerf ??= { presentedFrames: 0, lastFrameMs: 0 };
    setDropped(false);
    const fail = e => { if (active) { setError(e.message); setPlaying(false); } };
    const resetFrames = () => { previousFrame = null; expected = 0; samples.length = 0; setDropped(false); };
    const seeked = () => { seeking = false; resetFrames(); };
    media.addEventListener('seeked', seeked);
    const presented = (now, metadata) => {
      if (!active) return;
      if (main && !seeking && !media.seeking) {
        if (previousFrame && metadata.mediaTime !== previousFrame.mediaTime) {
          serial++;
          const elapsed = Math.max(0, metadata.mediaTime - previousFrame.mediaTime);
          expected += Math.min(elapsed * provider.averageFrameRate,
            Math.max(0, metadata.presentedFrames - previousFrame.presentedFrames));
        } else if (!previousFrame) serial++;
        previousFrame = metadata;
      }
      frameCallback = media.requestVideoFrameCallback(presented);
    };
    if (playing && media.requestVideoFrameCallback) frameCallback = media.requestVideoFrameCallback(presented);
    function paint(t, state, frame) {
      const start = performance.now(), target = canvas.current, scale = Math.min(960 / plan.output.width, 1);
      const width = Math.round(plan.output.width * scale), height = Math.round(plan.output.height * scale);
      if (target.width !== width || target.height !== height) { target.width = width; target.height = height; }
      target.getContext('2d').setTransform(width / plan.output.width, 0, 0, height / plan.output.height, 0, 0);
      drawFrame(target, plan, t, frame, assets); drawn.current = { plan, state }; lastTime = t;
      if (playing) perf.lastFrameMs = performance.now() - start;
    }
    const tick = async now => {
      if (!active) return;
      raf = requestAnimationFrame(tick);
      if (playing) {
        let next = current.current + (now - last) / 1000 * rate;
        if (next >= duration) {
          next = loop ? next % duration : duration;
          if (!loop) { media.pause(); setPlaying(false); }
        }
        current.current = next; setTime(next);
      }
      last = now;
      const t = current.current, state = stateAt(plan, t);
      try {
        if (playing) {
          const inMain = state.section === 'main';
          if (inMain !== main) { main = inMain; resetFrames(); }
          if (!main) {
            media.pause();
            paint(t, state, null);
            return;
          }
          const sync = playbackSync(state.sourceT, media.currentTime, state.rate, rate);
          if (media.playbackRate !== sync.playbackRate) media.playbackRate = sync.playbackRate;
          if (!seeking && !media.seeking && media.readyState >= 1 && sync.action === 'seek') {
            seeking = true; resetFrames(); media.currentTime = state.sourceT;
          }
          if (media.paused && !starting) {
            starting = true;
            media.play().catch(e => { if (e.name !== 'AbortError') fail(e); }).finally(() => {
              starting = false;
            });
          }
          // Future audio sync belongs here: syncPlaybackAudio(state.sourceT, sync.playbackRate).
          // Seek completion is event driven; retain the canvas while the video has no usable frame.
          let count = 0;
          if (!seeking && !media.seeking && media.readyState >= 2) {
            paint(t, state, media);
            if (serial !== drawnSerial) { count = 1; perf.presentedFrames++; drawnSerial = serial; }
          }
          samples.push({ now, expected, presented: count }); expected = 0;
          while (samples.length > 1 && samples[0].now < now - 2000) samples.shift();
          setDropped(previewBelowRate(samples, provider.averageFrameRate));
        } else {
          media.pause();
          if (busy || t === lastTime) return;
          busy = true;
          try {
            const frame = state.section === 'main' ? await provider.getFrame(state.sourceT) : null;
            if (active && current.current === t) paint(t, state, frame);
          } finally { busy = false; }
        }
      } catch (e) { fail(e); }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      active = false; cancelAnimationFrame(raf); media.pause(); provider.pause();
      media.removeEventListener('seeked', seeked);
      if (frameCallback !== undefined) media.cancelVideoFrameCallback(frameCallback);
    };
  }, [plan, provider, assets, playing, duration, rate, loop]);
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
  let crosshair = null;
  if (plan && focus) {
    const state = stateAt(plan,time), f = plan.layout.frame;
    const k = focus.keyframes.findLast(k => k.t <= state.sourceT) ?? focus.keyframes[0];
    if (k && state.section === 'main') {
      const x = f.x + (0.5 + (k.x-state.camera.cx)*state.camera.z*plan.scale/plan.sourceSize.width)*f.w;
      const y = f.y + (0.5 + (k.y-state.camera.cy)*state.camera.z*plan.scale/plan.sourceSize.height)*f.h;
      if (x >= f.x && x <= f.x+f.w && y >= f.y && y <= f.y+f.h) crosshair = {left:`${x/plan.output.width*100}%`,top:`${y/plan.output.height*100}%`};
    }
  }
  const step = direction => { setPlaying(false); setTime(Math.max(0, Math.min(duration, time + direction / fps))); };
  return <section class="preview" aria-label="Video preview">
    <video ref={video} src="/media/raw.mp4" muted playsInline preload="auto" hidden />
    <div class="preview-stage"><div class="preview-canvas-wrap" style={{'--preview-aspect':plan ? plan.output.width/plan.output.height : 16/9}}><canvas ref={canvas} onClick={pick} aria-label="Composition preview; click to pick zoom focus" style={{ aspectRatio: plan ? `${plan.output.width}/${plan.output.height}` : '16/9' }} />{crosshair && <span class="focus-crosshair" style={crosshair} aria-label="Selected zoom focus">+</span>}</div></div>
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
