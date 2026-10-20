import { wrapLines } from './captions.mjs';
export const OUTPUT_PRESETS = Object.freeze({ landscape: [1920, 1080], vertical: [1080, 1920], square: [1080, 1080] });
// Output sizes are named by their short side; each scales the 1080 base of a format.
export const OUTPUT_SIZES = Object.freeze({ '720': 2 / 3, '1080': 1, '1440': 4 / 3, '4k': 2 });
export function presetOutput(preset = 'landscape', size = '1080') {
  if (!Object.hasOwn(OUTPUT_PRESETS, preset)) throw new Error('format must be landscape, vertical or square');
  if (!Object.hasOwn(OUTPUT_SIZES, String(size))) throw new Error('size must be 720, 1080, 1440 or 4k');
  const [width, height] = OUTPUT_PRESETS[preset], scale = OUTPUT_SIZES[String(size)];
  return { preset, width: Math.round(width * scale), height: Math.round(height * scale) };
}
// The size key a width and height belong to (by their short side); missing sizes mean the 1080 default.
export function sizeKeyFor(width, height) {
  const short = Math.min(Number(width) || 0, Number(height) || 0);
  if (!short) return '1080';
  return short >= 2160 ? '4k' : short >= 1440 ? '1440' : short >= 1080 ? '1080' : '720';
}
export const isVertical = (output) => output.preset === 'vertical' || output.height > output.width;
export function safeArea(output, enabled = isVertical(output)) {
  const top = enabled ? Math.ceil(output.height * 0.07) : 0;
  const bottom = enabled ? Math.ceil(output.height * 0.14) : 0;
  return { x: 0, y: top, w: output.width, h: output.height - top - bottom };
}
export function containRect(source, bounds) {
  const scale = Math.min(bounds.w / source.width, bounds.h / source.height);
  const w = Math.min(bounds.w, Math.round(source.width * scale));
  const h = Math.min(bounds.h, Math.round(source.height * scale));
  return { x: bounds.x + Math.round((bounds.w - w) / 2), y: bounds.y + Math.round((bounds.h - h) / 2), w, h };
}
export function verticalCaptionMetrics(output, captions, texts = [], measureText) {
  const size=output.height*(captions?.fontSizePct??3.9)/100, padding=size*.6;
  const w=Math.round(output.width*.88), maxLines=Math.min(3,captions?.maxLines??3);
  const measure=measureText??(text=>Array.from(text).length*size*.55);
  const lines=Math.max(1,...texts.map(text=>wrapLines(text,w-padding*2,measure,{maxLines}).lines.length));
  return {size,w,lines,h:Math.ceil(lines*size*1.25+padding)};
}
export function verticalLayout({ output, source, composition, captionTexts = [], measureCaption }) {
  const { width, height } = output, captions = composition.captions;
  const safe = safeArea(output, composition.layout?.safeZones ?? true);
  const px = composition.frame?.paddingXPct ?? composition.frame?.paddingPct ?? 4;
  const pad = Math.round(width * px / 100), gap = captions?.enabled && captions.mode !== 'band' ? Math.round(height * .012) : 0;
  const py = Math.round(height * (composition.frame?.paddingYPct ?? 0) / 100);
  const metrics=verticalCaptionMetrics(output,captions,captionTexts,measureCaption);
  const captionH=captions?.enabled?metrics.h:0;
  const available={x:pad,y:safe.y+py,w:width-2*pad,h:Math.max(1,safe.h-2*py-captionH-gap)};
  // Off-profile landscape recordings retain a letterboxed frame.
  const frame=source.width>source.height?available:containRect(source,available);
  frame.y=available.y;
  const content=source.width>source.height?containRect(source,frame):{...frame};
  const caption=!captions?.enabled?null:{x:Math.round((width-metrics.w)/2),y:frame.y+frame.h+gap,w:metrics.w,h:captionH};
  return {canvas:{width,height},safe,frame,content,caption,scaleFramePx:content.w/source.width};
}
export function layoutFor({ output, source, composition, captionTexts, measureCaption }) {
  const { width, height } = output;
  if (![width, height, source.width, source.height].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Layout dimensions must be finite and positive');
  if (isVertical(output)) return verticalLayout({ output, source, composition, captionTexts, measureCaption });
  const px = composition.frame?.paddingXPct ?? composition.frame?.paddingPct ?? 8;
  const py = composition.frame?.paddingYPct ?? composition.frame?.paddingPct ?? 5;
  const captions = composition.captions;
  const band = captions?.enabled && captions.mode === 'band' ? Math.round(height * (captions.bandHeightPct ?? 13) / 100) : 0;
  const safe = safeArea(output, composition.layout?.safeZones === true);
  const availableH = safe.h - band;
  const scale = Math.min(width * (1 - 2 * px / 100) / source.width, (availableH - 2 * height * py / 100) / source.height);
  const w = Math.round(source.width * scale), h = Math.round(source.height * scale);
  const frame = { x: Math.round((width - w) / 2), y: safe.y + Math.round((availableH - h) / 2) + (band && captions.position === 'top' ? band : 0), w, h };
  let caption = null;
  if (captions?.enabled) {
    if (band) caption = { x: 0, y: captions.position === 'top' ? safe.y : safe.y + safe.h - band, w: width, h: band };
    else {
      const w = Math.round(frame.w * 0.8), h = Math.round(height * 0.075);
      caption = { x: Math.round(frame.x + (frame.w - w) / 2), y: Math.round(captions.position === 'top' ? frame.y + height * 0.04 : frame.y + frame.h - height * 0.04 - h), w, h };
    }
  }
  return { canvas: { width, height }, frame, caption, scaleFramePx: w / source.width };
}
