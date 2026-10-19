export const OUTPUT_PRESETS = Object.freeze({ landscape: [1920, 1080], vertical: [1080, 1920], square: [1080, 1080] });
export function presetOutput(preset = 'landscape', size = '1080') {
  if (!Object.hasOwn(OUTPUT_PRESETS, preset)) throw new Error('format must be landscape, vertical or square');
  if (!['1080', '4k'].includes(size)) throw new Error('size must be 1080 or 4k');
  const [width, height] = OUTPUT_PRESETS[preset], scale = size === '4k' ? 2 : 1;
  return { preset, width: width * scale, height: height * scale };
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
export function verticalLayout({ output, source, composition }) {
  const { width, height } = output, captions = composition.captions;
  const safe = safeArea(output, composition.layout?.safeZones ?? true);
  const px = composition.frame?.paddingXPct ?? composition.frame?.paddingPct ?? 4;
  const pad = Math.round(width * px / 100), gap = Math.round(height * 0.02);
  const py = Math.round(height * (composition.frame?.paddingYPct ?? 0) / 100);
  const band = captions?.enabled && captions.mode === 'band' ? Math.round(height * (captions.bandHeightPct ?? 16) / 100) : 0;
  const frame = { x: pad, y: safe.y + py, w: width - pad * 2, h: safe.h - band - gap - py * 2 };
  const content = containRect(source, frame);
  const caption = !captions?.enabled ? null : band
    ? { x: 0, y: safe.y + safe.h - band, w: width, h: band }
    : { x: pad, y: frame.y + frame.h - Math.round(height * 0.1), w: frame.w, h: Math.round(height * 0.1) };
  return { canvas: { width, height }, safe, frame, content, caption, scaleFramePx: content.w / source.width };
}
export function layoutFor({ output, source, composition }) {
  const { width, height } = output;
  if (![width, height, source.width, source.height].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Layout dimensions must be finite and positive');
  if (isVertical(output)) return verticalLayout({ output, source, composition });
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
