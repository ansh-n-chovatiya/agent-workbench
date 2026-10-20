import { EASING } from './easing.mjs';
import { isVertical, layoutFor, verticalCaptionMetrics } from './layout.mjs';
import { stateAt } from './plan.mjs';
import { wrapLines } from './captions.mjs';
import { customCursorSpec, loadCustomCursorImages } from './custom-cursor.mjs';

const fontLoads = new Map();
export async function loadFonts(fonts) {
  const key = JSON.stringify(fonts);
  if (!fontLoads.has(key)) fontLoads.set(key, Promise.all([
    ['regular', '400', 'Inter'], ['semibold', '600', 'Inter'],
    ['displaySemibold', '600', 'Space Grotesk'], ['displayBold', '700', 'Space Grotesk'],
  ].map(async ([name, weight, family]) => {
    const url = fonts[name] ?? new URL(name === 'displayBold' ? 'SpaceGrotesk-Bold.woff2' : 'SpaceGrotesk-SemiBold.woff2', new URL(fonts.semibold, location.href)).href;
    const face = new FontFace(family, `url(${JSON.stringify(url)})`, { weight });
    document.fonts.add(await face.load());
  })));
  await fontLoads.get(key);
}
let images = new Map();
const imageLoads = new Map();
let cursorImages = new Map();
const brandFontLoads = new Map();
export async function loadBrandFonts(plan) {
  await Promise.all((plan.brand?.fonts ?? []).map(async font => {
    const key = JSON.stringify(font);
    if (!brandFontLoads.has(key)) brandFontLoads.set(key, (async () => {
      const face = new FontFace(font.family, `url(${JSON.stringify(font.url)})`, {weight: String(font.weight)});
      document.fonts.add(await face.load());
    })());
    await brandFontLoads.get(key);
  }));
}
const loadCursorImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => img.naturalWidth && img.naturalHeight ? resolve(img) : reject(new Error('Empty cursor image'));
  img.onerror = reject; img.src = new URL(url, location.href).href;
});
export async function loadImages(plan, { assetBase = 'assets/' } = {}) {
  const specs = [plan.watermark, plan.frame.background, plan.cards.title.background, plan.cards.outro.background,
    plan.cards.title.logo, plan.cards.outro.logo];
  const loadedImages = new Map();
  await Promise.all(specs.filter((s) => s?.image).map(async ({ image }) => {
    const brandUrl = plan.brand?.assetUrls?.[image];
    const url = new URL(brandUrl ?? `${assetBase}${image.split('/').map(encodeURIComponent).join('/')}`, location.href).href;
    if (!imageLoads.has(url)) imageLoads.set(url, new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Cannot load image: ${image}`)); img.src = url;
    }));
    const loaded = await imageLoads.get(url); loadedImages.set(image, loaded);
  }));
  return loadedImages;
}
export async function loadAssets(plan, options = {}) {
  if (plan.scenes) {
    const all = {images:new Map(),cursorImages:new Map()};
    for (const child of [ {...plan,scenes:undefined}, ...plan.scenes.map(s => s.plan)]) {
      const loaded = await loadAssets(child,options);
      for (const [k,v] of loaded.images) all.images.set(k,v);
      for (const [k,v] of loaded.cursorImages) all.cursorImages.set(k,v);
    }
    images = all.images; cursorImages = all.cursorImages; return all;
  }
  await loadBrandFonts(plan);
  const loadedImages = await loadImages(plan, options);
  const urls = options.cursorImages ?? (options.assetBase ? Object.fromEntries(
    Object.values(plan.cursor.custom ?? {}).filter(s => s?.image).map(s => [s.image,
      `${options.assetBase}${s.image.split('/').map(encodeURIComponent).join('/')}`])) : undefined);
  cursorImages = await loadCustomCursorImages(plan, urls, loadCursorImage);
  images = loadedImages;
  return { images: loadedImages, cursorImages };
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
  ctx.font = `${spec.fontWeight} ${size}px "${plan.brand?.body?.family ?? plan.theme.typography.bodyFamily ?? plan.theme.typography.family}"`;
  const wrapped = wrapLines(caption.text, r.w - padding * 2, (text) => ctx.measureText(text).width, { maxLines: isVertical(plan.output) ? Math.min(2, spec.maxLines) : spec.maxLines });
  const scale = Math.min(wrapped.scale, (r.h - padding) / (size * 1.25 * wrapped.lines.length));
  ctx.font = `${spec.fontWeight} ${size * scale}px "${plan.brand?.body?.family ?? plan.theme.typography.bodyFamily ?? plan.theme.typography.family}"`;
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
    [title, spec.titleSizePct / 100, plan.theme.typography.weights.display, spec.titleColor, 0.48], [spec.subtitle, spec.subtitleSizePct / 100, 400, spec.subtitleColor, 0.64],
  ]) {
    if (!text) continue;
    const size = (isVertical(plan.output) ? width * 1.25 : height) * fraction;
    ctx.font = `${weight} ${size}px "${plan.theme.typography.family}"`;
    const wrapped = wrapLines(text, width * 0.84, (s) => ctx.measureText(s).width);
    ctx.font = `${weight} ${size * wrapped.scale}px "${plan.theme.typography.family}"`; ctx.fillStyle = color;
    wrapped.lines.forEach((line, i) => ctx.fillText(line, x,
      (isVertical(plan.output) ? (plan.layout.safe.y + plan.layout.safe.h * y) : height * y) + (i - (wrapped.lines.length - 1) / 2) * size * wrapped.scale * 1.2));
  }
  ctx.restore();
}
// Watermark uses the video frame bounds, excluding any caption band, and never covers the cursor.
export function watermarkRect(plan, image) {
  const w = plan.watermark;
  if (!w?.enabled || !image) return null;
  const f = { ...plan.layout.frame }, band = plan.captions.enabled && plan.captions.mode === 'band' ? plan.layout.caption : null;
  if (band && band.y < f.y + f.h && band.y + band.h > f.y) {
    if (band.y <= f.y) { const bottom=f.y+f.h; f.y=band.y+band.h; f.h=bottom-f.y; }
    else f.h=band.y-f.y;
  }
  const margin=Math.min(f.w,f.h)*w.marginPct/100;
  const width=Math.min(f.w*w.sizePct/100,Math.max(0,f.w-2*margin));
  const height=width*image.height/image.width, scale=Math.min(1,Math.max(0,f.h-2*margin)/height);
  const rw=width*scale,rh=height*scale;
  return {x:w.position.endsWith('right')?f.x+f.w-margin-rw:f.x+margin,
    y:w.position.startsWith('bottom')?f.y+f.h-margin-rh:f.y+margin,w:rw,h:rh};
}
function drawWatermark(ctx,plan) {
  const image=images.get(plan.watermark?.image), r=watermarkRect(plan,image);
  if (!r || !r.w || !r.h) return;
  ctx.save();ctx.globalAlpha=plan.watermark.opacity;ctx.drawImage(image,r.x,r.y,r.w,r.h);ctx.restore();
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
// Intrinsic media dimensions; video.width/height are layout attributes, not pixels.
export function sourceSize(source) {
  return { width: source.videoWidth ?? source.naturalWidth ?? source.displayWidth ?? source.width,
    height: source.videoHeight ?? source.naturalHeight ?? source.displayHeight ?? source.height };
}

export function sourceCrop(plan, camera, decoded) {
  const size = sourceSize(decoded);
  // Camera coordinates stay in real capture coordinates even for reduced preview canvases.
  const sx = size.width / plan.sourceSize.width, sy = size.height / plan.sourceSize.height;
  const w = plan.sourceSize.width / camera.z, h = plan.sourceSize.height / camera.z;
  return { x: (camera.cx * plan.scale - w / 2) * sx,
    y: (camera.cy * plan.scale - h / 2) * sy, width: w * sx, height: h * sy };
}

export function mapSourcePoint(plan, cam, point) {
  const f = plan.layout.content ?? plan.layout.frame, w = plan.sourceSize.width / cam.z, h = plan.sourceSize.height / cam.z;
  return { x:f.x+(point.x*plan.scale-(cam.cx*plan.scale-w/2))*f.w/w,
    y:f.y+(point.y*plan.scale-(cam.cy*plan.scale-h/2))*f.h/h };
}
const sceneBuffers = new WeakMap();
function drawSequence(canvas,plan,tOut,decoded) {
  const state = stateAt(plan,tOut), ctx = canvas.getContext('2d'), {width,height} = plan.output;
  let buffers = sceneBuffers.get(canvas);
  if (!buffers) { buffers=[canvasFor(plan),canvasFor(plan)]; sceneBuffers.set(canvas,buffers); }
  const render = (s,buffer) => {
    const child = plan.scenes.find(x => x.id === s.sceneId);
    drawFrame(buffer,child.plan,s.localOutputT,decoded?.[s.sceneId]); return buffer;
  };
  ctx.save(); ctx.clearRect(0,0,width,height);
  if (!state.transition) ctx.drawImage(render(state,buffers[0]),0,0);
  else {
    const tr=state.transition, p=EASING.moveInOut(tr.progress);
    const from=render(tr.from,buffers[0]), to=render(tr.to,buffers[1]);
    if (tr.type === 'slide') {
      background(ctx,plan.frame.background,width,height,plan.theme.background);
      ctx.drawImage(from,-width*0.3*p,0); ctx.drawImage(to,width*(1-p),0);
    } else if (tr.type === 'zoom-through') {
      ctx.fillStyle='#000'; ctx.fillRect(0,0,width,height);
      const layer=(image,scale,alpha) => {
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=alpha;
        ctx.translate(width/2,height/2); ctx.scale(scale,scale); ctx.drawImage(image,-width/2,-height/2); ctx.restore();
      };
      layer(from,1+0.15*p,1-p); layer(to,0.92+0.08*p,p);
    } else {
      ctx.drawImage(from,0,0); ctx.globalAlpha=p; ctx.drawImage(to,0,0); ctx.globalAlpha=1;
    }
  }
  card(ctx,plan,state.alphaTitle,plan.cards.title,plan.cards.title.title);
  card(ctx,plan,state.alphaOutro,plan.cards.outro,plan.cards.outro.text);
  if (state.section !== 'main') drawWatermark(ctx,plan);
  ctx.restore(); return canvas;
}
export function drawFrame(canvas, plan, tOut, decoded, assets) {
  if (assets) { images = assets.images; cursorImages = assets.cursorImages; }
  if (plan.scenes) return drawSequence(canvas,plan,tOut,decoded);
  const ctx = canvas.getContext('2d'), { width, height } = plan.output;
  if (isVertical(plan.output)) {
    ctx.font=`${plan.captions.fontWeight} ${height*plan.captions.fontSizePct/100}px "${plan.brand?.body?.family ?? plan.theme.typography.bodyFamily ?? plan.theme.typography.family}"`;
    plan={...plan,layout:layoutFor({output:plan.output,source:plan.sourceSize,composition:{...plan,layout:{safeZones:plan.layout.safe.y>0}},
      captionTexts:plan.cues.map(c=>c.text),measureCaption:text=>ctx.measureText(text).width})};
  }
  const state = stateAt(plan, tOut), f = plan.layout.frame, cam = state.camera;
  // Reserve room for the longest cue, but fit the visible band to this cue's lines.
  if (isVertical(plan.output) && plan.layout.caption) {
    const h=state.caption ? verticalCaptionMetrics(plan.output,plan.captions,[state.caption.text],text=>ctx.measureText(text).width).h : 0;
    plan={...plan,layout:{...plan.layout,caption:{...plan.layout.caption,h}}};
  }
  background(ctx, plan.frame.background, width, height, plan.theme.background);
  if (plan.captions.enabled && plan.captions.mode === 'band') {
    const r = plan.layout.caption;
    ctx.fillStyle = plan.captions.background; ctx.fillRect(isVertical(plan.output)?0:r.x, r.y, isVertical(plan.output)?width:r.w, r.h);
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
    const crop = sourceCrop(plan, cam, decoded);
    const content = plan.layout.content ?? f;
    ctx.fillStyle = '#111827'; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.drawImage(decoded, crop.x, crop.y, crop.width, crop.height, content.x, content.y, content.w, content.h);
    drawWatermark(ctx,plan);
    const mapped = point => mapSourcePoint(plan,cam,point);
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
      let style = state.cursor.shape === 'arrow' ? plan.cursor.style : state.cursor.shape;
      ctx.globalAlpha = state.cursor.alpha;
      if (plan.cursor.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; }
      const spec = plan.cursor.style === 'custom' ? customCursorSpec(plan.cursor, state.cursor.shape) : null;
      const img = spec && cursorImages.get(spec.image);
      if (img) {
        const h = 24, w = h * img.naturalWidth / img.naturalHeight;
        ctx.drawImage(img, -(spec.hotspot?.x ?? 0) * w, -(spec.hotspot?.y ?? 0) * h, w, h);
      } else {
        if (plan.cursor.style === 'custom') style = 'arrow';
        cursorShape(ctx, style);
        ctx.fillStyle = plan.cursor.fill; ctx.strokeStyle = plan.cursor.stroke;
        ctx.lineWidth = 1.5 * unit / cursorScale; ctx.lineJoin = 'round';
        if (!['ring', 'crosshair', 'text'].includes(style)) ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    if (plan.frame.border.enabled) {
      ctx.save(); rounded(ctx, f, radius); ctx.strokeStyle = plan.frame.border.color;
      ctx.lineWidth = plan.frame.border.widthPx * unit; ctx.stroke(); ctx.restore();
    }
    drawCaption(ctx, plan, state.caption);
  }
  if (isVertical(plan.output) && plan.layout.caption) {
    const bottom = plan.layout.caption.y + plan.layout.caption.h;
    ctx.save(); ctx.beginPath(); ctx.rect(0, bottom, width, height - bottom); ctx.clip();
    background(ctx, plan.theme.background, width, height, plan.theme.background);
    ctx.restore();
  }
  card(ctx, plan, state.alphaTitle, plan.cards.title, plan.cards.title.title);
  card(ctx, plan, state.alphaOutro, plan.cards.outro, plan.cards.outro.text);
  if (state.section !== 'main') drawWatermark(ctx,plan);
  return canvas;
}
export function canvasFor(plan) {
  const canvas = document.createElement('canvas');
  canvas.width = plan.output.width; canvas.height = plan.output.height;
  return canvas;
}
