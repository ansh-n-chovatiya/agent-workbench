import { Input, UrlSource, ALL_FORMATS, CanvasSink, Output, Mp4OutputFormat,
  StreamTarget, CanvasSource, canEncodeVideo } from 'mediabunny';
import { stateAt } from './plan.mjs';
import { wrapLines } from './captions.mjs';
import { outputBitrate } from './composition.mjs';

const defaults = () => ({ source: new URL('raw.mp4', location.href).href,
  fonts: { regular: new URL('fonts/Inter-Regular.woff2', location.href).href,
    semibold: new URL('fonts/Inter-SemiBold.woff2', location.href).href }, audio: null });
let stillOptions;
const fontLoads = new Map();
async function loadFonts(fonts) {
  const key = JSON.stringify(fonts);
  if (!fontLoads.has(key)) fontLoads.set(key, Promise.all([
    ['regular', '400'], ['semibold', '600'],
  ].map(async ([name, weight]) => {
    const face = new FontFace('Inter', `url(${JSON.stringify(fonts[name])})`, { weight });
    document.fonts.add(await face.load());
  })));
  await fontLoads.get(key);
}
async function openVideo(url) {
  const input = new Input({ source: new UrlSource(url, { getRetryDelay: () => null }), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) throw new Error('Source has no decodable video track');
    return { input, track, sink: new CanvasSink(track, { poolSize: 2 }) };
  } catch (error) { input.dispose(); throw error; }
}
window.probeRenderSource = async (url = defaults().source) => {
  const { input, track } = await openVideo(url);
  try { return { width: await track.getDisplayWidth(), height: await track.getDisplayHeight(), duration: await track.computeDuration() }; }
  finally { input.dispose(); }
};
const images = new Map();
async function loadImages(plan) {
  const specs = [plan.frame.background, plan.cards.title.background, plan.cards.outro.background,
    plan.cards.title.logo, plan.cards.outro.logo];
  await Promise.all(specs.filter((s) => s?.image).map(async ({ image }) => {
    const url = new URL(`assets/${image.split('/').map(encodeURIComponent).join('/')}`, location.href).href;
    if (!images.has(image)) images.set(image, new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Cannot load image: ${image}`)); img.src = url;
    }));
    const loaded = await images.get(image); images.set(image, loaded);
  }));
}
function background(ctx, spec, width, height, fallback) {
  if (spec.type === 'theme') spec = fallback;
  if (spec.type === 'image') {
    const img = images.get(spec.image), scale = Math.max(width / img.width, height / img.height);
    ctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale); return;
  }
  if (spec.type === 'solid') { ctx.fillStyle = spec.colors[0]; ctx.fillRect(0, 0, width, height); return; }
  const angle = (spec.angle ?? 135) * Math.PI / 180;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  const gradient = ctx.createLinearGradient(width / 2 - dx * length / 2, height / 2 - dy * length / 2,
    width / 2 + dx * length / 2, height / 2 + dy * length / 2);
  spec.colors.forEach((color, i) => gradient.addColorStop(i / Math.max(1, spec.colors.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
function rounded(ctx, rect, radius) {
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
}
function drawCaption(ctx, plan, caption) {
  const r = plan.layout.caption, spec = plan.captions;
  if (!r || !caption || caption.alpha <= 0) return;
  const size = plan.output.height * spec.fontSizePct / 100, padding = size * 0.6;
  ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.globalAlpha = caption.alpha;
  ctx.font = `${spec.fontWeight} ${size}px Inter`;
  const wrapped = wrapLines(caption.text, r.w - padding * 2, (text) => ctx.measureText(text).width, { maxLines: spec.maxLines });
  const scale = Math.min(wrapped.scale, (r.h - padding) / (size * 1.25 * wrapped.lines.length));
  ctx.font = `${spec.fontWeight} ${size * scale}px Inter`;
  const lineH = size * scale * 1.25;
  if (spec.mode === 'overlay') {
    const w = Math.min(r.w, Math.max(...wrapped.lines.map((s) => ctx.measureText(s).width)) + padding * 2);
    rounded(ctx, { x: spec.align === 'left' ? r.x : r.x + (r.w - w) / 2,
      y: r.y + (r.h - lineH * wrapped.lines.length) / 2 - padding / 2, w, h: lineH * wrapped.lines.length + padding }, padding);
    ctx.fillStyle = spec.background; ctx.fill();
  }
  ctx.fillStyle = spec.color; ctx.textAlign = spec.align; ctx.textBaseline = 'middle';
  wrapped.lines.forEach((line, i) => ctx.fillText(line, spec.align === 'left' ? r.x + padding : r.x + r.w / 2,
    r.y + r.h / 2 + (i - (wrapped.lines.length - 1) / 2) * lineH));
  ctx.restore();
}
function card(ctx, plan, alpha, spec, title) {
  if (alpha <= 0) return;
  const { width, height } = plan.output;
  const x = width * (spec.align === 'left' ? 0.08 : 0.5);
  ctx.save(); ctx.globalAlpha = alpha;
  background(ctx, spec.background, width, height, plan.theme.card.background);
  if (spec.logo) {
    const img = images.get(spec.logo.image), h = height * spec.logo.heightPct / 100, w = h * img.width / img.height;
    ctx.drawImage(img, spec.align === 'left' ? x : x - w / 2, height * 0.12, w, h);
  }
  if (spec.accent.enabled && spec.accent.shape !== 'none') {
    const w = width * spec.accent.widthPct / 100;
    ctx.fillStyle = spec.accent.color;
    ctx.fillRect(spec.align === 'left' ? x : x - w / 2, height * (spec.accent.shape === 'underline' ? 0.56 : 0.34), w, height * 0.008);
  }
  ctx.textAlign = spec.align; ctx.textBaseline = 'middle';
  for (const [text, fraction, weight, color, y] of [
    [title, spec.titleSizePct / 100, 600, spec.titleColor, 0.48], [spec.subtitle, spec.subtitleSizePct / 100, 400, spec.subtitleColor, 0.64],
  ]) {
    if (!text) continue;
    const size = height * fraction;
    ctx.font = `${weight} ${size}px Inter`;
    const wrapped = wrapLines(text, width * 0.84, (s) => ctx.measureText(s).width);
    ctx.font = `${weight} ${size * wrapped.scale}px Inter`; ctx.fillStyle = color;
    wrapped.lines.forEach((line, i) => ctx.fillText(line, x,
      height * y + (i - (wrapped.lines.length - 1) / 2) * size * wrapped.scale * 1.2));
  }
  ctx.restore();
}
function cursorShape(ctx, style) {
  ctx.beginPath();
  if (style === 'dot' || style === 'ring') ctx.arc(0, 0, 12, 0, Math.PI * 2);
  else if (style === 'crosshair') { ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); }
  else if (style === 'text') {
    ctx.moveTo(0, -12); ctx.lineTo(0, 12);
    ctx.moveTo(-4, -12); ctx.lineTo(4, -12); ctx.moveTo(-4, 12); ctx.lineTo(4, 12);
  } else if (style === 'hand') {
    ctx.moveTo(0, 0); ctx.bezierCurveTo(-2, 0, -2, 2, -2, 4); ctx.lineTo(-2, 13);
    ctx.lineTo(-5, 10); ctx.quadraticCurveTo(-8, 9, -7, 13); ctx.lineTo(-2, 21);
    ctx.quadraticCurveTo(0, 24, 3, 24); ctx.lineTo(9, 24); ctx.lineTo(12, 14);
    ctx.quadraticCurveTo(13, 10, 9, 10); ctx.lineTo(2, 9); ctx.lineTo(2, 3);
    ctx.quadraticCurveTo(2, 0, 0, 0); ctx.closePath();
  } else if (style === 'pointer') {
    ctx.moveTo(0, 14); ctx.lineTo(0, 2); ctx.quadraticCurveTo(2, -2, 4, 2); ctx.lineTo(4, 9);
    ctx.lineTo(12, 10); ctx.quadraticCurveTo(16, 10, 15, 15); ctx.lineTo(13, 23); ctx.lineTo(5, 23); ctx.lineTo(-3, 15); ctx.closePath();
  } else {
    ctx.moveTo(0, 0); ctx.lineTo(0, 19); ctx.lineTo(5, 15); ctx.lineTo(9, 24);
    ctx.lineTo(13, 22); ctx.lineTo(9, 14); ctx.lineTo(16, 14); ctx.closePath();
  }
}
function draw(canvas, plan, tOut, decoded) {
  const ctx = canvas.getContext('2d'), { width, height } = plan.output;
  const state = stateAt(plan, tOut), f = plan.layout.frame, cam = state.camera;
  background(ctx, plan.frame.background, width, height, plan.theme.background);
  if (plan.captions.enabled && plan.captions.mode === 'band') {
    const r = plan.layout.caption;
    ctx.fillStyle = plan.captions.background; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  if (state.section === 'main' && decoded) {
    const unit = height / 1080, radius = plan.frame.radiusPx * unit;
    ctx.save();
    rounded(ctx, f, radius);
    ctx.shadowColor = `rgba(0,0,0,${plan.frame.shadow.enabled ? plan.frame.shadow.opacity : 0})`;
    ctx.shadowBlur = plan.frame.shadow.blurPx * unit;
    ctx.shadowOffsetY = plan.frame.shadow.offsetYPx * unit;
    ctx.fillStyle = '#808080'; ctx.fill(); ctx.restore();
    ctx.save(); rounded(ctx, f, radius); ctx.clip();
    const cropW = plan.sourceSize.width / cam.z, cropH = plan.sourceSize.height / cam.z;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded, cam.cx * plan.scale - cropW / 2, cam.cy * plan.scale - cropH / 2,
      cropW, cropH, f.x, f.y, f.w, f.h);
    const mapped = ({ x, y }) => ({ x: f.x + (x * plan.scale - (cam.cx * plan.scale - cropW / 2)) * f.w / cropW,
      y: f.y + (y * plan.scale - (cam.cy * plan.scale - cropH / 2)) * f.h / cropH });
    const cursorH = plan.cursor.sizePx * (plan.cursor.scaleWithZoom ? 1 + 0.35 * (cam.z - 1) : 1);
    if (state.ripple) {
      const p = mapped(state.ripple), progress = state.ripple.progress;
      ctx.save(); ctx.globalAlpha = 1 - progress; ctx.strokeStyle = plan.cursor.clickEffect.color ?? plan.theme.ripple.color;
      ctx.lineWidth = 3 * unit; ctx.beginPath();
      ctx.arc(p.x, p.y, cursorH * plan.cursor.clickEffect.sizeMult * (0.3 + 2.9 * progress), 0, Math.PI * 2);
      if (plan.cursor.clickEffect.style === 'pulse') {
        ctx.fillStyle = ctx.strokeStyle; ctx.globalAlpha *= 0.35; ctx.fill();
      } else ctx.stroke();
      ctx.restore();
    }
    if (plan.cursor.visible) {
      const p = mapped(state.cursor);
      const cursorScale = cursorH * state.cursor.press * state.cursor.pop / 24;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(cursorScale, cursorScale);
      const style = state.cursor.shape === 'arrow' ? plan.cursor.style : state.cursor.shape;
      cursorShape(ctx, style);
      ctx.globalAlpha = state.cursor.alpha;
      ctx.fillStyle = plan.cursor.fill; ctx.strokeStyle = plan.cursor.stroke;
      ctx.lineWidth = 1.5 * unit / cursorScale; ctx.lineJoin = 'round';
      if (plan.cursor.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; }
      if (!['ring', 'crosshair', 'text'].includes(style)) ctx.fill();
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    if (plan.frame.border.enabled) {
      ctx.save(); rounded(ctx, f, radius); ctx.strokeStyle = plan.frame.border.color;
      ctx.lineWidth = plan.frame.border.widthPx * unit; ctx.stroke(); ctx.restore();
    }
    drawCaption(ctx, plan, state.caption);
  }
  card(ctx, plan, state.alphaTitle, plan.cards.title, plan.cards.title.title);
  card(ctx, plan, state.alphaOutro, plan.cards.outro, plan.cards.outro.text);
  return canvas;
}
function canvasFor(plan) {
  const canvas = document.createElement('canvas');
  canvas.width = plan.output.width; canvas.height = plan.output.height;
  return canvas;
}
window.renderStill = async (plan, tOut) => {
  const options = stillOptions ?? defaults();
  await loadFonts(options.fonts);
  await loadImages(plan);
  const { input, sink } = await openVideo(options.source);
  try {
    const frame = await sink.getCanvas(stateAt(plan, tOut).sourceT);
    return draw(canvasFor(plan), plan, tOut, frame?.canvas).toDataURL('image/png');
  } finally { input.dispose(); }
};
window.renderComposition = async (plan, options = {}) => {
  options = { ...defaults(), ...options };
  if (options.audio !== null) throw new Error('Audio is not supported yet; pass audio: null');
  stillOptions = options;
  await loadFonts(options.fonts);
  await loadImages(plan);
  const { width, height, fps } = plan.output, canvas = canvasFor(plan);
  const bitrate = outputBitrate(plan.output);
  let codec;
  for (const candidate of ['avc', 'vp9']) {
    if (await canEncodeVideo(candidate, { width, height, bitrate, frameRate: fps })) { codec = candidate; break; }
  }
  if (!codec) throw new Error('Neither H.264 nor VP9 encoding is supported');
  let bytes = 0, finalized = false, source, output, video;
  const post = async (route, body, headers) => {
    const response = await fetch(new URL(route, location.href), { method: 'POST', body, headers });
    if (!response.ok) throw new Error(`Render transport failed: ${route} (${response.status})`);
  };
  try {
    video = await openVideo(options.source);
    const target = new StreamTarget(new WritableStream({ async write({ data, position }) {
      await post('chunk', data, { 'x-pos': String(position) }); bytes = Math.max(bytes, position + data.byteLength);
    } }), { chunked: true, chunkSize: 1024 * 1024 });
    output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
    source = new CanvasSource(canvas, { codec, bitrate, keyFrameInterval: 2 });
    output.addVideoTrack(source, { frameRate: fps }); await output.start();
    const total = Math.round(plan.timemap.outputDuration * fps);
    if (total < 1) throw new Error('Composition has no output frames');
    function* timestamps() { for (let k = 0; k < total; k++) yield stateAt(plan, k / fps).sourceT; }
    let frame = 0, lastProgress = -Infinity;
    for await (const decoded of video.sink.canvasesAtTimestamps(timestamps())) {
      if (window.__renderAbort || options.signal?.aborted) throw new Error('Render aborted');
      if (!decoded) throw new Error(`No source frame for output frame ${frame}`);
      draw(canvas, plan, frame / fps, decoded.canvas); await source.add(frame / fps, 1 / fps); frame++;
      if (performance.now() - lastProgress >= 250 || frame === total) {
        await post('progress', JSON.stringify({ frame, total }), { 'content-type': 'application/json' });
        lastProgress = performance.now();
      }
    }
    if (frame !== total) throw new Error('Decoder ended before the composition');
    source.close(); await output.finalize(); finalized = true;
    return { frames: frame, codec, bytes };
  } finally {
    try { if (output && !finalized) await output.cancel(); }
    finally { video?.input.dispose(); }
  }
};
