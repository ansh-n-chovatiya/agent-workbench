import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawFrame, loadFonts, loadAssets } from '../scripts/lib/compose/draw.js';
import { stateAt } from '../scripts/lib/compose/plan.mjs';
import { timecode } from './helpers.mjs';
import { Button } from './ui/button.jsx';
import { Checkbox } from './ui/checkbox.jsx';
import { Slider } from './ui/slider.jsx';
import { Select } from './ui/select.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { Label } from './ui/label.jsx';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-preact';
import { fitPreview } from './layout.mjs';
import { playbackSync, previewBelowRate } from './playback.mjs';

export function Preview({ plan, provider, time, setTime, playing, setPlaying, onPick, focus }) {
  const stage = useRef(), [size, setSize] = useState({width:0,height:0});
  const aspect = plan ? plan.output.width / plan.output.height : 16/9;
  useEffect(() => {
    const node = stage.current;
    const resize = () => setSize(fitPreview(node.clientWidth, node.clientHeight, aspect));
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    return () => observer.disconnect();
  }, [aspect]);
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
    // Some browsers (Chromium builds, Firefox on Linux) cannot play H.264 in <video>; WebCodecs may still decode it.
    // Then playback falls back to the exact frame decoder, which is slower on large sources but always correct.
    let native = media.canPlayType('video/mp4; codecs="avc1.640033"') !== '' && !media.error;
    let nativeStart = 0;
    const unsupported = () => { native = false; };
    media.addEventListener('error', unsupported);
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
    if (playing && native && media.requestVideoFrameCallback) frameCallback = media.requestVideoFrameCallback(presented);
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
        if (playing && native) {
          const inMain = state.section === 'main';
          if (inMain !== main) { main = inMain; resetFrames(); }
          if (!main) {
            media.pause();
            paint(t, state, null);
            return;
          }
          // A browser can claim H.264 support and still fail to decode: if no frame arrives, use the exact decoder.
          if (!nativeStart) nativeStart = now;
          if (media.readyState < 2 && !seeking && !media.seeking && now - nativeStart > 1500) { native = false; media.pause(); return; }
          if (media.readyState >= 2) nativeStart = 0;
          const sync = playbackSync(state.sourceT, media.currentTime, state.rate, rate);
          if (media.playbackRate !== sync.playbackRate) media.playbackRate = sync.playbackRate;
          if (!seeking && !media.seeking && media.readyState >= 1 && sync.action === 'seek') {
            seeking = true; resetFrames(); media.currentTime = state.sourceT;
          }
          if (media.paused && !starting) {
            starting = true;
            media.play().catch(e => { if (e.name === 'NotSupportedError') native = false; else if (e.name !== 'AbortError') fail(e); }).finally(() => {
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
          if (playing && state.section === 'main') provider.prefetch(state.sourceT, 0.75 * Math.max(1, rate));
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
      media.removeEventListener('seeked', seeked); media.removeEventListener('error', unsupported);
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
  // Like any player: pressing Play at the very end starts again from the beginning.
  const togglePlay = () => { if (!playing && duration > 0 && current.current >= duration - 0.05) { current.current = 0; setTime(0); } setPlaying(!playing); };
  const step = direction => { setPlaying(false); setTime(Math.max(0, Math.min(duration, time + direction / fps))); };
  return <section class="preview" aria-label="Video preview">
    <video ref={video} src="/media/raw.mp4" muted playsInline preload="auto" hidden />
    <div class="preview-stage" ref={stage}><div class="preview-canvas-wrap" style={{width:size.width,height:size.height}}><canvas ref={canvas} onClick={pick} aria-label="Composition preview; click to pick zoom focus" style={{ aspectRatio: plan ? `${plan.output.width}/${plan.output.height}` : '16/9' }} />{crosshair && <span class="focus-crosshair" style={crosshair} aria-label="Selected zoom focus">+</span>}</div></div>
    {error && <p class="error" role="alert">{error}</p>}
    {dropped && <p class="warning" role="status">Preview below 24 fps — frames are being dropped.</p>}
    <div class="transport" role="toolbar" aria-label="Preview transport">
      <Tooltip text={plan ? 'Previous frame (,)' : 'Load a recording to step frames'}><Button size="icon" onClick={() => step(-1)} aria-label="Previous frame" disabled={!plan}><SkipBack size={16} aria-hidden="true" /></Button></Tooltip>
      <Tooltip text={plan && assets ? `${playing ? 'Pause' : 'Play'} (Space)` : 'Waiting for the preview to load'}><Button size="icon" onClick={togglePlay} disabled={!plan || !assets} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</Button></Tooltip>
      <Tooltip text={plan ? 'Next frame (.)' : 'Load a recording to step frames'}><Button size="icon" onClick={() => step(1)} aria-label="Next frame" disabled={!plan}><SkipForward size={16} aria-hidden="true" /></Button></Tooltip>
      <output class="timecode">{timecode(time, fps)} / {timecode(duration, fps)}</output>
      <div class="seek"><Slider aria-label="Seek output time" min={0} max={duration || 1} step={1 / fps} value={[time]} disabled={!plan} onValueChange={([next]) => {setPlaying(false);setTime(next);}} /></div>
      <Label className="loop-control"><Checkbox aria-label="Loop" checked={loop} onCheckedChange={setLoop} />Loop</Label>
      <Tooltip text="Preview playback speed"><span><Select aria-label="Playback rate" value={rate} onValueChange={next => setRate(+next)} options={[0.5,1,2].map(n => ({value:n,label:`${n}×`}))} /></span></Tooltip>
    </div>
  </section>;
}
