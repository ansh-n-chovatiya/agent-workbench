export function layoutFor({ output, source, composition }) {
  const { width, height } = output;
  if (![width, height, source.width, source.height].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Layout dimensions must be finite and positive');
  const padding = composition.frame?.paddingPct ?? 5;
  const captions = composition.captions;
  const band = captions?.enabled && captions.mode === 'band' ? Math.round(height * 0.13) : 0;
  const availableH = height - band;
  const scale = Math.min(width * (1 - 2 * padding / 100) / source.width, availableH / source.height);
  const w = Math.round(source.width * scale), h = Math.round(source.height * scale);
  const frame = { x: Math.round((width - w) / 2), y: Math.round((availableH - h) / 2), w, h };
  let caption = null;
  if (captions?.enabled) {
    if (band) caption = { x: 0, y: height - band, w: width, h: band };
    else {
      const w = Math.round(frame.w * 0.8), h = Math.round(height * 0.075);
      caption = { x: Math.round(frame.x + (frame.w - w) / 2), y: Math.round(frame.y + frame.h - height * 0.04 - h), w, h };
    }
  }
  return { canvas: { width, height }, frame, caption, scaleFramePx: w / source.width };
}
